# VeniceMap — Agent & Developer Operational Context

## Local Server & Debugging Requirements

### Google Maps Platform API Key Restrictions
The Google Maps API key enforces HTTP Referrer restrictions. It authorizes only:
- `http://127.0.0.1:4174/VeniceMap/*`
- `https://talmalek.github.io/VeniceMap/*`

### Local Execution Rules
1. Always run the server on IP `127.0.0.1` and port `4174`.
2. Do not use `localhost` (the API key rejects `localhost`).
3. Always serve with base path `/VeniceMap/`.
4. Dev URL: `http://127.0.0.1:4174/VeniceMap/`.

### Commands
- Start dev server: `npm run dev`
- Build production bundle: `npm run build`
- Preview production bundle: `npm run preview`
