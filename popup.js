// Popup script for settings management

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const redirectDestinationSelect = document.getElementById('redirectDestination');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const clearCacheBtn = document.getElementById('clearCacheBtn');

  // Load saved settings
  chrome.storage.sync.get(['omdbApiKey', 'redirectDestination'], (result) => {
    if (result.omdbApiKey) {
      apiKeyInput.value = result.omdbApiKey;
    }
    if (result.redirectDestination) {
      redirectDestinationSelect.value = result.redirectDestination;
    } else {
      // Default to IMDB
      redirectDestinationSelect.value = 'imdb';
    }
  });

  // Load cache statistics
  loadCacheStats();

  // Save settings
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const redirectDestination = redirectDestinationSelect.value;

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    // Validate API key format (basic check)
    if (apiKey.length < 8) {
      showStatus('Invalid API key format', 'error');
      return;
    }

    // Save to storage
    chrome.storage.sync.set({
      omdbApiKey: apiKey,
      redirectDestination: redirectDestination
    }, () => {
      showStatus('Settings saved successfully!', 'success');

      // Reload all cinema website tabs to apply the new key
      const patterns = [
        'https://www.filmstaden.se/*',
        'https://bio.se/*',
        'https://sf.se/*',
        'https://www.sf.se/*',
        'https://www.filminstitutet.se/*'
      ];

      patterns.forEach(pattern => {
        chrome.tabs.query({ url: pattern }, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.reload(tab.id);
          });
        });
      });
    });
  });

  // Clear cache button
  clearCacheBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearCache' }, (response) => {
      if (response.success) {
        showStatus('Cache cleared successfully!', 'success');
        loadCacheStats();

        // Reload all cinema website tabs to refresh data
        const patterns = [
          'https://www.filmstaden.se/*',
          'https://bio.se/*',
          'https://sf.se/*',
          'https://www.sf.se/*',
          'https://www.filminstitutet.se/*'
        ];

        patterns.forEach(pattern => {
          chrome.tabs.query({ url: pattern }, (tabs) => {
            tabs.forEach(tab => {
              chrome.tabs.reload(tab.id);
            });
          });
        });
      } else {
        showStatus('Error clearing cache', 'error');
      }
    });
  });

  // Handle Enter key
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
});

function loadCacheStats() {
  chrome.runtime.sendMessage({ action: 'getCacheStats' }, (response) => {
    if (response.success) {
      const stats = response.stats;
      document.getElementById('totalEntries').textContent = stats.totalEntries;
      document.getElementById('validEntries').textContent = stats.validEntries;
      document.getElementById('cacheSize').textContent = `${stats.sizeInKB} KB`;
    }
  });
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  // Hide after 3 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}
