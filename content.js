// Content script for Filmstaden.se and Bio.se
// This script extracts movie titles and injects rating information

class CinemaRatingInjector {
  constructor() {
    this.API_KEY = 'YOUR_OMDB_API_KEY'; // Users need to set this
    this.redirectDestination = 'imdb'; // Default to IMDB
    this.processedMovies = new Set();
    this.cache = null; // Will be loaded from storage
    this.CACHE_EXPIRY_DAYS = 7; // Cache expires after 7 days
    this.init();
  }

  async init() {
    // Load API key, redirect destination, and cache from storage
    const result = await chrome.storage.sync.get(['omdbApiKey', 'redirectDestination']);
    const cacheResult = await chrome.storage.local.get(['movieCache']);

    if (result.omdbApiKey) {
      this.API_KEY = result.omdbApiKey;
      console.log('API key loaded successfully');

      // Load redirect destination preference
      if (result.redirectDestination) {
        this.redirectDestination = result.redirectDestination;
        console.log(`Redirect destination: ${this.redirectDestination}`);
      }

      // Load cache
      this.cache = cacheResult.movieCache || {};

      // Clean expired cache entries
      this.cleanExpiredCache();

      // Wait a bit for page to fully load
      setTimeout(() => {
        console.log('Starting movie detection...');
        this.findAndProcessMovies();
      }, 1000);

      this.observePageChanges();
    } else {
      console.warn('OMDB API key not set. Please configure it in the extension popup.');
    }
  }

  cleanExpiredCache() {
    const now = Date.now();
    let cacheModified = false;

    for (const [key, entry] of Object.entries(this.cache)) {
      if (now - entry.timestamp > this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
        delete this.cache[key];
        cacheModified = true;
      }
    }

    if (cacheModified) {
      this.saveCache();
    }
  }

  async saveCache() {
    try {
      await chrome.storage.local.set({ movieCache: this.cache });
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  getCacheKey(title) {
    // Clean the title for consistent cache keys
    return title.replace(/\s*\(\d{4}\)\s*/, '').trim().toLowerCase();
  }

  parseAwards(awardsText) {
    // Extract numbers from awards text
    // Examples: "Won 2 Oscars", "Nominated for 5 Oscars", "Won 1 Oscar. 15 wins & 20 nominations total"
    const winMatch = awardsText.match(/(\d+)\s+wins?/i);
    const nominationMatch = awardsText.match(/(\d+)\s+nominations?/i);

    const wins = winMatch ? parseInt(winMatch[1]) : 0;
    const nominations = nominationMatch ? parseInt(nominationMatch[1]) : 0;

    // Format: "wins/nominations"
    if (wins > 0 && nominations > 0) {
      return `🏆 ${wins}/${nominations}`;
    } else if (wins > 0) {
      return `🏆 ${wins}/0`;
    } else if (nominations > 0) {
      return `🏆 0/${nominations}`;
    }

    return null;
  }

  generateRottenTomatoesUrl(title) {
    // Rotten Tomatoes URL format: https://www.rottentomatoes.com/m/movie_title
    // Replace spaces with underscores, remove special characters, convert to lowercase
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_')     // Replace spaces with underscores
      .replace(/_+/g, '_')      // Replace multiple underscores with single
      .replace(/^_|_$/g, '');   // Remove leading/trailing underscores

    return `https://www.rottentomatoes.com/m/${cleanTitle}`;
  }

  observePageChanges() {
    // Watch for dynamic content changes (SPA navigation)
    const observer = new MutationObserver((mutations) => {
      this.findAndProcessMovies();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Handle back/forward navigation (bfcache restoration)
    window.addEventListener('pageshow', (event) => {
      // event.persisted is true when page is restored from bfcache
      if (event.persisted) {
        console.log('Page restored from cache, re-processing movies');
        // Clear processed attributes to allow re-injection
        this.clearProcessedAttributes();
        this.findAndProcessMovies();
      }
    });

    // Handle URL changes in SPAs (pushState/replaceState)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('URL changed, re-processing movies');
        // Clear processed attributes on navigation
        this.clearProcessedAttributes();
        // Use setTimeout to allow the page to render new content
        setTimeout(() => this.findAndProcessMovies(), 500);
      }
    }).observe(document, { subtree: true, childList: true });

    // Also listen for popstate (back/forward buttons)
    window.addEventListener('popstate', () => {
      console.log('Navigation detected (popstate), re-processing movies');
      this.clearProcessedAttributes();
      setTimeout(() => this.findAndProcessMovies(), 500);
    });
  }

  clearProcessedAttributes() {
    // Remove all processed markers to allow re-processing on navigation
    document.querySelectorAll('[data-omdb-processed]').forEach(el => {
      el.removeAttribute('data-omdb-processed');
    });
  }

  findAndProcessMovies() {
    console.log('=== Finding movie elements ===');

    // Find movie elements on the page with very broad selectors
    const movieSelectors = [
      // Class-based selectors (case variations)
      '[class*="movie"]:not([class*="movie"] [class*="movie"])',
      '[class*="film"]:not([class*="film"] [class*="film"])',
      '[class*="Movie"]:not([class*="Movie"] [class*="Movie"])',
      '[class*="Film"]:not([class*="Film"] [class*="Film"])',

      // Common layout elements
      'article:not(article article)',
      'li:not(li li)',
      'div[class*="item"]',
      'div[class*="Item"]',

      // Data attributes
      '[data-testid*="movie"]',
      '[data-testid*="film"]',

      // Card-based layouts
      'li[class*="card"]',
      'div[class*="card"]',
      'div[class*="Card"]',

      // Common cinema website patterns
      '[class*="show"]',
      '[class*="Show"]',
      '[class*="event"]',
      '[class*="Event"]',
    ];

    const processedElements = new Set();
    let totalFound = 0;

    movieSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`✓ Found ${elements.length} elements with selector: "${selector}"`);
        }
        elements.forEach(element => {
          // Skip if this element is already in our set
          if (processedElements.has(element)) {
            return;
          }
          processedElements.add(element);
          totalFound++;
          this.processMovieElement(element);
        });
      } catch (error) {
        console.warn(`✗ Error with selector ${selector}:`, error);
      }
    });

    console.log(`=== Total unique movie elements found: ${totalFound} ===`);

    if (totalFound === 0) {
      console.warn('No movie elements found! The page structure may have changed.');
      console.log('Sample classes on page:', this.getSampleClasses());
    }
  }

  getSampleClasses() {
    // Helper to debug - show sample class names on the page
    const allElements = document.querySelectorAll('div, li, article');
    const classNames = new Set();

    Array.from(allElements).slice(0, 50).forEach(el => {
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach(cls => {
          if (cls) classNames.add(cls);
        });
      }
    });

    return Array.from(classNames).slice(0, 20).join(', ');
  }

  extractMovieTitle(element) {
    // Try different methods to extract movie title
    const titleSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '[class*="title"]:not([class*="subtitle"])',
      '[class*="Title"]:not([class*="subtitle"])',
      '[class*="heading"]',
      '[class*="Heading"]',
      '[class*="name"]',
      '[class*="Name"]',
      'a[href*="/film/"]',
      'a[href*="/movie/"]',
      'strong',
      'b',
      'span[class*="title"]',
      'div[class*="title"]',
    ];

    for (const selector of titleSelectors) {
      const titleElement = element.querySelector(selector);
      if (titleElement) {
        let title = titleElement.textContent.trim();

        // Clean up the title - remove extra whitespace and newlines
        title = title.replace(/\s+/g, ' ').trim();

        // Filter out very short strings (likely not titles) and very long ones
        if (title && title.length >= 2 && title.length < 150) {
          // Filter out common noise words that aren't movie titles
          const noisePatterns = /^(visa|more|läs mer|read more|tickets|biljetter|köp|buy|se mer)$/i;
          if (!noisePatterns.test(title)) {
            console.log(`✓ Extracted title from ${selector}: "${title}"`);
            return title;
          }
        }
      }
    }

    // Try to get title from element's direct text content (not nested)
    const directText = Array.from(element.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim())
      .join(' ')
      .trim();

    if (directText && directText.length >= 2 && directText.length < 100) {
      console.log(`✓ Extracted title from direct text: "${directText}"`);
      return directText;
    }

    console.log('✗ No valid title found in element');
    return null;
  }

  async processMovieElement(element) {
    // Check if already processed using data attribute
    if (element.hasAttribute('data-omdb-processed')) {
      return;
    }

    const title = this.extractMovieTitle(element);
    if (!title) {
      console.log('No title found for element:', element);
      return;
    }

    // Mark as processed immediately to prevent duplicate processing
    element.setAttribute('data-omdb-processed', 'true');
    console.log(`Processing movie: "${title}"`);

    try {
      const movieData = await this.fetchMovieData(title);
      if (movieData && movieData.Response === 'True') {
        console.log(`Found data for "${title}":`, movieData.Title);
        this.injectRatingInfo(element, movieData);
      } 
    } catch (error) {
      console.error('Error fetching movie data:', error);
    }
  }

  async fetchMovieData(title) {
    if (!this.API_KEY || this.API_KEY === 'YOUR_OMDB_API_KEY') {
      return null;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(title);
    const cachedData = this.cache[cacheKey];

    if (cachedData) {
      const age = Date.now() - cachedData.timestamp;
      const expiryTime = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      if (age < expiryTime) {
        console.log(`Using cached data for: ${title}`);
        return cachedData.data;
      } else {
        // Cache expired, remove it
        delete this.cache[cacheKey];
      }
    }

    // Fetch from API
    const cleanTitle = title.replace(/\s*\(\d{4}\)\s*/, '').trim();
    const url = `https://www.omdbapi.com/?apikey=${this.API_KEY}&t=${encodeURIComponent(cleanTitle)}`;

    try {
      console.log(`Fetching from API: ${title}`);
      const response = await fetch(url);
      const data = await response.json();

      // Cache the result (even if it's an error/not found)
      this.cache[cacheKey] = {
        data: data,
        timestamp: Date.now()
      };

      // Save cache to storage
      await this.saveCache();

      return data;
    } catch (error) {
      console.error('OMDB API error:', error);
      return null;
    }
  }

  injectRatingInfo(element, movieData) {
    // Remove existing rating info if any
    const existing = element.querySelector('.omdb-rating-container');
    if (existing) existing.remove();

    // Determine if we should create a link based on available data
    const hasImdbId = movieData.imdbID && movieData.imdbID !== 'N/A';
    const hasTitle = movieData.Title && movieData.Title !== 'N/A';
    const shouldCreateLink = (this.redirectDestination === 'imdb' && hasImdbId) ||
                             (this.redirectDestination === 'rottentomatoes' && hasTitle);

    // Create rating container as a link or div
    const ratingContainer = shouldCreateLink
      ? document.createElement('a')
      : document.createElement('div');

    ratingContainer.className = 'omdb-rating-container';

    // Add link based on redirect destination preference
    if (shouldCreateLink) {
      if (this.redirectDestination === 'imdb' && hasImdbId) {
        ratingContainer.href = `https://www.imdb.com/title/${movieData.imdbID}/`;
      } else if (this.redirectDestination === 'rottentomatoes' && hasTitle) {
        ratingContainer.href = this.generateRottenTomatoesUrl(movieData.Title);
      }
      ratingContainer.target = '_blank';
      ratingContainer.rel = 'noopener noreferrer';
    }

    // Add hover tooltip
    let titleText = '';
    if (movieData.imdbRating && movieData.imdbRating !== 'N/A') {
      titleText = `IMDB Rating: ${movieData.imdbRating}/10`;
      if (movieData.imdbVotes && movieData.imdbVotes !== 'N/A') {
        titleText += ` (${movieData.imdbVotes} votes)`;
      }
    }
    if (movieData.Awards && movieData.Awards !== 'N/A') {
      if (titleText) titleText += '\n';
      titleText += movieData.Awards;
    }
    if (shouldCreateLink) {
      const destination = this.redirectDestination === 'imdb' ? 'IMDB' : 'Rotten Tomatoes';
      titleText += `\n\nClick to view on ${destination}`;
    }
    ratingContainer.title = titleText;

    // IMDB Rating
    if (movieData.imdbRating && movieData.imdbRating !== 'N/A') {
      const imdbRating = document.createElement('div');
      imdbRating.className = 'omdb-rating imdb-rating';
      imdbRating.textContent = `⭐ ${movieData.imdbRating}`;
      ratingContainer.appendChild(imdbRating);
    }

    // Rotten Tomatoes
    if (movieData.Ratings) {
      const rtRating = movieData.Ratings.find(r => r.Source === 'Rotten Tomatoes');
      if (rtRating) {
        const rtSpan = document.createElement('div');
        rtSpan.className = 'omdb-rating rt-rating';
        rtSpan.textContent = `🍅 ${rtRating.Value}`;
        ratingContainer.appendChild(rtSpan);
      }
    }

    // Awards - extract just the numbers
    if (movieData.Awards && movieData.Awards !== 'N/A') {
      const awards = this.parseAwards(movieData.Awards);
      if (awards) {
        const awardsSpan = document.createElement('div');
        awardsSpan.className = 'omdb-awards';
        awardsSpan.textContent = awards;
        ratingContainer.appendChild(awardsSpan);
      }
    }

    // Insert the rating container
    if (ratingContainer.children.length > 0) {
      // Try to find an image/poster container first
      const posterSelectors = [
        'img[src*="poster"]',
        'img[src*="image"]',
        'img[alt]',
        'picture',
        '[class*="poster"]',
        '[class*="image"]',
        '[class*="thumb"]',
        'img'
      ];

      let posterContainer = null;
      for (const selector of posterSelectors) {
        const poster = element.querySelector(selector);
        if (poster) {
          // Get the parent container of the poster
          posterContainer = poster.closest('div, a, figure') || poster.parentElement;
          if (posterContainer) {
            break;
          }
        }
      }

      // Insert into poster container if found, otherwise use element
      const targetElement = posterContainer || element;

      // Ensure the target element has position: relative
      const currentPosition = window.getComputedStyle(targetElement).position;
      if (currentPosition === 'static') {
        targetElement.style.position = 'relative';
      }

      // Insert at the beginning of the target element
      targetElement.insertAdjacentElement('afterbegin', ratingContainer);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CinemaRatingInjector();
  });
} else {
  new CinemaRatingInjector();
}
