import React, {useMemo} from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Upload,
  X,
  Compass,
  Route,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';
import {ParsedRouteData} from '../utils/routeParser';

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4, 8] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

interface RouteTimelineOverlayProps {
  route: ParsedRouteData;
  currentTimeMs: number;
  distanceMeters: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  followCamera: boolean;
  isAlbumActive: boolean;
  isSampleRoute?: boolean;
  onTogglePlay: () => void;
  onSeek: (timeMs: number) => void;
  onRestart: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onToggleFollowCamera: () => void;
  onOpenCalibration: () => void;
  onLoadSampleRoute?: () => void;
  onLoadAnother: () => void;
  onClose: () => void;
}

const formatTime = (ms: number): string => {
  const d = new Date(ms);
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const formatShortTime = (ms: number): string => {
  const d = new Date(ms);
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatDate = (ms: number): string => {
  const d = new Date(ms);
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const RouteTimelineOverlay: React.FC<RouteTimelineOverlayProps> = React.memo(
  ({
    route,
    currentTimeMs,
    distanceMeters,
    isPlaying,
    speed,
    followCamera,
    isAlbumActive,
    isSampleRoute = false,
    onTogglePlay,
    onSeek,
    onRestart,
    onSpeedChange,
    onToggleFollowCamera,
    onOpenCalibration,
    onLoadSampleRoute,
    onLoadAnother,
    onClose,
  }) => {
    const duration = Math.max(1, route.endTimeMs - route.startTimeMs);
    const progressPercent = Math.min(
      100,
      Math.max(0, ((currentTimeMs - route.startTimeMs) / duration) * 100)
    );

    const formattedCurrentDate = useMemo(
      () => formatDate(currentTimeMs),
      [currentTimeMs]
    );
    const formattedCurrentTime = useMemo(
      () => formatTime(currentTimeMs),
      [currentTimeMs]
    );
    const formattedStart = useMemo(
      () => `${formatDate(route.startTimeMs)} · ${formatShortTime(route.startTimeMs)}`,
      [route.startTimeMs]
    );
    const formattedEnd = useMemo(
      () => `${formatDate(route.endTimeMs)} · ${formatShortTime(route.endTimeMs)}`,
      [route.endTimeMs]
    );

    const distanceKm = (distanceMeters / 1000).toFixed(2);
    const totalKm = (route.totalDistanceMeters / 1000).toFixed(2);

    return (
      <section
        aria-label="Route playback timeline"
        className={`fixed left-1/2 -translate-x-1/2 z-30 w-[min(94vw,46rem)] transition-all duration-300 animate-slide-up contain-overlay ${
          isAlbumActive ? 'bottom-[196px]' : 'bottom-5'
        }`}
      >
        <div className="relative rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 bg-[#061A16]/72 backdrop-blur-xl border border-[#FF7A18]/35 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.75),0_0_28px_rgba(255,95,15,0.2)] text-white overflow-hidden">
          {/* Top Molten Amber Accent Trim (PhotoGallerySkin Signature Glow) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-[#FF8C2A]/90 to-transparent"
          />

          {/* Top Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-[#FF7A18]/20 border border-[#FF7A18]/50 flex items-center justify-center text-[#FFB35C] shadow-[0_0_14px_rgba(255,105,20,0.4)] shrink-0">
                <Route className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wide text-white truncate max-w-[180px] sm:max-w-[260px]">
                    {route.fileName}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-tabular bg-white/[0.07] border border-[#FF7A18]/25 text-[#FFB35C]">
                    <MapPin className="w-2.5 h-2.5" />
                    {route.points.length} pts
                  </span>
                </div>
                <div className="text-[11px] text-white/65 font-mono-tabular flex items-center gap-2">
                  <span>{formattedCurrentDate}</span>
                  <span className="text-[#FF8C2A]">•</span>
                  <span className="text-[#FFD27D] font-semibold">
                    {formattedCurrentTime}
                  </span>
                  <span className="text-white/35">|</span>
                  <span>
                    {distanceKm} / {totalKm} km
                  </span>
                </div>
              </div>
            </div>

            {/* Right Utility Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenCalibration}
                title="Calibrate Route, Remove GPS Errors & Snap to Roads"
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border bg-[#FF7A18]/18 border-[#FF8C2A]/55 text-[#FFD27D] hover:bg-[#FF7A18]/30 transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Calibrate</span>
              </button>

              <button
                type="button"
                onClick={onToggleFollowCamera}
                title={
                  followCamera
                    ? 'Stop Following Route Head'
                    : 'Follow Glowing Route Head with Camera'
                }
                aria-pressed={followCamera}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                  followCamera
                    ? 'bg-[#FF7A18]/25 border-[#FF8C2A]/75 text-[#FFD27D] shadow-[0_0_14px_rgba(255,105,20,0.4)]'
                    : 'bg-white/[0.06] border-white/12 text-white/75 hover:bg-white/12 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Follow</span>
              </button>

              {!isSampleRoute && onLoadSampleRoute && (
                <button
                  type="button"
                  onClick={onLoadSampleRoute}
                  title="Switch to Embedded Venice 24/09/2026 Example Route"
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] hover:bg-white/14 border border-white/12 text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <span>24/09 Example</span>
                </button>
              )}

              <button
                type="button"
                onClick={onLoadAnother}
                title="Load Your Own Google Maps Location JSON"
                aria-label="Load Custom JSON Route"
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/14 border border-white/12 text-white/80 hover:text-white flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Load JSON</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Close Timeline & Clear Route from Memory"
                aria-label="Close Timeline"
                className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-red-500/25 border border-white/12 hover:border-red-400/50 text-white/75 hover:text-red-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Timeline Scrubber */}
          <div className="relative flex items-center gap-3">
            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause route playback' : 'Play route playback'}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 bg-gradient-to-br from-[#FFB35C] via-[#FF7A18] to-[#E04F00] text-[#1A0900] shadow-[0_0_18px_rgba(255,105,20,0.65),inset_0_1px_1px_rgba(255,246,214,0.8)] hover:brightness-110"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-[1px]" />
              )}
            </button>

            {/* Restart Button */}
            <button
              type="button"
              onClick={onRestart}
              title="Restart Route from Beginning"
              aria-label="Restart route"
              className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/12 text-white/80 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Scrub Bar */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="relative h-5 flex items-center">
                {/* Custom Visual Track */}
                <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden pointer-events-none">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF4800] via-[#FF8C2A] to-[#FFE09E] shadow-[0_0_12px_rgba(255,122,24,0.9)]"
                    style={{width: `${progressPercent}%`}}
                  />
                </div>
                <input
                  type="range"
                  min={route.startTimeMs}
                  max={route.endTimeMs}
                  step={Math.max(1000, Math.round(duration / 1000))}
                  value={Math.round(currentTimeMs)}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  aria-label="Route timeline position"
                  className="route-timeline-slider absolute inset-0 w-full h-full opacity-100 cursor-pointer"
                />
              </div>

              {/* Start & End Timestamps */}
              <div className="flex items-center justify-between text-[10px] font-mono-tabular text-white/60">
                <span>{formattedStart}</span>
                <span>{formattedEnd}</span>
              </div>
            </div>

            {/* Playback Speed Selector */}
            <div
              role="group"
              aria-label="Playback speed"
              className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-full bg-black/35 border border-white/10 shrink-0"
            >
              {PLAYBACK_SPEEDS.map((s) => {
                const active = speed === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSpeedChange(s)}
                    className={`px-2 py-1 rounded-full text-[10px] font-mono-tabular transition-all cursor-pointer ${
                      active
                        ? 'bg-[#FF7A18]/25 text-[#FFD27D] border border-[#FF8C2A]/70 shadow-[0_0_10px_rgba(255,105,20,0.45)] font-semibold'
                        : 'text-white/60 hover:text-white border border-transparent'
                    }`}
                  >
                    {s}×
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Speed Selector Row */}
          <div className="flex sm:hidden items-center justify-between mt-2 pt-2 border-t border-white/10">
            <span className="text-[10px] text-white/55 font-mono-tabular">
              {route.points.length} pts in Venice
              {route.filteredOutCount > 0
                ? ` (${route.filteredOutCount} outside filtered)`
                : ''}
            </span>
            <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-black/35 border border-white/10">
              {PLAYBACK_SPEEDS.map((s) => {
                const active = speed === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSpeedChange(s)}
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono-tabular transition-all cursor-pointer ${
                      active
                        ? 'bg-[#FF7A18]/25 text-[#FFD27D] border border-[#FF8C2A]/70 font-semibold'
                        : 'text-white/60 border border-transparent'
                    }`}
                  >
                    {s}×
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }
);

RouteTimelineOverlay.displayName = 'RouteTimelineOverlay';
