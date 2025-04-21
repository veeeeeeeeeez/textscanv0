# Text Scanner Chrome Extension

A Chrome extension that provides instant explanations for selected text using AI.

## Features

- Select any text on a webpage to get an instant explanation
- Inline popup with concise AI-powered explanations
- Fast response times using GPT-3.5-turbo
- Rate-limited API to handle multiple users
- Secure API key management

## Setup Instructions

### For Users

1. Install the extension from the Chrome Web Store (link coming soon)
2. The extension will work out of the box - no additional setup required

### For Developers

#### Prerequisites

- Node.js 14.0.0 or higher
- npm or yarn
- A Chrome browser
- An OpenAI API key

#### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/text-scanner-extension.git
cd text-scanner-extension
```

2. Set up the server:
```bash
cd server
cp .env.example .env
# Edit .env with your OpenAI API key and other settings
npm install
npm run dev
```

3. Load the extension in Chrome:
- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the extension directory

#### Deployment

1. Server Deployment:
```bash
cd server
npm install
npm run build
npm start
```

2. Extension Deployment:
- Create a production build
- Submit to Chrome Web Store

## Environment Variables

Create a `.env` file in the server directory with:

```
PORT=3000
NODE_ENV=production
OPENAI_API_KEY=your_api_key_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://your-extension-origin.com
```

## API Endpoints

### POST /explain
Get an explanation for selected text.

Request:
```json
{
    "text": "Text to explain"
}
```

Response:
```json
{
    "explanation": "Brief explanation of the text"
}
```

### GET /health
Check server health status.

Response:
```json
{
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security

- API keys are stored securely in environment variables
- Rate limiting prevents abuse
- CORS is configured for production
- Error details are only shown in development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details 