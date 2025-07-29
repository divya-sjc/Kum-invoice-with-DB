class StatusDataSync {
  constructor() {
    // Configuration - Update these values as needed
    this.SERVER_ENDPOINT = 'https://your-api-endpoint.com/status';
    this.LOCAL_STORAGE_KEY = 'statusData';
    this.SYNC_INTERVAL = 300000; // 5 minutes in milliseconds
    this.lastSyncTime = null;
    
    // Initialize UI elements
    this.refreshBtn = document.getElementById('refresh-btn');
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.manualRefresh());
    }
  }

  // Initialize the sync process
  async init() {
    try {
      // First try to load from local storage to show something quickly
      const localData = this.getLocalData();
      
      if (localData) {
        this.displayStatus(localData);
      } else {
        this.showLoading('Loading initial data...');
      }
      
      // Then sync with server
      await this.syncWithServer();
      
      // Set up periodic sync
      this.syncInterval = setInterval(() => this.syncWithServer(), this.SYNC_INTERVAL);
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize. Using offline data if available.');
      this.displayStatus(this.getLocalData() || { error: true, message: "Offline mode - data may be outdated" });
    }
  }

  // Manual refresh triggered by button
  async manualRefresh() {
    this.showLoading('Refreshing data...');
    try {
      await this.syncWithServer();
    } catch (error) {
      this.showError('Refresh failed. Showing cached data.');
    }
  }

  // Show loading state
  showLoading(message) {
    const loadingElement = document.getElementById('status-loading');
    if (loadingElement) {
      loadingElement.textContent = message;
      loadingElement.style.display = 'block';
    }
  }

  // Main sync method
  async syncWithServer() {
    try {
      console.log('Starting data sync...');
      this.showLoading('Syncing with server...');
      
      // Get data from server
      const serverData = await this.fetchServerData();
      
      // Get local data
      const localData = this.getLocalData();
      
      // Merge data (simple strategy - server wins conflicts)
      const mergedData = this.mergeData(localData, serverData);
      
      // Save merged data to local storage
      this.saveLocalData(mergedData);
      
      // Update UI
      this.displayStatus(mergedData);
      
      this.lastSyncTime = new Date();
      this.updateLastSyncTime();
      console.log('Data sync completed at:', this.lastSyncTime);
      
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      this.showError('Sync failed. Showing locally cached data.');
      this.displayStatus(this.getLocalData() || { error: true, message: "Offline mode - data may be outdated" });
      return false;
    }
  }

  // Fetch data from server
  async fetchServerData() {
    try {
      const response = await fetch(this.SERVER_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add any auth headers if needed
          // 'Authorization': 'Bearer your-token-here'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch server data:', error);
      throw error;
    }
  }

  // Get data from local storage
  getLocalData() {
    try {
      const data = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading local storage:', error);
      return null;
    }
  }

  // Save data to local storage
  saveLocalData(data) {
    try {
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to local storage:', error);
      if (error.name === 'QuotaExceededError') {
        this.showError('Local storage full. Some data may not be saved.');
      }
    }
  }

  // Simple merge strategy (server data wins conflicts)
  mergeData(localData, serverData) {
    if (!localData) return serverData;
    if (!serverData) return localData;
    
    // Here you can implement more complex merge logic if needed
    return {
      ...localData,    // Include all local data
      ...serverData,   // Overwrite with server data where conflicts exist
      lastUpdated: new Date().toISOString()
    };
  }

  // Display status data in the UI
  displayStatus(data) {
    if (!data) {
      this.showError('No status data available');
      return;
    }
    
    // Hide loading indicator
    const loadingElement = document.getElementById('status-loading');
    if (loadingElement) loadingElement.style.display = 'none';
    
    // Update your UI elements here
    const statusContainer = document.getElementById('status-container');
    if (statusContainer) {
      statusContainer.innerHTML = `
        <h2>System Status</h2>
        <p>Last updated: ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Unknown'}</p>
        <div class="status-items">
          ${this.generateStatusItems(data)}
        </div>
      `;
    }
  }

  // Generate HTML for status items
  generateStatusItems(data) {
    if (data.error) {
      return `<div class="status-item outage">
        <h3>Connection Error</h3>
        <p>Status: Offline</p>
        <p>${data.message || 'Cannot connect to server'}</p>
      </div>`;
    }
    
    if (!data.items || !Array.isArray(data.items)) {
      return '<div class="status-item"><p>No status items available</p></div>';
    }
    
    return data.items.map(item => `
      <div class="status-item ${item.status || 'unknown'}">
        <h3>${item.name || 'Unnamed Service'}</h3>
        <p>Status: ${item.status || 'unknown'}</p>
        <p>${item.message || ''}</p>
        ${item.lastUpdated ? `<p class="item-updated">Updated: ${new Date(item.lastUpdated).toLocaleTimeString()}</p>` : ''}
      </div>
    `).join('');
  }

  // Update last sync time display
  updateLastSyncTime() {
    const lastSyncElement = document.getElementById('last-sync');
    if (lastSyncElement) {
      lastSyncElement.textContent = this.lastSyncTime ? 
        `Last sync: ${this.lastSyncTime.toLocaleTimeString()}` : 
        'Last sync: Never';
    }
  }

  // Show error message
  showError(message) {
    const errorElement = document.getElementById('status-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      
      // Hide after 5 seconds
      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 5000);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const statusSync = new StatusDataSync();
  statusSync.init();
});
