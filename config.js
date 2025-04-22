// Configuration for Text Scanner Extension
const config = {
    // API endpoints
    apiUrl: 'https://text-scanner-api.onrender.com',
    
    // Feature flags
    USE_AI_FALLBACK: true,
    DEBUG_MODE: false
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    window.config = config;
} 