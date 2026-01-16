# Albert - YouTube Transcript Extractor Frontend

## Product Requirements Document

### Overview

A lightweight React + Vite single-page application that allows users to extract transcripts from YouTube videos. The frontend connects to an existing FastAPI backend service that handles the actual transcript extraction through multiple fallback methods.

### Problem Statement

Users need a simple, intuitive interface to retrieve YouTube video transcripts without dealing with API calls directly. The existing backend API is functional but lacks a user-friendly frontend.

### Goals

1. Provide a clean, minimal interface for transcript extraction
2. Support multiple output formats (JSON, TXT, SRT, VTT)
3. Display extracted transcripts with copy-to-clipboard functionality
4. Handle errors gracefully with clear user feedback

### Technical Stack

- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (or CSS Modules)
- **HTTP Client**: Fetch API or Axios
- **State Management**: React useState/useReducer (no external library needed)

### API Integration

**Base URL**: `https://ytte-production.up.railway.app`

**Primary Endpoint**: `POST /api/v1/extract`

**Authentication**: `X-API-Key` header required

**Request Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "format": "json",
  "language_preference": "en"
}
```

**Supported Formats**:
- `json` - Structured transcript with timestamps
- `txt` - Plain text transcript
- `srt` - SubRip subtitle format
- `vtt` - WebVTT subtitle format

### Features

#### MVP (Phase 1)

1. **URL Input**
   - Text field for YouTube URL
   - Basic URL validation (youtube.com or youtu.be domains)
   - Submit button

2. **Format Selection**
   - Dropdown or radio buttons for format selection
   - Default to JSON format

3. **Transcript Display**
   - Display area for extracted transcript
   - Loading state indicator
   - Error message display

4. **Copy Functionality**
   - Button to copy transcript to clipboard
   - Visual feedback on successful copy

#### Future Enhancements (Phase 2)

- Language preference selection
- Download transcript as file
- Video metadata display (title, duration)
- Transcript search/highlight
- History of recent extractions (localStorage)

### User Interface

#### Layout

```
┌─────────────────────────────────────────────────┐
│  Albert - YouTube Transcript Extractor          │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────┐  ┌──────┐ │
│  │ Enter YouTube URL...            │  │ Get  │ │
│  └─────────────────────────────────┘  └──────┘ │
│                                                 │
│  Format: (•) JSON  ( ) TXT  ( ) SRT  ( ) VTT   │
│                                                 │
├─────────────────────────────────────────────────┤
│  Transcript                          [Copy]     │
│  ┌─────────────────────────────────────────────┐│
│  │                                             ││
│  │  (transcript content appears here)          ││
│  │                                             ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Error Handling

| Scenario | User Feedback |
|----------|---------------|
| Invalid URL | "Please enter a valid YouTube URL" |
| API timeout | "Request timed out. Please try again." |
| Video unavailable | "Could not find transcript for this video" |
| Network error | "Network error. Check your connection." |
| Rate limited | "Too many requests. Please wait a moment." |

### Configuration

The API key should be configurable via environment variable:

```
VITE_API_KEY=4321
VITE_API_BASE_URL=https://ytte-production.up.railway.app
```

**Note**: The development API key `4321` is a placeholder. Replace with a proper API key before deploying to production.

### Non-Functional Requirements

- **Performance**: Initial load under 2 seconds
- **Responsiveness**: Mobile-friendly layout
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Accessibility**: Basic ARIA labels, keyboard navigation

### Out of Scope

- User authentication/accounts
- Transcript editing
- Video playback
- Batch processing multiple videos
- Backend API modifications

### Success Metrics

- Successfully extract transcripts from valid YouTube URLs
- Clear error messages for invalid inputs or API failures
- Responsive design works on mobile and desktop
