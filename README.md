# SuperMarketBot-FE

A React-based frontend application for SuperMarketBot. 

## Tech Stack
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Linting**: ESLint

## Project Structure
- `src/api/`: API integration and network requests
- `src/components/`: Reusable UI components
- `src/features/`: Feature-specific logic and components
- `src/pages/`: Main application pages/routes
- `src/hooks/`: Custom React hooks

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation

Clone the repository and install the dependencies:
```bash
npm install
```

### Running the App

Start the development server:

```bash
npm run dev
```

The dev server runs on `http://localhost:5173`.

### Switching between local and ngrok backends

The app reads three env vars from `.env` (see `.env.example`):

| Variable                  | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `VITE_ACTIVE_BACKEND`     | `"local"` or `"ngrok"` — which backend to use        |
| `VITE_LOCAL_API_URL`      | Local backend (default `http://localhost:5000`)      |
| `VITE_NGROK_API_URL`      | Ngrok tunnel URL (changes every ngrok restart)       |

To switch, edit `.env`, set `VITE_ACTIVE_BACKEND`, then **restart `npm run dev`**.

- **Local mode:** the Vite proxy forwards `/api/*` → `VITE_LOCAL_API_URL`. No special headers needed.
- **Ngrok mode:** the Vite proxy forwards `/api/*` → `VITE_NGROK_API_URL` and automatically injects the `ngrok-skip-browser-warning` header, so the ngrok interstitial is bypassed.
- **Production build** (`npm run build`): there is no Vite proxy, so the app calls the active backend URL directly. The `ngrok-skip-browser-warning` header is added client-side automatically when in ngrok mode. Make sure CORS allows the page origin on the backend (it already does — `Program.cs` uses `SetIsOriginAllowed(_ => true)`).

> Legacy `VITE_API_BASE_URL` is still respected if you set it explicitly; it overrides both modes above.
