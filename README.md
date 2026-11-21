# VeniceMap — Interactive 3D Aerial Tour & Geotagged Photography

> A high-definition, photorealistic 3D aerial exploration of Venice built on Google Maps 3D Tiles, paired with live GPU color calibration, cinematic camera orbits, zero-upload local EXIF GPS photo plotting, and a password-protected AES-256-GCM API key vault.

[![Live Demo](https://img.shields.io/badge/Live_Demo-talmalek.github.io%2FVeniceMap-0B2E26?style=for-the-badge&logo=githubpages&logoColor=E6B86A)](https://talmalek.github.io/VeniceMap/)

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=fff)
![Google Maps 3D](https://img.shields.io/badge/Google_Maps-3D_Tiles-34A853?style=flat-square&logo=googlemaps&logoColor=fff)
![Security](https://img.shields.io/badge/Vault-AES--256--GCM-E6B86A?style=flat-square&logo=letsencrypt&logoColor=000)

---

![VeniceMap Hero Aerial Overview](docs/screenshots/01-hero-overview.png)

---

## ✨ Key Features

### 1. Photorealistic 3D Venice Globe & Cinematic Camera
- Powered by **Google Maps Photorealistic 3D Tiles** (`<gmp-map-3d>` via `@vis.gl/react-google-maps`) with bounded Venice lagoon guard rails.
- Smooth `flyCameraTo` transitions between top-down overview, 60° 3D tilted perspective, 45° heading rotation, and continuous landmark orbits.
- Automatic orbit pause when the browser tab moves to the background (Page Visibility API) to save GPU and battery.
- Dynamic brush-script hero header and vector cartographic silhouette of Venice's six historic *Sestieri* that glide away smoothly as you zoom in.

![VeniceMap 3D Perspective Over Grand Canal](docs/screenshots/02-explore-3d-perspective.png)

---

### 2. Geotagged Photo Album & 3D Geodetic Markers
- Includes a curated **Top 20 Venice Attractions** album (Piazza San Marco, Ponte di Rialto, Palazzo Ducale, Ponte dei Sospiri, Basilica di Santa Maria della Salute, Murano, and more).
- Plots custom **Glossy 3D Red Pins** (`Marker3D` with `AltitudeMode.RELATIVE_TO_MESH`) anchored directly onto the 3D Venetian building mesh.
- Clicking any photo card in the bottom filmstrip smoothly flies the 3D camera to the exact GPS coordinates and begins a slow aerial orbit around the landmark.

![VeniceMap Geotagged Album and 3D Pin over Ponte di Rialto](docs/screenshots/03-geotagged-album-3d-pin.png)

---

### 3. Live GPU Color Grading & Clarity Calibration
- Real-time GPU-accelerated CSS filter pipeline combined with an **SVG 3×3 high-pass convolution kernel** (`feConvolveMatrix`) for architectural clarity and terracotta roof sharpness.
- Five curated presets (**Venice Tour Signature**, **Vivid Emerald**, **Venetian Sunset**, **True-to-Life Crisp**, and **Raw Satellite**) plus fine-tune sliders for Brightness, Contrast, Saturation, Clarity, Warmth, Vibrance, Highlights, and Shadows.
- **Hold to Compare Raw View** button to instantaneously A/B compare calibrated imagery against untouched satellite tiles.
- Settings persist locally in `localStorage` with one-click JSON export.

![VeniceMap Color Grading and Calibration Drawer](docs/screenshots/04-map-calibration-drawer.png)

---

### 4. Zero-Upload Local Folder EXIF GPS Importer
- Drop or select any local photo folder (`JPEG`, `JPG`, `PNG`, `HEIC`, `WebP`) directly from your computer.
- Extracts embedded camera EXIF GPS coordinates entirely client-side using `exifr` with **zero server uploads** — your personal travel photos never leave your device.
- Non-blocking batch parsing using `scheduler.yield()` keeps UI input responsive during large folder imports, with automatic `URL.revokeObjectURL()` memory cleanup.

![VeniceMap Zero-Upload Local Folder EXIF Importer](docs/screenshots/05-local-folder-exif-import.png)

---

### 5. Password-Protected Client-Side API Key Vault
- Built specifically for static hosting (GitHub Pages) where you want to showcase a Google Maps 3D project without exposing your API key or quota to public visitors.
- At build time, Vite encrypts the Google Maps API key using **PBKDF2-SHA256 (600,000 iterations)** and **AES-256-GCM** with a random salt and IV, stripping the raw key from the bundle.
- Public visitors see a neutral locked gray screen with **zero Google Maps API calls**.
- Clicking the top-right **Key** button opens the Owner Unlock modal, which decrypts the key in-browser using the native **Web Crypto API** (`window.crypto.subtle`) and mounts the 3D map immediately.

---

## 🏗️ Architecture & Security Flow

```mermaid
flowchart LR
    subgraph CI ["Build Time (GitHub Actions / Vite)"]
        S1["GOOGLE_MAPS_API_KEY"] --> ENC["PBKDF2-SHA256 (600k) + AES-256-GCM"]
        S2["UNLOCK_PASSWORD"] --> ENC
        ENC --> BUNDLE["Static Bundle (Ciphertext Only)"]
    end

    subgraph BROWSER ["Client Browser (GitHub Pages)"]
        BUNDLE --> GATE{"Unlocked?"}
        GATE -- "No (Public Visitor)" --> GRAY["Locked Gray Screen (0 Maps Requests)"]
        GATE -- "Owner Key Button + Password" --> DEC["Web Crypto API Decrypt"]
        DEC --> MAP["Google Maps 3D + Geodetic Markers"]
        EXIF["Local PC Folder (exifr)"] --> MAP
        GRADE["GPU CSS + SVG Clarity Kernel"] --> MAP
    end
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 19 + TypeScript | Component architecture with lazy-loaded drawers/modals |
| **3D Mapping** | `@vis.gl/react-google-maps` (`maps3d`) | Photorealistic 3D tiles, geodetic `Marker3D`, camera orbits |
| **Styling** | Tailwind CSS v4 + Lucide Icons | Glassmorphic lagoon-emerald UI & editorial typography |
| **EXIF Parsing** | `exifr` | 100% client-side GPS metadata extraction from local photos |
| **Cryptography** | Node `crypto` + Browser Web Crypto API | Build-time AES-256-GCM encryption & runtime decryption |
| **Build & Deploy** | Vite 8 + GitHub Actions | Optimized manual chunking and automated GitHub Pages CI/CD |

---

## 🚀 Local Development

### Prerequisites
- Node.js `>= 20`
- A Google Cloud project with **Maps JavaScript API** and **Map Tiles API** enabled

### Setup
```bash
git clone https://github.com/talmalek/VeniceMap.git
cd VeniceMap
npm install
```

Create a local `.env` file (gitignored):
```env
GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
UNLOCK_PASSWORD="YOUR_STRONG_PASSWORD"
```

Run the development server:
```bash
npm run dev
```

Or build and preview the production bundle (with the encrypted vault active):
```bash
npm run build
npm run preview
```

---

## 🌐 Deploying Your Own Copy on GitHub Pages

1. Fork or clone this repository and enable **GitHub Pages** (**Settings → Pages → Source: GitHub Actions**).
2. Add two repository secrets in **Settings → Secrets and variables → Actions**:
   - `GOOGLE_MAPS_API_KEY` — Your Google Maps Platform API key
   - `UNLOCK_PASSWORD` — Your personal unlock password
3. In Google Cloud Console, restrict your API key by **HTTP Referrer** (`https://<your-username>.github.io/VeniceMap/*`) and restrict APIs to **Maps JavaScript API** and **Map Tiles API**.
4. Push to `main` (or trigger **Actions → Deploy to GitHub Pages**).

---

## 📄 License

Licensed under the Apache-2.0 License.
