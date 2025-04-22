// Configuration for Text Scanner Extension
const config = {
    // Replace with your OpenAI API key
    OPENAI_API_KEY: 'your-actual-api-key',
    
    // API endpoints
    DICTIONARY_API: 'https://api.dictionaryapi.dev/api/v2/entries/en',
    OPENAI_API: 'https://api.openai.com/v1/chat/completions',
    
    // AI settings
    AI_MODEL: 'gpt-4-1106-preview',
    MAX_TOKENS: 150,
    TEMPERATURE: 0.7,
    
    // Feature flags
    USE_AI_FALLBACK: true,
    DEBUG_MODE: false,
    PORT: 3000,

    // Development
    development: {
        apiUrl: 'http://localhost:3000'
    },
    // Production - Update this with your Render URL
    production: {
        apiUrl: 'https://text-scanner-api.onrender.com'
    }
};

// Export the appropriate config based on environment
export const currentConfig = process.env.NODE_ENV === 'production' 
    ? config.production 
    : config.development;

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    window.config = config;
} 