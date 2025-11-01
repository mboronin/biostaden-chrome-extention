# Biostaden - OMDB Ratings Chrome Extension

A Chrome extension that displays IMDB ratings, Rotten Tomatoes scores, and awards information for movies on Swedish cinema websites ([Filmstaden.se](https://www.filmstaden.se), [Bio.se](https://bio.se), [SF.se](https://www.sf.se), and [Filminstitutet.se](https://www.filminstitutet.se)) using the OMDB API.

## Features

- Automatically detects movies on Filmstaden.se, Bio.se, SF.se, and Filminstitutet.se
- Displays IMDB ratings (X/10)
- Shows Rotten Tomatoes scores
- Displays awards and nominations
- Clean, non-intrusive UI that integrates seamlessly with cinema websites
- Dark mode support
- Local caching system to reduce API calls and improve performance
- Smart cache expiration (7 days)
- Cache management UI with statistics

## Prerequisites

- Google Chrome or any Chromium-based browser (Edge, Brave, etc.)
- An OMDB API key (free tier available)

## Getting an OMDB API Key

1. Visit [https://www.omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)
2. Select the FREE tier (1,000 daily requests)
3. Enter your email address
4. Verify your email
5. Copy your API key

## Installation

### 1. Prepare the Extension Icons

Before loading the extension, you need to create the icon files:

```bash
# Navigate to the icons directory
cd icons

# Convert the SVG to PNG (using ImageMagick or online tool)
# You can use: https://cloudconvert.com/svg-to-png
# Or if you have ImageMagick installed:
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

Alternatively, create your own PNG icons in these sizes: 16x16, 48x48, and 128x128 pixels.

### 2. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked"
4. Select the `browser-film-plugin` directory
5. The extension should now appear in your extensions list

### 3. Configure Your API Key

1. Click the extension icon in your browser toolbar
2. Enter your OMDB API key in the input field
3. Click "Save Settings"
4. The extension will automatically reload any open Filmstaden tabs

## Usage

1. Navigate to any supported cinema website:
   - [https://www.filmstaden.se](https://www.filmstaden.se)
   - [https://bio.se](https://bio.se)
   - [https://www.sf.se](https://www.sf.se)
   - [https://www.filminstitutet.se](https://www.filminstitutet.se)
2. Browse movies (search, view listings, or movie details pages)
3. The extension will automatically detect movie titles and fetch ratings
4. Rating information will appear below movie titles with:
   - IMDB rating (yellow highlight)
   - Rotten Tomatoes score (red highlight)
   - Awards and nominations (purple gradient)

### Cache Management

The extension uses local storage to cache movie data, reducing API calls and improving performance:

- **Automatic Caching**: Movie ratings and awards are cached after the first fetch
- **Cache Duration**: Cached data expires after 7 days
- **View Cache Stats**: Click the extension icon to see cache statistics (total entries, valid entries, cache size)
- **Clear Cache**: Use the "Clear Cache" button in the popup to remove all cached data
- **Console Logging**: Check the browser console to see when data is fetched from cache vs. API

## File Structure

```
browser-film-plugin/
├── manifest.json          # Extension configuration
├── content.js            # Main script that runs on Filmstaden.se
├── background.js         # Background service worker
├── popup.html            # Settings popup UI
├── popup.js              # Settings popup logic
├── styles.css            # Styling for injected ratings
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg          # SVG template
└── README.md             # This file
```

## How It Works

1. **Content Script** ([content.js](content.js)): Runs on supported cinema websites (Filmstaden.se, Bio.se, SF.se, Filminstitutet.se), detects movie titles, checks cache, and injects rating information
2. **Background Worker** ([background.js](background.js)): Manages cache statistics and provides cache management functions
3. **Popup UI** ([popup.html](popup.html), [popup.js](popup.js)): Provides settings interface for API key and cache management
4. **Styles** ([styles.css](styles.css)): CSS for the injected rating elements with dark mode support
5. **Caching System**:
   - Uses Chrome's `storage.local` API for persistent caching
   - Each movie is cached with a timestamp
   - Cache is automatically cleaned on page load (expired entries removed)
   - Cache keys are normalized (lowercase, year removed) for consistency

## Troubleshooting

### Ratings Not Showing Up

1. Make sure you've entered a valid OMDB API key in the extension popup
2. Check the browser console (F12) for any error messages
3. Verify you're on one of the supported websites (Filmstaden.se, Bio.se, SF.se, or Filminstitutet.se)
4. Try refreshing the page

### API Key Not Saving

1. Make sure Chrome sync storage is enabled
2. Check that you've granted necessary permissions to the extension
3. Try removing and re-adding the extension

### Wrong Movie Information

The extension searches by movie title. If the wrong information appears:
- The movie title might be in Swedish but OMDB primarily has English titles
- The movie might be very new or not in the OMDB database
- Try visiting a detailed movie page where the title is more prominently displayed

## Development

### Making Changes

1. Edit the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload the Filmstaden.se page to see changes

### Testing

1. Visit various pages on supported cinema websites:
   - Homepage with movie listings
   - Search results
   - Individual movie pages
   - Cinema listings with movie times
   - Festival programs (Filminstitutet)

2. Test with different types of content:
   - New releases
   - Classic films
   - Foreign films
   - Swedish films

## Limitations

- Free OMDB API tier is limited to 1,000 requests per day (cached data helps reduce API usage)
- Some Swedish movie titles may not match OMDB's database
- The extension relies on consistent HTML structure on supported websites
- Only works when visiting supported cinema websites (Filmstaden.se, Bio.se, SF.se, Filminstitutet.se)
- Cache storage is limited by Chrome's `storage.local` quota (approximately 10MB)

## Privacy

This extension:
- Only runs on supported cinema websites (Filmstaden.se, Bio.se, SF.se, Filminstitutet.se)
- Makes requests only to the OMDB API
- Stores your API key in Chrome's sync storage
- Stores movie data cache in Chrome's local storage
- Does not collect, transmit, or store any personal data
- All data stays on your device

## License

MIT License - Feel free to modify and distribute

## Credits

- Movie data provided by [OMDB API](https://www.omdbapi.com/)
- Built for Swedish cinema websites: [Filmstaden.se](https://www.filmstaden.se), [Bio.se](https://bio.se), [SF.se](https://www.sf.se), and [Filminstitutet.se](https://www.filminstitutet.se)

## Support

For issues, questions, or suggestions, please open an issue on the project repository.
