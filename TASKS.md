# Albert - YouTube Transcript Extractor Frontend - Development Tasks

## Phase 0: Project Setup

- [x] Create new directory for the project (`mkdir albert && cd albert`)
- [x] Initialize Claude Code in the project directory (`claude` command)
- [x] Create React + Vite project using `npm create vite@latest . -- --template react`
- [x] Install dependencies (`npm install`)
- [x] Verify dev server runs (`npm run dev`)

## Phase 1: Environment & Configuration

- [x] Create `.env` file with environment variables
  - [x] `VITE_API_KEY=4321` (development key, replace in production)
  - [x] `VITE_API_BASE_URL=https://ytte-production.up.railway.app`
  - [x] `VITE_TESTING_MODE=yes` (for diagnostic sidebar)
- [x] Add `.env` to `.gitignore`
- [x] Create `.env.example` with placeholder values for documentation
- [x] Create config module to export environment variables

## Phase 2: Styling Setup

- [x] Install Tailwind CSS v4 (`npm install -D tailwindcss @tailwindcss/postcss`)
- [x] Configure `postcss.config.js` for Tailwind v4
- [x] Add Tailwind import to `index.css`
- [x] Test Tailwind is working with a simple class

## Phase 3: Core Components

### API Service Layer
- [x] Create `src/services/api.js`
- [x] Implement `extractTranscript(url, format, languagePreference)` function
- [x] Add request headers including `X-API-Key`
- [x] Handle API response parsing
- [x] Implement error handling for different HTTP status codes
- [x] Add diagnostic functions (`getConfig`, `checkConnectivity`, `checkHealth`, `checkApiAuth`)

### URL Input Component
- [x] Create `src/components/UrlInput.jsx`
- [x] Add text input field with placeholder
- [x] Add submit button
- [x] Disable button while loading

### Format Selector Component
- [x] Create `src/components/FormatSelector.jsx`
- [x] Add radio buttons for JSON, TXT, SRT, VTT
- [x] Set JSON as default selected
- [x] Handle format change callback

### Transcript Display Component
- [x] Create `src/components/TranscriptDisplay.jsx`
- [x] Add container for transcript text
- [x] Style for readability (monospace font for SRT/VTT/JSON, regular for TXT)
- [x] Handle JSON formatting (pretty print)
- [x] Add scrollable area for long transcripts
- [x] Extract format-specific content (srt_content, vtt_content, full_text)

### Copy Button Component
- [x] Create `src/components/CopyButton.jsx`
- [x] Implement clipboard copy using `navigator.clipboard.writeText()`
- [x] Add visual feedback on copy (text change)
- [x] Handle copy failure gracefully

### Download Button Component
- [x] Create `src/components/DownloadButton.jsx`
- [x] Implement file download functionality
- [x] Support different file extensions based on format
- [ ] Fix Chrome download compatibility (works in Safari, investigating Chrome issue)

### Loading Indicator
- [x] Create `src/components/LoadingSpinner.jsx`
- [x] Add simple CSS spinner
- [x] Display during API request

### Error Display Component
- [x] Create `src/components/ErrorMessage.jsx`
- [x] Style error messages distinctly (red/warning colors)
- [x] Add dismiss functionality

### Diagnostic Sidebar (Testing Mode)
- [x] Create `src/components/DiagnosticSidebar.jsx`
- [x] Display API base URL
- [x] Display API key status (masked preview)
- [x] Show server connectivity status with latency
- [x] Show health check status
- [x] Show API authentication status
- [x] Add refresh diagnostics button
- [x] Only display when VITE_TESTING_MODE=yes

## Phase 4: Main App Integration

- [x] Import all components into `App.jsx`
- [x] Set up state management
  - [x] `url` - input URL
  - [x] `format` - selected format
  - [x] `transcript` - API response
  - [x] `loading` - request in progress
  - [x] `error` - error message
- [x] Wire up form submission handler
- [x] Connect API service to form submission
- [x] Display loading state during request
- [x] Display transcript on success
- [x] Display error on failure
- [x] Clear previous transcript/error on new submission
- [x] Add getCopyContent() helper for format-specific content extraction

## Phase 5: Layout & Styling

- [x] Create responsive container layout
- [x] Style header/title
- [x] Style input section
- [x] Style format selector
- [x] Style transcript output area
- [ ] Add mobile breakpoints
- [ ] Test on different screen sizes

## Phase 6: Testing & Polish

- [x] Test with valid YouTube URLs
- [ ] Test with invalid URLs (validation)
- [ ] Test with videos that have no transcript
- [x] Test each output format (JSON, TXT, SRT, VTT)
- [x] Test copy functionality
- [ ] Test error states (network offline, API down)
- [ ] Fix any bugs found during testing

## Phase 7: Build & Documentation

- [ ] Run production build (`npm run build`)
- [ ] Test production build locally (`npm run preview`)
- [ ] Update README.md with setup instructions
- [ ] Document environment variables required
- [ ] Add usage instructions

## Phase 8: Deployment (Optional)

- [ ] Choose hosting platform (Vercel, Netlify, etc.)
- [ ] Configure environment variables on platform
- [ ] Deploy production build
- [ ] Verify deployed application works
- [ ] Test with live API

---

## Quick Reference

**API Endpoint**: `POST https://ytte-production.up.railway.app/api/v1/extract`

**Request Headers**:
```
Content-Type: application/json
X-API-Key: 4321
```

> **Note**: `4321` is the development API key. Replace with production key before deployment.

**Request Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "format": "json"
}
```

**YouTube URL Regex Pattern**:
```javascript
/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
```
