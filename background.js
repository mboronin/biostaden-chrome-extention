// Background service worker for the extension

const CACHE_EXPIRY_DAYS = 7;

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Biostaden Extension installed');
    // Initialize empty cache
    chrome.storage.local.set({ movieCache: {} });
    console.log('Click the extension icon to configure your OMDB API key');
  }
});

// Handle messages from content script if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchMovieData') {
    fetchMovieDataFromOMDB(request.title, request.apiKey)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  } else if (request.action === 'clearCache') {
    clearCache()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'getCacheStats') {
    getCacheStats()
      .then(stats => sendResponse({ success: true, stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function fetchMovieDataFromOMDB(title, apiKey) {
  const cleanTitle = title.replace(/\s*\(\d{4}\)\s*/, '').trim();
  const url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(cleanTitle)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch from OMDB API');
  }

  const data = await response.json();
  return data;
}

async function clearCache() {
  await chrome.storage.local.set({ movieCache: {} });
  console.log('Cache cleared');
}

async function getCacheStats() {
  const result = await chrome.storage.local.get(['movieCache']);
  const cache = result.movieCache || {};
  const entries = Object.entries(cache);

  const now = Date.now();
  const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const validEntries = entries.filter(([, entry]) => {
    return (now - entry.timestamp) < expiryTime;
  });

  const totalSize = JSON.stringify(cache).length;

  return {
    totalEntries: entries.length,
    validEntries: validEntries.length,
    expiredEntries: entries.length - validEntries.length,
    sizeInBytes: totalSize,
    sizeInKB: (totalSize / 1024).toFixed(2)
  };
}

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension service worker started');
});
