/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense} from 'react';
import {APIProvider} from '@vis.gl/react-google-maps';
import {
  GeotaggedPhoto,
  INITIAL_GEOTAGGED_PHOTOS,
  computeViewportCoverZoom,
} from './data/veniceData';
import {Globe3DLayer, Globe3DLayerRef} from './components/Globe3DLayer';
import {CloudFrameOverlay} from './components/CloudFrameOverlay';
import {
  RouteTimelineOverlay,
  PlaybackSpeed,
} from './components/RouteTimelineOverlay';
import {AlbumParseResult, revokeAlbumObjectUrls} from './utils/exifParser';
import {
  ParsedRouteData,
  RoutePoint,
  parseRouteJson,
  parseRouteObject,
  getRouteProgressAtTime,
} from './utils/routeParser';
import {
  ColorGradingSettings,
  DEFAULT_COLOR_SETTINGS,
} from './types/colorSettings';
import {
  Box,
  FolderOpen,
  Home,
  Images,
  Key,
  Lock,
  Minus,
  Plus,
  RotateCw,
  Route,
  Sliders,
  AlertCircle,
  Check,
  Unlock,
  X,
} from 'lucide-react';
import {decryptApiKey} from './utils/cryptoKey';

// Code-split on-demand UI drawers, native modals, and bottom filmstrip out of the initial critical bundle
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const AlbumImportModal = lazy(() => import('./components/AlbumImportModal'));
const AlbumFilmstrip = lazy(() => import('./components/AlbumFilmstrip'));
const RouteCalibrationModal = lazy(() => import('./components/RouteCalibrationModal'));

const API_KEY_STORAGE_KEY = 'venice_maps_api_key';
const ENCRYPTED_MAPS_KEY = (import.meta.env.VITE_ENCRYPTED_MAPS_KEY || '').trim();

const getStoredApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const sessionKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);
    if (sessionKey && sessionKey.trim()) return sessionKey.trim();
    const localKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (localKey && localKey.trim()) return localKey.trim();
  } catch {
    // Ignore storage errors
  }
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
};

const COLOR_STORAGE_KEY = 'venice_globe_color_grading_v2';

export default function App() {
  const globeRef = React.useRef<Globe3DLayerRef | null>(null);

  // Google Maps Platform API Key & Password Unlock state
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [rememberDevice, setRememberDevice] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string>('');
  const [showManualKey, setShowManualKey] = useState<boolean>(() => !ENCRYPTED_MAPS_KEY);
  const [inputKey, setInputKey] = useState<string>('');
  const [authFailed, setAuthFailed] = useState<boolean>(false);

  useEffect(() => {
    // Catch Google Maps Platform authentication failures
    (window as unknown as {gm_authFailure?: () => void}).gm_authFailure = () => {
      setAuthFailed(true);
      setShowApiKeyModal(true);
    };
  }, []);

  const handleUnlockWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    if (!ENCRYPTED_MAPS_KEY) {
      setUnlockError('No encrypted API key is configured in this build.');
      return;
    }

    setIsDecrypting(true);
    setUnlockError('');
    try {
      const decrypted = await decryptApiKey(ENCRYPTED_MAPS_KEY, passwordInput);
      try {
        if (rememberDevice) {
          localStorage.setItem(API_KEY_STORAGE_KEY, decrypted);
          sessionStorage.removeItem(API_KEY_STORAGE_KEY);
        } else {
          sessionStorage.setItem(API_KEY_STORAGE_KEY, decrypted);
          localStorage.removeItem(API_KEY_STORAGE_KEY);
        }
      } catch {
        // Storage unavailable; keep in memory
      }
      setApiKey(decrypted);
      setPasswordInput('');
      setAuthFailed(false);
      setShowApiKeyModal(false);
    } catch {
      setUnlockError('Incorrect password. Access denied.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleSaveManualKey = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputKey.trim();
    if (!clean) return;
    try {
      if (rememberDevice) {
        localStorage.setItem(API_KEY_STORAGE_KEY, clean);
        sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      } else {
        sessionStorage.setItem(API_KEY_STORAGE_KEY, clean);
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch {}
    setApiKey(clean);
    setInputKey('');
    setAuthFailed(false);
    setShowApiKeyModal(false);
  };

  const handleClearApiKey = () => {
    try {
      sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch {}
    setApiKey('');
    setInputKey('');
    setPasswordInput('');
    setAuthFailed(false);
    setShowApiKeyModal(false);
    window.location.reload();
  };

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

  // Google Maps Route Timeline State (strictly filtered to Venice map bounds)
  const routeFileInputRef = useRef<HTMLInputElement | null>(null);
  const [routeData, setRouteData] = useState<ParsedRouteData | null>(null);
  const [originalRoutePoints, setOriginalRoutePoints] = useState<RoutePoint[]>([]);
  const [isSampleRoute, setIsSampleRoute] = useState<boolean>(false);
  const [isRouteCalibrationOpen, setIsRouteCalibrationOpen] = useState<boolean>(false);
  const [routeCurrentTimeMs, setRouteCurrentTimeMs] = useState<number>(0);
  const [isRoutePlaying, setIsRoutePlaying] = useState<boolean>(false);
  const [routeSpeed, setRouteSpeed] = useState<PlaybackSpeed>(1);
  const [followRouteCamera, setFollowRouteCamera] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string>('');

  const handleTriggerRouteFilePicker = useCallback(() => {
    setRouteError('');
    routeFileInputRef.current?.click();
  }, []);

  const handleLoadSampleRoute = useCallback(async () => {
    try {
      const mod = await import('./data/veniceSampleRoute.json');
      const parsed = parseRouteObject(mod.default, 'Venice Route · 24/09/2026');
      setRouteError('');
      setIsRoutePlaying(false);
      setFollowRouteCamera(false);
      setIsRouteCalibrationOpen(false);
      setRouteData(parsed);
      setOriginalRoutePoints(parsed.points);
      setIsSampleRoute(true);
      setRouteCurrentTimeMs(parsed.startTimeMs);
    } catch (err) {
      setRouteError(
        err instanceof Error ? err.message : 'Failed to load embedded Venice sample route.'
      );
    }
  }, []);

  const handleRouteFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = parseRouteJson(text, file.name);
        setRouteError('');
        setIsRoutePlaying(false);
        setFollowRouteCamera(false);
        setIsRouteCalibrationOpen(false);
        setRouteData(parsed);
        setOriginalRoutePoints(parsed.points);
        setIsSampleRoute(false);
        setRouteCurrentTimeMs(parsed.startTimeMs);
      } catch (err) {
        setRouteError(
          err instanceof Error ? err.message : 'Failed to load route JSON file.'
        );
      }
    },
    []
  );

  const handleOpenRouteCalibration = useCallback(() => {
    if (!routeData) return;
    setIsRoutePlaying(false);
    setIsSettingsOpen(false);
    setIsRouteCalibrationOpen(true);
  }, [routeData]);

  const handleApplyCalibratedRoute = useCallback((updatedRoute: ParsedRouteData) => {
    setRouteData(updatedRoute);
    setRouteCurrentTimeMs((prev) =>
      Math.min(
        updatedRoute.endTimeMs,
        Math.max(updatedRoute.startTimeMs, prev)
      )
    );
  }, []);

  // Smooth requestAnimationFrame timeline playback loop
  useEffect(() => {
    if (!isRoutePlaying || !routeData) return;

    const totalDuration = Math.max(1, routeData.endTimeMs - routeData.startTimeMs);
    const BASE_PLAYBACK_SECONDS = 45;
    const msPerRealSecond = (totalDuration / BASE_PLAYBACK_SECONDS) * routeSpeed;

    let rafId: number | null = null;
    let lastFrameTime = performance.now();

    const tick = (now: number) => {
      const dtSec = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      let reachedEnd = false;
      setRouteCurrentTimeMs((prev) => {
        const next = prev + dtSec * msPerRealSecond;
        if (next >= routeData.endTimeMs) {
          reachedEnd = true;
          return routeData.endTimeMs;
        }
        return next;
      });

      if (reachedEnd) {
        setIsRoutePlaying(false);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isRoutePlaying, routeData, routeSpeed]);

  const handleToggleRoutePlay = useCallback(() => {
    if (!routeData) return;
    setIsRoutePlaying((playing) => {
      if (!playing && routeCurrentTimeMs >= routeData.endTimeMs) {
        setRouteCurrentTimeMs(routeData.startTimeMs);
      }
      return !playing;
    });
  }, [routeData, routeCurrentTimeMs]);

  const handleSeekRoute = useCallback((timeMs: number) => {
    setRouteCurrentTimeMs(timeMs);
  }, []);

  const handleRestartRoute = useCallback(() => {
    if (!routeData) return;
    setRouteCurrentTimeMs(routeData.startTimeMs);
  }, [routeData]);

  const handleCloseRoute = useCallback(() => {
    setIsRoutePlaying(false);
    setFollowRouteCamera(false);
    setIsRouteCalibrationOpen(false);
    setRouteData(null);
    setOriginalRoutePoints([]);
    setIsSampleRoute(false);
    setRouteCurrentTimeMs(0);
    setRouteError('');
  }, []);

  const handleToggleRoute = useCallback(() => {
    if (routeData) {
      handleCloseRoute();
    } else {
      void handleLoadSampleRoute();
    }
  }, [routeData, handleCloseRoute, handleLoadSampleRoute]);

  const routeSnapshot = useMemo(() => {
    if (!routeData) return null;
    return getRouteProgressAtTime(routeData, routeCurrentTimeMs);
  }, [routeData, routeCurrentTimeMs]);

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

  const handleRemovePhoto = useCallback((photoId: string) => {
    setAlbumPhotos((prev) => {
      const removed = prev.find((p) => p.id === photoId);
      if (removed && removed.imageUrl && removed.imageUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(removed.imageUrl);
        } catch {}
      }
      return prev.filter((p) => p.id !== photoId);
    });

    setSelectedPhoto((current) => {
      if (current?.id === photoId) {
        globeRef.current?.stopOrbit();
        return null;
      }
      return current;
    });

    setHoveredPhotoId((current) => (current === photoId ? null : current));
  }, []);

  const mainStage = (
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
          routePath={routeSnapshot?.path}
          routeHead={routeSnapshot?.head ?? null}
          followRouteHead={followRouteCamera}
          onTiltChange={setIs3DActive}
          onZoomProgressChange={setZoomProgress}
          onSelectPhoto={handleSelectPhoto}
          onHoverPhoto={setHoveredPhotoId}
        />

        {/* Hidden JSON File Input for Google Maps Location Route POC */}
        <input
          ref={routeFileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleRouteFileSelected}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Explore Venice Brush Hero, White Vector Map & Dynamic Upper-Left Logo Glide */}
        <CloudFrameOverlay
          zoomProgress={zoomProgress}
          isAlbumActive={isAlbumActive}
          isRouteActive={Boolean(routeData)}
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
                zoomProgress < 0.15 && !isAlbumActive && !routeData
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
                zoomProgress >= 0.15 && !isAlbumActive && !routeData
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
              onClick={handleToggleRoute}
              className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF8C2A] ${
                routeData
                  ? 'text-[#FFB35C] border-[#FF7A18]'
                  : 'text-white/80 border-transparent hover:text-white hover:border-white/50'
              }`}
              title={
                routeData
                  ? 'Hide Route Timeline from Map'
                  : 'Show Venice 24/09/2026 Route Example (or load your own JSON)'
              }
            >
              {routeData ? 'Hide Route' : 'Show Route'}
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
              onRemovePhoto={handleRemovePhoto}
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
              apiKey={apiKey}
              onOpenApiKeyModal={() => {
                setInputKey(apiKey);
                setShowApiKeyModal(true);
              }}
              hasLoadedRoute={Boolean(routeData)}
              routePointCount={routeData?.points.length ?? 0}
              onOpenRouteCalibration={handleOpenRouteCalibration}
              onLoadSampleRoute={() => {
                setIsSettingsOpen(false);
                void handleLoadSampleRoute();
              }}
              onLoadRouteJson={() => {
                setIsSettingsOpen(false);
                handleTriggerRouteFilePicker();
              }}
            />
          )}

          {isRouteCalibrationOpen && routeData && (
            <RouteCalibrationModal
              isOpen={isRouteCalibrationOpen}
              route={routeData}
              originalPoints={originalRoutePoints}
              apiKey={apiKey}
              onApply={handleApplyCalibratedRoute}
              onClose={() => setIsRouteCalibrationOpen(false)}
            />
          )}
        </Suspense>

        {/* Semi-Transparent Route Playback Timeline Overlay */}
        {routeData && routeSnapshot && !isRouteCalibrationOpen && (
          <RouteTimelineOverlay
            route={routeData}
            currentTimeMs={routeCurrentTimeMs}
            distanceMeters={routeSnapshot.distanceMeters}
            isPlaying={isRoutePlaying}
            speed={routeSpeed}
            followCamera={followRouteCamera}
            isAlbumActive={isAlbumActive}
            isSampleRoute={isSampleRoute}
            onTogglePlay={handleToggleRoutePlay}
            onSeek={handleSeekRoute}
            onRestart={handleRestartRoute}
            onSpeedChange={setRouteSpeed}
            onToggleFollowCamera={() => setFollowRouteCamera((prev) => !prev)}
            onOpenCalibration={handleOpenRouteCalibration}
            onLoadSampleRoute={() => void handleLoadSampleRoute()}
            onLoadAnother={handleTriggerRouteFilePicker}
            onClose={handleCloseRoute}
          />
        )}

        {/* Route JSON Load Error Toast */}
        {routeError && (
          <div
            role="alert"
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-md px-4 py-2.5 rounded-xl bg-red-950/90 border border-red-500/50 text-red-100 text-xs shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{routeError}</span>
            <button
              type="button"
              onClick={() => setRouteError('')}
              aria-label="Dismiss error"
              className="ml-1 p-1 rounded hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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

              <button
                type="button"
                onClick={handleToggleRoute}
                title={
                  routeData
                    ? `Hide Route Timeline (${routeData.points.length} pts)`
                    : 'Show Venice 24/09/2026 Example Route'
                }
                aria-label="Toggle Route Timeline on Map"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                  routeData
                    ? 'bg-[#FF7A18]/25 border border-[#FF8C2A]/75 text-[#FF7A18] shadow-[0_0_16px_rgba(255,105,20,0.45)]'
                    : 'text-white/80 hover:bg-white/12 hover:text-white'
                }`}
              >
                <Route className="w-4 h-4" />
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

              <button
                type="button"
                onClick={() => {
                  setUnlockError('');
                  setShowApiKeyModal(true);
                }}
                title="Owner Key Access (Lock / Manage API Key)"
                aria-label="Owner Key Access"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-300/90 hover:bg-white/12 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <Key className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
  );

  const lockedGrayScreen = (
    <div className="relative w-screen h-screen overflow-hidden bg-[#2b2d30] text-neutral-300 select-none flex flex-col items-center justify-center p-6">
      {/* Small Key Button in Top-Right Corner */}
      <button
        type="button"
        onClick={() => {
          setUnlockError('');
          setPasswordInput('');
          setShowApiKeyModal(true);
        }}
        title="Unlock Google Maps with Password"
        aria-label="Unlock Google Maps"
        className="fixed top-4 right-4 z-40 w-9 h-9 rounded-lg bg-neutral-700/80 hover:bg-neutral-600 border border-neutral-500/40 text-neutral-200 hover:text-white flex items-center justify-center shadow-lg transition-all duration-150 active:scale-95 cursor-pointer"
      >
        <Key className="w-4 h-4" />
      </button>

      {/* Gray Locked Notice */}
      <div className="max-w-sm text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-neutral-700/70 border border-neutral-600 flex items-center justify-center text-neutral-400">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="text-base font-semibold text-neutral-200">
          Google Maps Unavailable
        </h1>
        <p className="text-xs text-neutral-400 leading-relaxed">
          This page can&apos;t load Google Maps without an authorized API key.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {apiKey ? (
        <APIProvider
          apiKey={apiKey}
          libraries={['places', 'marker', 'maps', 'core', 'maps3d', 'routes']}
        >
          {mainStage}
        </APIProvider>
      ) : (
        lockedGrayScreen
      )}

      {/* Owner Password / API Key Unlock Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-text">
          <div className="w-full max-w-sm rounded-2xl venice-glass-strong border border-[#E6B86A]/40 p-6 shadow-2xl text-white relative">
            <button
              type="button"
              onClick={() => setShowApiKeyModal(false)}
              aria-label="Close"
              className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pr-6">
              <div className="w-10 h-10 rounded-xl bg-[#E6B86A]/20 border border-[#E6B86A]/50 flex items-center justify-center text-[#E6B86A] shrink-0">
                {apiKey ? <Unlock className="w-5 h-5" /> : <Key className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  {apiKey ? 'Maps Unlocked' : 'Owner Unlock'}
                </h2>
                <p className="text-xs text-white/70">
                  {apiKey
                    ? 'Google Maps 3D session is active'
                    : 'Enter password to decrypt Maps API key'}
                </p>
              </div>
            </div>

            {authFailed && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/50 flex items-start gap-2 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  Google Maps rejected this API key. Verify Maps JavaScript API and Map Tiles API are enabled.
                </span>
              </div>
            )}

            {unlockError && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-950/70 border border-red-500/50 flex items-center gap-2 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            {apiKey && !authFailed ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80 flex items-center justify-between">
                  <span>Active Key</span>
                  <span className="font-mono text-[#E6B86A]">
                    {apiKey.slice(0, 6)}••••••••
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  className="w-full py-2.5 px-4 bg-red-900/50 hover:bg-red-900/70 text-red-100 border border-red-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock &amp; Clear Key</span>
                </button>
              </div>
            ) : !showManualKey && ENCRYPTED_MAPS_KEY ? (
              <form onSubmit={handleUnlockWithPassword} className="space-y-3.5">
                <div>
                  <label htmlFor="owner-password-input" className="block text-xs font-medium text-white/90 mb-1">
                    Password
                  </label>
                  <input
                    id="owner-password-input"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your unlock password"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black/50 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E6B86A] text-xs"
                    autoFocus
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-white/75 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="rounded border-white/30 bg-black/40 accent-[#E6B86A]"
                  />
                  <span>Remember on this browser</span>
                </label>

                <button
                  type="submit"
                  disabled={isDecrypting || !passwordInput}
                  className="w-full py-2.5 px-4 venice-gold-btn rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isDecrypting ? 'Decrypting...' : 'Unlock Maps'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowManualKey(true);
                    setUnlockError('');
                  }}
                  className="w-full text-center text-[11px] text-white/55 hover:text-white/90 underline cursor-pointer pt-1"
                >
                  Or enter a manual API key
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveManualKey} className="space-y-3.5">
                {!ENCRYPTED_MAPS_KEY && (
                  <p className="text-[11px] text-amber-200/90 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5">
                    Encrypted vault not configured yet. Set <strong>GOOGLE_MAPS_API_KEY</strong> and <strong>UNLOCK_PASSWORD</strong> in GitHub Actions Secrets, or enter a key manually below.
                  </p>
                )}

                <div>
                  <label htmlFor="maps-key-input" className="block text-xs font-medium text-white/90 mb-1">
                    Google Maps API Key
                  </label>
                  <input
                    id="maps-key-input"
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black/50 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E6B86A] text-xs font-mono"
                    autoFocus
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-white/75 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="rounded border-white/30 bg-black/40 accent-[#E6B86A]"
                  />
                  <span>Remember on this browser</span>
                </label>

                <button
                  type="submit"
                  disabled={!inputKey.trim()}
                  className="w-full py-2.5 px-4 venice-gold-btn rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Load Maps</span>
                </button>

                {ENCRYPTED_MAPS_KEY && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualKey(false);
                      setUnlockError('');
                    }}
                    className="w-full text-center text-[11px] text-white/55 hover:text-white/90 underline cursor-pointer pt-1"
                  >
                    Back to password unlock
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
