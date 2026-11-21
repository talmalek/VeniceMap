/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useEffect, useCallback, lazy, Suspense} from 'react';
import {APIProvider} from '@vis.gl/react-google-maps';
import {
  GeotaggedPhoto,
  INITIAL_GEOTAGGED_PHOTOS,
  computeViewportCoverZoom,
} from './data/veniceData';
import {Globe3DLayer, Globe3DLayerRef} from './components/Globe3DLayer';
import {CloudFrameOverlay} from './components/CloudFrameOverlay';
import {AlbumParseResult, revokeAlbumObjectUrls} from './utils/exifParser';
import {
  ColorGradingSettings,
  DEFAULT_COLOR_SETTINGS,
} from './types/colorSettings';
import {
  Box,
  FolderOpen,
  Home,
  Images,
  Minus,
  Plus,
  RotateCw,
  Sliders,
} from 'lucide-react';

// Code-split on-demand UI drawers, native modals, and bottom filmstrip out of the initial critical bundle
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const AlbumImportModal = lazy(() => import('./components/AlbumImportModal'));
const AlbumFilmstrip = lazy(() => import('./components/AlbumFilmstrip'));

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const COLOR_STORAGE_KEY = 'venice_globe_color_grading_v2';

export default function App() {
  const globeRef = React.useRef<Globe3DLayerRef | null>(null);

  // Zoom progress drives the Explore Venice logo glide into the upper-left corner (0 = overview, 1 = zoomed in)
  const [zoomProgress, setZoomProgress] = useState<number>(0);

  // Tier 1 & Tier 2 Quota Exceeded State
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Compute initial cover zoom so Venice fills the screen
  const [coverZoom, setCoverZoom] = useState<number>(() =>
    typeof window !== 'undefined'
      ? computeViewportCoverZoom(window.innerWidth, window.innerHeight)
      : 14.15
  );

  // Color & Clarity Calibration Settings (persisted to localStorage)
  const [colorSettings, setColorSettings] = useState<ColorGradingSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(COLOR_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.brightness && parsed.contrast && parsed.saturation !== undefined) {
            return parsed;
          }
        }
      } catch {
        // Fallback to default
      }
    }
    return DEFAULT_COLOR_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  const handleColorSettingsChange = useCallback((newSettings: ColorGradingSettings) => {
    setColorSettings(newSettings);
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // Storage unavailable
    }
  }, []);

  const resetColorSettings = useCallback(() => {
    handleColorSettingsChange(DEFAULT_COLOR_SETTINGS);
  }, [handleColorSettingsChange]);

  // 3D Tilt state (synced with globeRef)
  const [is3DActive, setIs3DActive] = useState<boolean>(false);

  // Album & Geotagged Photos State (local client-side only, zero server uploads)
  const [isAlbumActive, setIsAlbumActive] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  // Keep native <dialog> mounted after first open so top-layer exit transitions animate smoothly
  const [hasOpenedImportModal, setHasOpenedImportModal] = useState<boolean>(false);
  const [albumPhotos, setAlbumPhotos] = useState<GeotaggedPhoto[]>(INITIAL_GEOTAGGED_PHOTOS);
  const [albumTitle, setAlbumTitle] = useState<string>('Top 20 Venice Attractions');
  const [hasCustomAlbumLoaded, setHasCustomAlbumLoaded] = useState<boolean>(false);

  const [selectedPhoto, setSelectedPhoto] = useState<GeotaggedPhoto | null>(null);
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);

  const albumPhotosRef = React.useRef<GeotaggedPhoto[]>(albumPhotos);
  useEffect(() => {
    albumPhotosRef.current = albumPhotos;
  }, [albumPhotos]);

  // Release any local Object URLs when unmounting the app
  useEffect(() => {
    return () => {
      revokeAlbumObjectUrls(albumPhotosRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const nextCover = computeViewportCoverZoom(window.innerWidth, window.innerHeight);
      setCoverZoom(nextCover);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openImportModal = useCallback(() => {
    setHasOpenedImportModal(true);
    setIsImportModalOpen(true);
  }, []);

  const closeImportModal = useCallback(() => {
    setIsImportModalOpen(false);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleExploreClick = useCallback(() => {
    globeRef.current?.exploreIn();
  }, []);

  const handleResetHome = useCallback(() => {
    globeRef.current?.stopOrbit();
    setSelectedPhoto(null);
    globeRef.current?.resetHome();
  }, []);

  const handleFlyToSpot = useCallback((lat: number, lng: number, range: number = 900) => {
    globeRef.current?.flyToLocation(lat, lng, range);
  }, []);

  const handleToggleTilt = useCallback(() => {
    const isNow3D = globeRef.current?.toggleTilt() ?? false;
    setIs3DActive(isNow3D);
  }, []);

  // Clicking a photo in the filmstrip or a pin on the map zooms in slowly and orbits endlessly
  const handleSelectPhoto = useCallback((photo: GeotaggedPhoto | null) => {
    setSelectedPhoto(photo);
    if (photo && photo.lat && photo.lng) {
      globeRef.current?.flyToLocationAndOrbit(photo.lat, photo.lng, 440, 62);
    } else {
      globeRef.current?.stopOrbit();
    }
  }, []);

  const handleCloseFilmstrip = useCallback(() => {
    globeRef.current?.stopOrbit();
    setIsAlbumActive(false);
    setSelectedPhoto(null);
  }, []);

  // Toggle "Show Album on Map"
  const handleToggleAlbum = useCallback(() => {
    if (isAlbumActive) {
      globeRef.current?.stopOrbit();
      setIsAlbumActive(false);
      setSelectedPhoto(null);
    } else {
      if (!hasCustomAlbumLoaded && albumPhotos.length === 0) {
        openImportModal();
      } else {
        setSelectedPhoto(null);
        setIsAlbumActive(true);
      }
    }
  }, [isAlbumActive, hasCustomAlbumLoaded, albumPhotos.length, openImportModal]);

  const handleAlbumLoaded = useCallback((result: AlbumParseResult) => {
    globeRef.current?.stopOrbit();
    setAlbumPhotos((prev) => {
      revokeAlbumObjectUrls(prev);
      return result.photos;
    });
    setAlbumTitle(result.albumTitle);
    setHasCustomAlbumLoaded(true);
    setSelectedPhoto(null);
    setIsAlbumActive(true);
  }, []);

  const handleLoadSampleAlbum = useCallback(() => {
    globeRef.current?.stopOrbit();
    setAlbumPhotos((prev) => {
      revokeAlbumObjectUrls(prev);
      return INITIAL_GEOTAGGED_PHOTOS;
    });
    setAlbumTitle('Top 20 Venice Attractions');
    setHasCustomAlbumLoaded(true);
    setSelectedPhoto(null);
    setIsAlbumActive(true);
  }, []);

  return (
    <APIProvider
      apiKey={MAPS_API_KEY}
      libraries={['places', 'marker', 'maps', 'core', 'maps3d']}
    >
      <div className="relative w-screen h-screen overflow-hidden bg-[#061E19] text-white select-none">
        {/* Mandatory Google Maps Demo Key Quota Banner */}
        {quotaExceeded && (
          <div className="bg-[#0B2E26] border-b border-[#E6B86A]/40 text-white px-4 py-2 text-xs md:text-sm text-center fixed top-0 left-0 right-0 z-50">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-[#E6B86A] hover:text-[#F5CF8B]"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Main Stage: Full-Viewport 3D Photorealistic Venice Buildings Globe */}
        <main className="w-full h-full relative">
          <Globe3DLayer
            ref={globeRef}
            initialZoom={coverZoom}
            showLocations={isAlbumActive}
            photos={albumPhotos}
            selectedPhoto={selectedPhoto}
            hoveredPhotoId={hoveredPhotoId}
            colorSettings={colorSettings}
            isComparing={isComparing}
            onTiltChange={setIs3DActive}
            onZoomProgressChange={setZoomProgress}
            onSelectPhoto={handleSelectPhoto}
            onHoverPhoto={setHoveredPhotoId}
          />

          {/* Explore Venice Brush Hero, White Vector Map & Dynamic Upper-Left Logo Glide */}
          <CloudFrameOverlay
            zoomProgress={zoomProgress}
            isAlbumActive={isAlbumActive}
            onExploreClick={handleExploreClick}
            onResetHomeClick={handleResetHome}
            onFlyToSpot={handleFlyToSpot}
            onOpenAlbumClick={handleToggleAlbum}
          />

          {/* Minimalist Editorial Top Navigation Bar (Matching Reference Centered Typography) */}
          <header className="fixed top-0 inset-x-0 z-30 pointer-events-none pl-28 pr-14 sm:px-8 py-5 flex items-center justify-center">
            <nav
              aria-label="Primary Venice navigation"
              className="pointer-events-auto flex items-center gap-4 sm:gap-8 text-xs sm:text-[13px] font-medium tracking-[0.04em] text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]"
            >
              <button
                type="button"
                onClick={handleResetHome}
                className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6B86A] ${
                  zoomProgress < 0.15 && !isAlbumActive
                    ? 'text-white border-[#E6B86A]'
                    : 'text-white/80 border-transparent hover:text-white hover:border-white/50'
                }`}
              >
                Overview
              </button>

              <button
                type="button"
                onClick={handleExploreClick}
                className={`hidden sm:inline-block py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6B86A] ${
                  zoomProgress >= 0.15 && !isAlbumActive
                    ? 'text-white border-[#E6B86A]'
                    : 'text-white/80 border-transparent hover:text-white hover:border-white/50'
                }`}
              >
                Explore 3D
              </button>

              <button
                type="button"
                onClick={handleToggleAlbum}
                className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6B86A] ${
                  isAlbumActive
                    ? 'text-[#E6B86A] border-[#E6B86A]'
                    : 'text-white/80 border-transparent hover:text-white hover:border-white/50'
                }`}
                title={
                  isAlbumActive
                    ? 'Hide Album from Map (Return to Regular Map)'
                    : 'Show Album on Map (From Local PC Folder · Zero Upload)'
                }
              >
                {isAlbumActive ? 'Hide Album' : 'Show Album'}
              </button>

              <button
                type="button"
                onClick={openImportModal}
                className="py-1 text-white/80 border-b-2 border-transparent hover:text-white hover:border-white/50 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6B86A]"
                title="Open Local PC Folder (Files stay on your computer)"
              >
                Local Folder
              </button>

              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`hidden md:inline-block py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6B86A] ${
                  isSettingsOpen
                    ? 'text-[#E6B86A] border-[#E6B86A]'
                    : 'text-white/80 border-transparent hover:text-white hover:border-white/50'
                }`}
              >
                Calibration
              </button>
            </nav>
          </header>

          {/* Code-Split On-Demand UI: Filmstrip, Native Top-Layer Folder Dialog & Calibration Drawer */}
          <Suspense fallback={null}>
            {isAlbumActive && (
              <AlbumFilmstrip
                isOpen={isAlbumActive}
                albumTitle={albumTitle}
                photos={albumPhotos}
                selectedPhoto={selectedPhoto}
                hoveredPhotoId={hoveredPhotoId}
                onSelectPhoto={handleSelectPhoto}
                onHoverPhoto={setHoveredPhotoId}
                onOpenImportModal={openImportModal}
                onCloseFilmstrip={handleCloseFilmstrip}
              />
            )}

            {(hasOpenedImportModal || isImportModalOpen) && (
              <AlbumImportModal
                isOpen={isImportModalOpen}
                onClose={closeImportModal}
                onAlbumLoaded={handleAlbumLoaded}
                onLoadSampleAlbum={handleLoadSampleAlbum}
                currentAlbumTitle={albumTitle}
                photoCount={albumPhotos.length}
              />
            )}

            {isSettingsOpen && (
              <SettingsModal
                isOpen={isSettingsOpen}
                onClose={closeSettingsModal}
                settings={colorSettings}
                onChange={handleColorSettingsChange}
                onReset={resetColorSettings}
                isComparing={isComparing}
                setIsComparing={setIsComparing}
              />
            )}
          </Suspense>

          {/* Right-Side Sleek Lagoon Emerald Camera & Utility Dock */}
          <div className="fixed top-4 right-4 z-30 flex flex-col items-center gap-2.5">
            {/* Group 1: Home, Album & Local Folder */}
            <div className="venice-glass rounded-xl p-1 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={handleResetHome}
                title="Home View (Overview of Venice)"
                aria-label="Home View (Overview of Venice)"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/12 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <Home className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleAlbum}
                title={
                  isAlbumActive
                    ? 'Hide Album from Map (Return to Regular Map)'
                    : 'Show Album on Map (From Local PC Folder · Zero Upload)'
                }
                aria-label="Toggle Album on Map"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                  isAlbumActive
                    ? 'venice-gold-btn'
                    : 'text-white/80 hover:bg-white/12 hover:text-white'
                }`}
              >
                <Images className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={openImportModal}
                title="Choose Local PC Folder (Files stay on your computer)"
                aria-label="Choose Local PC Folder"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/12 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>

            {/* Group 2: 3D Tilt & Rotate */}
            <div className="venice-glass rounded-xl p-1 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={handleToggleTilt}
                title={
                  is3DActive
                    ? 'Disable 3D Tilt (Return to Top View)'
                    : 'Enable 3D Perspective Tilt (60° Angle)'
                }
                aria-label="Toggle 3D Tilt"
                className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center font-sans font-bold text-xs tracking-tight transition-all duration-150 active:scale-95 cursor-pointer ${
                  is3DActive
                    ? 'venice-gold-btn'
                    : 'text-white/85 hover:bg-white/12 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[9px] leading-none">3D</span>
              </button>

              {is3DActive && (
                <button
                  type="button"
                  onClick={() => globeRef.current?.rotate45()}
                  title="Rotate Camera 45°"
                  aria-label="Rotate Camera 45 degrees"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/12 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Group 3: Zoom In / Out & Calibration */}
            <div className="venice-glass rounded-xl p-1 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => globeRef.current?.zoomIn()}
                title="Zoom in"
                aria-label="Zoom in"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white/85 hover:bg-white/12 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => globeRef.current?.zoomOut()}
                title="Zoom out"
                aria-label="Zoom out"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white/85 hover:bg-white/12 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="w-5 h-px bg-white/15 my-0.5" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                title="Map Calibration (Tone, Warmth & Clarity)"
                aria-label="Map Calibration"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                  isSettingsOpen
                    ? 'venice-gold-btn'
                    : 'text-[#E6B86A] hover:bg-white/12 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </APIProvider>
  );
}
