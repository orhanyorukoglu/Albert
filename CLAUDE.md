# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Albert is a React + Vite single-page application for extracting YouTube video transcripts. It connects to an existing FastAPI backend deployed on Railway.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Initial Setup (if starting fresh)

```bash
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Architecture

### Tech Stack
- React 18+ with Vite
- Tailwind CSS for styling
- Fetch API for HTTP requests
- React useState/useReducer for state (no external state library)

### Directory Structure (Planned)
```
src/
├── components/
│   ├── UrlInput.jsx        # YouTube URL input with validation
│   ├── FormatSelector.jsx  # Radio buttons for output format
│   ├── TranscriptDisplay.jsx
│   ├── CopyButton.jsx
│   ├── LoadingSpinner.jsx
│   └── ErrorMessage.jsx
├── services/
│   └── api.js              # Centralized API client
├── App.jsx                 # Main app with state management
├── index.css
└── main.jsx
```

### State Shape (App.jsx)
- `url` - Current input URL
- `format` - Selected output format (json, txt, srt, vtt)
- `transcript` - API response data
- `loading` - Request status flag
- `error` - Error message string

## API Integration

**Endpoint**: `POST https://ytte-production.up.railway.app/api/v1/extract`

**Headers**:
```
Content-Type: application/json
X-API-Key: <VITE_API_KEY>
```

**Request Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "format": "json",
  "language_preference": "en"
}
```

**Supported Formats**: `json`, `txt`, `srt`, `vtt`

## Environment Variables

Create `.env` file:
```
VITE_API_KEY=4321
VITE_API_BASE_URL=https://ytte-production.up.railway.app
```

Note: `4321` is the development API key. Replace before production deployment.

## Key Implementation Details

### YouTube URL Validation
```javascript
/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
```

### Format-Specific Display
- JSON: Pretty-print with formatting
- SRT/VTT: Monospace font for subtitle formats
- TXT: Regular text display
