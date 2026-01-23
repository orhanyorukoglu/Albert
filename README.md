# Albert - YouTube Transcript Extractor

A React + Vite single-page application for extracting YouTube video transcripts in multiple formats with multi-language support.

## Features

- Extract transcripts from YouTube videos with available captions
- Output formats: Text, JSON, SRT, VTT
- Multi-language transcript support with instant switching (no re-fetch)
- Video metadata display (title, channel, duration, views, upload date)
- Video thumbnail preview
- Copy to clipboard functionality
- Download transcript as file (non-Chrome browsers)
- Automatic retry with exponential backoff on server errors
- Testing mode with diagnostic sidebar

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 19.2.3 |
| Build Tool | Vite | 7.3.1 |
| Styling | Tailwind CSS | 4.1.18 |
| UI Components | shadcn/ui (Radix UI) | - |
| Icons | Lucide React | 0.562.0 |
| File Download | file-saver | 2.0.5 |

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Albert.git
cd Albert

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your API key

# Start development server
npm run dev
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_KEY` | Yes | - | API key for backend authentication |
| `VITE_API_BASE_URL` | No | `https://ytte-production.up.railway.app` | Production API URL |
| `VITE_API_LOCAL_URL` | No | `http://localhost:8000` | Local development API URL |
| `VITE_TESTING_MODE` | No | `no` | Set to `yes` to enable diagnostic sidebar |
| `VITE_TESTING_REFRESH_RATE` | No | `60` | Diagnostic refresh interval in seconds |

## Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build locally
```

## Project Structure

```
src/
├── App.jsx                           # Main application component
├── main.jsx                          # Application entry point
├── index.css                         # Tailwind CSS configuration
├── components/
│   ├── UrlInput.jsx                  # YouTube URL input with validation
│   ├── FormatSelector.jsx            # Output format dropdown (txt/json/srt/vtt)
│   ├── LanguageSelector.jsx          # Language toggle buttons
│   ├── TranscriptDisplay.jsx         # Transcript content viewer
│   ├── CopyButton.jsx                # Copy to clipboard
│   ├── DownloadButton.jsx            # Download as file
│   ├── LoadingSpinner.jsx            # Loading indicator
│   ├── ErrorPopup.jsx                # Toast notifications
│   ├── DiagnosticSidebar.jsx         # Testing mode diagnostics
│   ├── ApiEnvironmentSwitcher.jsx    # Production/Local toggle
│   └── ui/                           # shadcn/ui components
│       ├── alert.jsx
│       ├── badge.jsx
│       ├── button.jsx
│       ├── card.jsx
│       ├── input.jsx
│       ├── scroll-area.jsx
│       ├── select.jsx
│       ├── separator.jsx
│       ├── switch.jsx
│       ├── toggle.jsx
│       └── toggle-group.jsx
├── services/
│   └── api.js                        # API client with retry logic
└── lib/
    └── utils.js                      # Utility functions (cn)
```

## Application State

The main `App.jsx` component manages the following state:

| State | Type | Description |
|-------|------|-------------|
| `url` | string | Current YouTube URL input |
| `format` | string | Selected format: `txt`, `json`, `srt`, `vtt` |
| `transcript` | object | Current transcript data for display |
| `allTranscripts` | object | Cached transcripts for all available languages |
| `loading` | boolean | API request in progress |
| `apiError` | string | Error message from last failed request |
| `errorType` | string | `validation` or `server` |
| `retryInfo` | object | Current retry attempt info |
| `availableLanguages` | array | Available transcript languages |
| `selectedLanguage` | string | Currently selected language code |
| `thumbnailUrl` | string | Video thumbnail URL |
| `videoMetadata` | object | Video info (title, channel, duration, views, upload_date) |

## Components

### UrlInput

Validates YouTube URLs using the regex pattern:
```javascript
/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
```

Displays real-time validation feedback. Submit button is disabled until a valid URL is entered.

### FormatSelector

Dropdown with four output formats:
- **Text** - Plain text, spaces between segments
- **JSON** - Full transcript object with segments and metadata
- **SRT** - SubRip subtitle format with timestamps
- **VTT** - WebVTT subtitle format

### LanguageSelector

Toggle button group for switching transcript language. Appears when multiple languages are available.

Sorting order:
1. English manual captions first
2. Other manual captions
3. Auto-generated captions
4. Alphabetically by name within each group

Auto-generated captions display with "(auto)" badge.

### TranscriptDisplay

Scrollable viewer (384px height) for transcript content.

Rendering rules:
- Monospace font for JSON, SRT, VTT
- Regular font for plain text
- Whitespace preserved for SRT, VTT, JSON

### CopyButton

Copies transcript content to clipboard using `navigator.clipboard.writeText()`. Shows "Copied!" feedback for 2 seconds.

### DownloadButton

Creates a blob and triggers browser download. Hidden for Chrome users due to blob URL limitations. Filename format: `transcript.{format}`

### ErrorPopup

Fixed-position toast notification (top-right corner).

| Error Type | Style | Auto-dismiss |
|------------|-------|--------------|
| Validation | Amber warning icon | 10 seconds |
| Server | Red destructive icon | Manual close |

### LoadingSpinner

Centered spinner using Lucide `Loader2` icon with CSS animation.

### DiagnosticSidebar (Testing Mode)

264px-wide sidebar showing:
- API Base URL
- API Key status (preview: first 2 chars + ***)
- Server connectivity status with latency
- Health check status with response data
- Retry status during failed requests
- Last API error details

Auto-refreshes based on `VITE_TESTING_REFRESH_RATE` (default: 60 seconds).

### ApiEnvironmentSwitcher (Testing Mode)

Toggle switch between Production and Local API endpoints. Selection persisted to localStorage under key `albert_api_environment`.

## API Service

Located in `src/services/api.js`.

### Environment Management

```javascript
getApiEnvironment()     // Returns 'production' or 'local'
setApiEnvironment(env)  // Saves to localStorage
getConfig()             // Returns { environment, environmentName, baseUrl, hasApiKey, apiKeyPreview }
```

### Connectivity Checks

```javascript
checkConnectivity()  // GET / with 5s timeout, returns { connected, latency, status }
checkHealth()        // GET /health, returns { healthy, data } or { healthy: false, error }
checkApiAuth()       // POST /api/v1/extract with empty body, validates API key
```

### Transcript Extraction

```javascript
extractTranscript(url, format, options, onRetry)
```

**Options:**
- `fetchAllLanguages: true` - Fetch all available language transcripts
- `languagePreference: 'en'` - Preferred language code

**Retry Logic:**
- Maximum 3 retries
- Exponential backoff: 2s, 4s, 8s
- Retryable errors: 429, 500, 502, 503, network errors
- Non-retryable: 400, 401, 403, 404, 422

**Request:**
```
POST /api/v1/extract
Content-Type: application/json
X-API-Key: <api_key>

{
  "url": "https://youtube.com/watch?v=VIDEO_ID",
  "format": "json",
  "fetch_all_languages": true
}
```

### Additional Endpoints

```javascript
getThumbnail(url, quality)  // GET /api/v1/thumbnail?url=...&quality=hq
getMetadata(url)            // GET /api/v1/metadata?url=...
```

## Format Conversion

Transcripts are stored as segments and converted on-the-fly:

```javascript
// Segment structure
{ text: "Hello", start: 0.5, duration: 2.3 }

// SRT output
1
00:00:00,500 --> 00:00:02,800
Hello

// VTT output
WEBVTT

00:00:00.500 --> 00:00:02.800
Hello

// Text output
Hello (segments joined with spaces)
```

## Error Handling

| Status Code | Message | Retryable |
|-------------|---------|-----------|
| 400 | Bad request | No |
| 401 | Authentication failed | No |
| 403 | Access denied | No |
| 404 | Not found | No |
| 422 | Validation error | No |
| 429 | Rate limited | Yes |
| 500 | Server error | Yes |
| 502 | Gateway error | Yes |
| 503 | Service unavailable | Yes |

Network errors (TypeError) are treated as retryable.

## UI Components Library

Built on Radix UI primitives with Tailwind styling:

| Component | Source |
|-----------|--------|
| Alert | @radix-ui/react-alert |
| Badge | Custom with CVA variants |
| Button | Custom with CVA variants (default, destructive, outline, secondary, ghost, link) |
| Card | Custom container |
| Input | Custom with aria-invalid support |
| ScrollArea | @radix-ui/react-scroll-area |
| Select | @radix-ui/react-select |
| Separator | @radix-ui/react-separator |
| Switch | @radix-ui/react-switch |
| Toggle | @radix-ui/react-toggle |
| ToggleGroup | @radix-ui/react-toggle-group |

All components use the `cn()` utility from `lib/utils.js` for class merging (clsx + tailwind-merge).
