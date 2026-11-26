import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {Map as GoogleMap2D, useMap} from '@vis.gl/react-google-maps';
import {
  Check,
  Download,
  Loader2,
  MapPin,
  RotateCcw,
  Route,
  Sparkles,
  Undo2,
  Wand2,
  X,
  AlertCircle,
  Layers,
} from 'lucide-react';
import {
  VENICE_CENTER,
  VENICE_HOME_GUARD_RAILS,
} from '../data/veniceData';
import {ParsedRouteData, RoutePoint} from '../utils/routeParser';
import {
  cleanGpsErrors,
  exportCalibratedRouteJson,
  rebuildRoutePoints,
  snapRouteWithGoogleRoadsApi,
  snapRouteWithGoogleWalking,
} from '../utils/routeCalibration';

type SnapMode = 'walking' | 'roads' | 'raw';
type MapTypeOption = 'hybrid' | 'satellite' | 'roadmap';

interface RouteCalibrationModalProps {
  isOpen: boolean;
  route: ParsedRouteData;
  originalPoints: RoutePoint[];
  apiKey: string;
  onApply: (updatedRoute: ParsedRouteData) => void;
  onClose: () => void;
}

interface EditablePolylineBridgeProps {
  points: RoutePoint[];
  originalPoints: RoutePoint[];
  showOriginal: boolean;
  revision: number;
  onManualPathEdit: (coords: Array<{lat: number; lng: number}>) => void;
}

type GoogleMaps2DApi = {
  LatLngBounds: new () => {
    extend: (pt: {lat: number; lng: number}) => void;
  };
  Polyline: new (opts: Record<string, unknown>) => {
    setMap: (map: unknown) => void;
    setPath: (path: Array<{lat: number; lng: number}>) => void;
    getPath: () => {
      getLength: () => number;
      getAt: (idx: number) => {lat: () => number; lng: () => number};
      removeAt: (idx: number) => void;
      addListener: (ev: string, fn: () => void) => {remove: () => void};
    };
    addListener: (
      ev: string,
      fn: (e: {vertex?: number}) => void
    ) => {remove: () => void};
  };
};

const CALIBRATION_MAP_ID = 'venice-route-calibration-map';

/**
 * Imperative bridge attaching native editable Google Maps 2D Polylines to the
 * Satellite/Hybrid calibration map. Supports dragging vertices, inserting midpoints,
 * and right-clicking vertices to delete GPS errors.
 */
const EditablePolylineBridge: React.FC<EditablePolylineBridgeProps> = ({
  points,
  originalPoints,
  showOriginal,
  revision,
  onManualPathEdit,
}) => {
  const map = useMap(CALIBRATION_MAP_ID);
  const onEditRef = useRef(onManualPathEdit);
  useEffect(() => {
    onEditRef.current = onManualPathEdit;
  }, [onManualPathEdit]);

  const hasFitBoundsRef = useRef(false);
  const isSyncingRef = useRef(false);
  const haloPolyRef = useRef<ReturnType<GoogleMaps2DApi['Polyline']['prototype']['getPath']> extends never ? never : InstanceType<GoogleMaps2DApi['Polyline']> | null>(null);
  const editPolyRef = useRef<InstanceType<GoogleMaps2DApi['Polyline']> | null>(null);
  const origPolyRef = useRef<InstanceType<GoogleMaps2DApi['Polyline']> | null>(null);
  const listenersRef = useRef<Array<{remove: () => void}>>([]);

  // Fit bounds once when the 2D map initializes
  useEffect(() => {
    if (!map || hasFitBoundsRef.current || points.length === 0) return;
    const gMaps = (window as unknown as {google?: {maps?: GoogleMaps2DApi}})
      .google?.maps;
    if (!gMaps?.LatLngBounds) return;

    const bounds = new gMaps.LatLngBounds();
    for (const p of points) {
      bounds.extend({lat: p.lat, lng: p.lng});
    }
    (map as unknown as {fitBounds: (b: unknown, pad?: number) => void}).fitBounds(
      bounds,
      56
    );
    hasFitBoundsRef.current = true;
  }, [map, points]);

  // Original raw GPS reference overlay
  useEffect(() => {
    if (!map) return;
    const gMaps = (window as unknown as {google?: {maps?: GoogleMaps2DApi}})
      .google?.maps;
    if (!gMaps?.Polyline) return;

    if (origPolyRef.current) {
      origPolyRef.current.setMap(null);
      origPolyRef.current = null;
    }

    if (showOriginal && originalPoints.length >= 2) {
      origPolyRef.current = new gMaps.Polyline({
        map,
        path: originalPoints.map((p) => ({lat: p.lat, lng: p.lng})),
        strokeColor: '#38BDF8',
        strokeOpacity: 0.55,
        strokeWeight: 3,
        clickable: false,
        editable: false,
        zIndex: 5,
      });
    }

    return () => {
      if (origPolyRef.current) {
        origPolyRef.current.setMap(null);
        origPolyRef.current = null;
      }
    };
  }, [map, showOriginal, originalPoints]);

  // Rebuild editable polyline whenever programmatic revision changes (clean, snap, undo, reset)
  useEffect(() => {
    if (!map) return;
    const gMaps = (window as unknown as {google?: {maps?: GoogleMaps2DApi}})
      .google?.maps;
    if (!gMaps?.Polyline) return;

    const cleanup = () => {
      for (const l of listenersRef.current) {
        try {
          l.remove();
        } catch {}
      }
      listenersRef.current = [];
      haloPolyRef.current?.setMap(null);
      haloPolyRef.current = null;
      editPolyRef.current?.setMap(null);
      editPolyRef.current = null;
    };

    cleanup();

    const coords = points.map((p) => ({lat: p.lat, lng: p.lng}));

    const halo = new gMaps.Polyline({
      map,
      path: coords,
      strokeColor: '#FF4800',
      strokeOpacity: 0.34,
      strokeWeight: 13,
      clickable: false,
      editable: false,
      zIndex: 10,
    });

    const editable = new gMaps.Polyline({
      map,
      path: coords,
      strokeColor: '#FFB35C',
      strokeOpacity: 0.96,
      strokeWeight: 4,
      editable: true,
      draggable: false,
      geodesic: true,
      zIndex: 15,
    });

    haloPolyRef.current = halo;
    editPolyRef.current = editable;

    const mvcPath = editable.getPath();

    const syncFromMvc = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        const len = mvcPath.getLength();
        const nextCoords: Array<{lat: number; lng: number}> = [];
        for (let i = 0; i < len; i++) {
          const pt = mvcPath.getAt(i);
          nextCoords.push({lat: pt.lat(), lng: pt.lng()});
        }
        halo.setPath(nextCoords);
        onEditRef.current(nextCoords);
      } finally {
        isSyncingRef.current = false;
      }
    };

    listenersRef.current.push(
      mvcPath.addListener('set_at', syncFromMvc),
      mvcPath.addListener('insert_at', syncFromMvc),
      mvcPath.addListener('remove_at', syncFromMvc),
      editable.addListener('rightclick', (e) => {
        if (typeof e.vertex === 'number' && mvcPath.getLength() > 2) {
          mvcPath.removeAt(e.vertex);
        }
      })
    );

    return cleanup;
    // Intentionally keyed on `revision` so dragging vertices does not destroy/recreate the active handle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, revision]);

  return null;
};

export const RouteCalibrationModal: React.FC<RouteCalibrationModalProps> = ({
  isOpen,
  route,
  originalPoints,
  apiKey,
  onApply,
  onClose,
}) => {
  const [draftPoints, setDraftPoints] = useState<RoutePoint[]>(route.points);
  const [history, setHistory] = useState<RoutePoint[][]>([]);
  const [revision, setRevision] = useState<number>(0);

  const [mapType, setMapType] = useState<MapTypeOption>('hybrid');
  const [showOriginal, setShowOriginal] = useState<boolean>(true);

  const [maxSpeedKmh, setMaxSpeedKmh] = useState<number>(12);
  const [minSpacingMeters, setMinSpacingMeters] = useState<number>(15);
  const [snapMode, setSnapMode] = useState<SnapMode>('walking');

  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Reset draft whenever modal opens with a route
  useEffect(() => {
    if (isOpen) {
      setDraftPoints(route.points);
      setHistory([]);
      setRevision((r) => r + 1);
      setStatusMessage('');
      setErrorMessage('');
    }
  }, [isOpen, route]);

  const draftDistanceMeters = useMemo(() => {
    if (draftPoints.length === 0) return 0;
    return draftPoints[draftPoints.length - 1].cumulativeDistanceMeters;
  }, [draftPoints]);

  const pushProgrammaticPoints = useCallback((nextPoints: RoutePoint[]) => {
    setDraftPoints((prev) => {
      setHistory((h) => [...h.slice(-19), prev]);
      return nextPoints;
    });
    setRevision((r) => r + 1);
  }, []);

  const handleManualPathEdit = useCallback(
    (coords: Array<{lat: number; lng: number}>) => {
      if (coords.length < 2) return;
      const rebuilt = rebuildRoutePoints(
        coords,
        route.startTimeMs,
        route.endTimeMs
      );
      if (rebuilt.length < 2) return;
      setDraftPoints((prev) => {
        setHistory((h) => [...h.slice(-19), prev]);
        return rebuilt;
      });
      setStatusMessage(`Edited manually (${rebuilt.length} points)`);
      setErrorMessage('');
    },
    [route.startTimeMs, route.endTimeMs]
  );

  const handleCleanErrors = useCallback(() => {
    setErrorMessage('');
    const result = cleanGpsErrors(draftPoints, {
      maxSpeedKmh,
      minSpacingMeters,
    });
    if (result.removedCount === 0) {
      setStatusMessage('No GPS spikes or jitter points found at current thresholds.');
      return;
    }
    pushProgrammaticPoints(result.points);
    setStatusMessage(
      `Removed ${result.removedCount} erroneous/jitter points (${result.points.length} left).`
    );
  }, [draftPoints, maxSpeedKmh, minSpacingMeters, pushProgrammaticPoints]);

  const handleSnapToRoads = useCallback(async () => {
    if (snapMode === 'raw') {
      setStatusMessage('Raw / Direct mode preserves your current path without snapping.');
      return;
    }

    setIsBusy(true);
    setErrorMessage('');
    setStatusMessage('Starting Google Maps snap…');

    try {
      const result =
        snapMode === 'walking'
          ? await snapRouteWithGoogleWalking(draftPoints, setStatusMessage)
          : await snapRouteWithGoogleRoadsApi(draftPoints, apiKey, setStatusMessage);

      if (result.points.length < 2) {
        throw new Error('Snapping returned fewer than 2 valid points inside Venice.');
      }

      pushProgrammaticPoints(result.points);
      const fallbackNote =
        result.fallbackChunks > 0
          ? ` (${result.fallbackChunks} water/off-road segment kept direct)`
          : '';
      setStatusMessage(
        `Snapped ${result.snappedChunks} segment(s) → ${result.points.length} vertices${fallbackNote}.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Google Maps snapping failed.'
      );
      setStatusMessage('');
    } finally {
      setIsBusy(false);
    }
  }, [snapMode, draftPoints, apiKey, pushProgrammaticPoints]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setDraftPoints(last);
      setRevision((r) => r + 1);
      setStatusMessage('Undid last change.');
      setErrorMessage('');
      return prev.slice(0, -1);
    });
  }, []);

  const handleResetOriginal = useCallback(() => {
    pushProgrammaticPoints(originalPoints);
    setStatusMessage(`Restored original ${originalPoints.length} in-bounds points.`);
    setErrorMessage('');
  }, [originalPoints, pushProgrammaticPoints]);

  const buildUpdatedRoute = useCallback((): ParsedRouteData => {
    return {
      ...route,
      points: draftPoints,
      startTimeMs: draftPoints[0]?.timeMs ?? route.startTimeMs,
      endTimeMs: draftPoints[draftPoints.length - 1]?.timeMs ?? route.endTimeMs,
      totalDistanceMeters: draftDistanceMeters,
    };
  }, [route, draftPoints, draftDistanceMeters]);

  const handleSaveJson = useCallback(() => {
    exportCalibratedRouteJson(buildUpdatedRoute());
    setStatusMessage('Downloaded calibrated JSON file.');
  }, [buildUpdatedRoute]);

  const handleApplyAndClose = useCallback(() => {
    onApply(buildUpdatedRoute());
    onClose();
  }, [buildUpdatedRoute, onApply, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Route Calibration Editor"
      className="fixed inset-0 z-50 bg-[#041411]/95 backdrop-blur-md flex flex-col md:flex-row text-white animate-fade-in"
    >
      {/* Left: Full Interactive 2D Google Satellite/Hybrid Map Editor */}
      <div className="relative flex-1 min-h-[52vh] md:min-h-0">
        <GoogleMap2D
          id={CALIBRATION_MAP_ID}
          defaultCenter={VENICE_CENTER}
          defaultZoom={15}
          mapTypeId={mapType}
          gestureHandling="greedy"
          disableDefaultUI={false}
          streetViewControl={false}
          fullscreenControl={false}
          mapTypeControl={false}
          restriction={{
            latLngBounds: VENICE_HOME_GUARD_RAILS,
            strictBounds: false,
          }}
          className="w-full h-full"
        >
          <EditablePolylineBridge
            points={draftPoints}
            originalPoints={originalPoints}
            showOriginal={showOriginal}
            revision={revision}
            onManualPathEdit={handleManualPathEdit}
          />
        </GoogleMap2D>

        {/* Top-Left Floating Map Type Switcher & Legend */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
          <div className="venice-glass rounded-xl p-1 flex items-center gap-1 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-[#FFB35C] ml-1.5 mr-0.5" />
            {(['hybrid', 'satellite', 'roadmap'] as const).map((mt) => (
              <button
                key={mt}
                type="button"
                onClick={() => setMapType(mt)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                  mapType === mt
                    ? 'bg-[#FF7A18]/30 text-[#FFD27D] border border-[#FF8C2A]/70 font-semibold'
                    : 'text-white/75 hover:text-white border border-transparent'
                }`}
              >
                {mt}
              </button>
            ))}
          </div>

          <label className="venice-glass rounded-xl px-3 py-1.5 flex items-center gap-2 text-[11px] text-white/85 cursor-pointer">
            <input
              type="checkbox"
              checked={showOriginal}
              onChange={(e) => setShowOriginal(e.target.checked)}
              className="accent-sky-400"
            />
            <span className="inline-block w-2.5 h-0.5 bg-sky-400 rounded-full" />
            <span>Original GPS</span>
          </label>
        </div>

        {/* Bottom-Left Editing Hint Pill */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-[11px] text-white/80">
          <span>Drag dots to align</span>
          <span className="text-[#FF8C2A]">•</span>
          <span>Drag midpoints to add</span>
          <span className="text-[#FF8C2A]">•</span>
          <span>
            <strong className="text-[#FFD27D]">Right-click</strong> a dot to delete
          </span>
        </div>
      </div>

      {/* Right: Calibration Controls Sidebar */}
      <aside className="w-full md:w-[356px] max-h-[48vh] md:max-h-screen flex flex-col venice-glass-strong border-t md:border-t-0 md:border-l border-white/15">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/12 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#FF7A18]/20 border border-[#FF7A18]/50 flex items-center justify-center text-[#FFB35C] shrink-0">
              <Route className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white leading-tight">
                Route Calibration
              </h2>
              <p className="text-[11px] text-white/65 font-mono-tabular truncate">
                {draftPoints.length} pts · {(draftDistanceMeters / 1000).toFixed(2)} km
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Route Calibration"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Tools Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs">
          {/* Status / Error Feedback */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/75 border border-red-500/50 text-red-200 flex items-start gap-2 text-[11px]">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {statusMessage && !errorMessage && (
            <div className="p-2.5 rounded-xl bg-[#FF7A18]/12 border border-[#FF8C2A]/40 text-[#FFD27D] flex items-center gap-2 text-[11px]">
              {isBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Section 1: Automated GPS Error & Jitter Removal */}
          <div className="space-y-3 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFB35C]" />
                <span>1. Remove GPS Errors</span>
              </h3>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/75">Max Speed Spike Filter</span>
                <span className="font-mono-tabular text-[#FFB35C]">
                  {maxSpeedKmh} km/h
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={35}
                step={1}
                value={maxSpeedKmh}
                onChange={(e) => setMaxSpeedKmh(Number(e.target.value))}
                className="venice-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/75">Collapse Jitter Spacing</span>
                <span className="font-mono-tabular text-[#FFB35C]">
                  {minSpacingMeters} m
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={45}
                step={5}
                value={minSpacingMeters}
                onChange={(e) => setMinSpacingMeters(Number(e.target.value))}
                className="venice-slider"
              />
            </div>

            <button
              type="button"
              onClick={handleCleanErrors}
              disabled={isBusy}
              className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/16 border border-white/15 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFB35C]" />
              <span>Clean Spikes &amp; Jitter</span>
            </button>
          </div>

          {/* Section 2: Google Maps Road / Footpath Snapping */}
          <div className="space-y-3 pb-4 border-b border-white/10">
            <h3 className="font-semibold text-white flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-[#FFB35C]" />
              <span>2. Attach to Roads (Google Maps)</span>
            </h3>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  {id: 'walking', label: 'Walking'},
                  {id: 'roads', label: 'Roads API'},
                  {id: 'raw', label: 'Direct'},
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSnapMode(opt.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                    snapMode === opt.id
                      ? 'bg-[#FF7A18]/25 border-[#FF8C2A]/75 text-[#FFD27D] font-semibold'
                      : 'bg-white/6 border-white/12 text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-white/60 leading-relaxed">
              {snapMode === 'walking' &&
                'Uses Google Maps Walking Directions to snap waypoints onto Venetian footpaths, calli, and bridges.'}
              {snapMode === 'roads' &&
                'Uses Google Maps Roads API (snapToRoads). Best for car/bus segments; requires Roads API enabled on your key.'}
              {snapMode === 'raw' &&
                'Keeps direct lines between your edited vertices (ideal for vaporetto / lagoon water routes).'}
            </p>

            <button
              type="button"
              onClick={handleSnapToRoads}
              disabled={isBusy || snapMode === 'raw'}
              className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-[#FF7A18]/30 to-[#E6B86A]/25 hover:from-[#FF7A18]/45 hover:to-[#E6B86A]/35 border border-[#FF8C2A]/60 text-[#FFD27D] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              {isBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              <span>
                {isBusy
                  ? 'Snapping via Google Maps…'
                  : snapMode === 'walking'
                    ? 'Snap to Venice Footpaths'
                    : snapMode === 'roads'
                      ? 'Snap via Roads API'
                      : 'Direct Mode Active'}
              </span>
            </button>
          </div>

          {/* Section 3: Undo & Reset */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0 || isBusy}
              className="flex-1 py-2 px-3 rounded-lg bg-white/8 hover:bg-white/14 border border-white/12 text-white/85 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-35"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo ({history.length})</span>
            </button>
            <button
              type="button"
              onClick={handleResetOriginal}
              disabled={isBusy}
              className="flex-1 py-2 px-3 rounded-lg bg-white/8 hover:bg-white/14 border border-white/12 text-white/85 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-35"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Raw</span>
            </button>
          </div>
        </div>

        {/* Footer Actions: Download JSON & Apply to 3D Globe */}
        <div className="px-5 py-4 border-t border-white/12 bg-black/25 space-y-2 shrink-0">
          <button
            type="button"
            onClick={handleSaveJson}
            disabled={isBusy || draftPoints.length < 2}
            className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/16 border border-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#E6B86A]" />
            <span>Save Updated JSON</span>
          </button>

          <button
            type="button"
            onClick={handleApplyAndClose}
            disabled={isBusy || draftPoints.length < 2}
            className="w-full py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all bg-gradient-to-r from-[#FFB35C] via-[#FF7A18] to-[#E65C00] text-[#1A0900] shadow-[0_0_20px_rgba(255,105,20,0.5)] hover:brightness-110 disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            <span>Apply to 3D Map</span>
          </button>
        </div>
      </aside>
    </div>
  );
};

export default RouteCalibrationModal;
