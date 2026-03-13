// live-data.js - Fetch live data for Curio Terminal

async function fetchLiveData() {
    try {
        // Fetch from backend data endpoint
        const response = await fetch('/curio-terminal/data/summary.json');
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching live data:', error);
        // Return fallback data
        return {
            floor_price: 0.051,
            volume_24h: 0,
            sales_24h: 1,
            holders: 387,
            status: 'offline'
        };
    }
}

function updateTerminalData(data) {
    // Update market overview
    document.querySelector('[data-field="floor_price"]').textContent = data.floor_price + ' ETH';
    document.querySelector('[data-field="volume_24h"]').textContent = data.volume_24h + ' ETH';
    document.querySelector('[data-field="sales_24h"]').textContent = data.sales_24h;
    document.querySelector('[data-field="holders"]').textContent = data.holders;
    
    // Update status indicator
    const statusDot = document.querySelector('.status-dot');
    if (data.status === 'live') {
        statusDot.style.background = '#00ff41'; // Green
    } else {
        statusDot.style.background = '#ffcc00'; // Yellow
    }
}

// Initialize and auto-refresh
async function initLiveData() {
    // Initial load
    const data = await fetchLiveData();
    updateTerminalData(data);
    
    // Refresh every 60 seconds
    setInterval(async () => {
        const data = await fetchLiveData();
        updateTerminalData(data);
    }, 60000);
}

// Start when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiveData);
} else {
    initLiveData();
}
