import React, {useState} from 'react';
import {
  ColorGradingSettings,
  COLOR_PRESETS,
} from '../types/colorSettings';
import {
  Check,
  Copy,
  Eye,
  RotateCcw,
  Route,
  Sliders,
  Sun,
  X,
  Key,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ColorGradingSettings;
  onChange: (settings: ColorGradingSettings) => void;
  onReset: () => void;
  isComparing: boolean;
  setIsComparing: (comparing: boolean) => void;
  apiKey?: string;
  onOpenApiKeyModal?: () => void;
  hasLoadedRoute?: boolean;
  routePointCount?: number;
  onOpenRouteCalibration?: () => void;
  onLoadSampleRoute?: () => void;
  onLoadRouteJson?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = React.memo(
  ({
    isOpen,
    onClose,
    settings,
    onChange,
    onReset,
    isComparing,
    setIsComparing,
    apiKey,
    onOpenApiKeyModal,
    hasLoadedRoute = false,
    routePointCount = 0,
    onOpenRouteCalibration,
    onLoadSampleRoute,
    onLoadRouteJson,
  }) => {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'presets' | 'adjust'>('presets');

    if (!isOpen) return null;

    const handleSlider = (key: keyof ColorGradingSettings, value: number) => {
      onChange({
        ...settings,
        [key]: value,
      });
    };

    const handleCopy = () => {
      navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="absolute top-16 right-[4.5rem] z-40 w-[340px] max-w-[calc(100vw-6rem)] max-h-[calc(100vh-5rem)] overflow-y-auto venice-glass-strong rounded-xl p-5 text-white text-xs animate-fade-in contain-overlay">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/12">
          <div>
            <h2 className="font-semibold text-white text-base leading-none">
              Map Calibration
            </h2>
            <p className="text-[11px] text-white/65 mt-1.5">
              Tone, warmth & aerial clarity
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/8 hover:bg-white/16 text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="flex rounded-lg venice-recessed p-1 my-4">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-white/16 text-white'
                : 'text-white/65 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-[#E6B86A]" />
            <span>Presets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('adjust')}
            className={`flex-1 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'adjust'
                ? 'bg-white/16 text-white'
                : 'text-white/65 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#E6B86A]" />
            <span>Fine-Tune</span>
          </button>
        </div>

        {/* Tab 1: Curated Presets */}
        {activeTab === 'presets' && (
          <div className="divide-y divide-white/10 mb-3">
            {COLOR_PRESETS.map((preset) => {
              const isSelected =
                settings.brightness === preset.settings.brightness &&
                settings.contrast === preset.settings.contrast &&
                settings.saturation === preset.settings.saturation &&
                settings.clarity === preset.settings.clarity;

              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => onChange(preset.settings)}
                  className="w-full text-left py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-[13px] group-hover:text-[#E6B86A] transition-colors">
                      {preset.name}
                    </div>
                    <p className="text-[11px] text-white/65 mt-0.5 leading-snug">
                      {preset.description}
                    </p>
                  </div>

                  {/* Toggle Switch Indicator */}
                  <div
                    aria-hidden="true"
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 flex items-center ${
                      isSelected
                        ? 'bg-[#E6B86A] justify-end'
                        : 'bg-white/14 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Fine-Tune Sliders */}
        {activeTab === 'adjust' && (
          <div className="space-y-4 mb-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11.5px]">
                <span className="text-white/85 font-medium">Brightness</span>
                <span className="font-mono-tabular text-[#E6B86A] font-semibold">
                  {settings.brightness}%
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={150}
                step={1}
                value={settings.brightness}
                onChange={(e) => handleSlider('brightness', parseFloat(e.target.value))}
                className="venice-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11.5px]">
                <span className="text-white/85 font-medium">Contrast</span>
                <span className="font-mono-tabular text-[#E6B86A] font-semibold">
                  {settings.contrast}%
                </span>
              </div>
              <input
                type="range"
                min={70}
                max={170}
                step={1}
                value={settings.contrast}
                onChange={(e) => handleSlider('contrast', parseFloat(e.target.value))}
                className="venice-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11.5px]">
                <span className="text-white/85 font-medium">Saturation</span>
                <span className="font-mono-tabular text-[#E6B86A] font-semibold">
                  {settings.saturation}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={220}
                step={1}
                value={settings.saturation}
                onChange={(e) => handleSlider('saturation', parseFloat(e.target.value))}
                className="venice-slider"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex justify-between text-[11.5px]">
                <span className="text-white font-semibold">Clarity & Detail Sharpness</span>
                <span className="font-mono-tabular text-[#E6B86A] font-semibold">
                  {settings.clarity}%
                </span>
              </div>
              <p className="text-[10.5px] text-white/60">
                Accentuates terracotta roofs, stone bridges, and canal edges
              </p>
              <input
                type="range"
                min={0}
                max={80}
                step={2}
                value={settings.clarity}
                onChange={(e) => handleSlider('clarity', parseFloat(e.target.value))}
                className="venice-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11.5px]">
                <span className="text-white/85 font-medium">Warmth</span>
                <span className="font-mono-tabular text-[#E6B86A] font-semibold">
                  {settings.warmth > 0 ? `+${settings.warmth}` : settings.warmth}%
                </span>
              </div>
              <input
                type="range"
                min={-30}
                max={35}
                step={1}
                value={settings.warmth}
                onChange={(e) => handleSlider('warmth', parseFloat(e.target.value))}
                className="venice-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11.5px]">
                <span className="text-white/85 font-medium">Vibrance</span>
                <span className="font-mono-tabular text-[#E6B86A] font-semibold">
                  {settings.vibrance > 0 ? `+${settings.vibrance}` : settings.vibrance}%
                </span>
              </div>
              <input
                type="range"
                min={-20}
                max={40}
                step={1}
                value={settings.vibrance}
                onChange={(e) => handleSlider('vibrance', parseFloat(e.target.value))}
                className="venice-slider"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/70">Highlights</span>
                  <span className="font-mono-tabular text-[#E6B86A] font-medium">
                    {settings.highlights > 0 ? `+${settings.highlights}` : settings.highlights}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-25}
                  max={25}
                  step={1}
                  value={settings.highlights}
                  onChange={(e) => handleSlider('highlights', parseFloat(e.target.value))}
                  className="venice-slider"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/70">Shadows</span>
                  <span className="font-mono-tabular text-[#E6B86A] font-medium">
                    {settings.shadows > 0 ? `+${settings.shadows}` : settings.shadows}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-25}
                  max={25}
                  step={1}
                  value={settings.shadows}
                  onChange={(e) => handleSlider('shadows', parseFloat(e.target.value))}
                  className="venice-slider"
                />
              </div>
            </div>
          </div>
        )}

        {/* Google Maps API Key Section */}
        {onOpenApiKeyModal && (
          <div className="pt-3 border-t border-white/12">
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-[11px] text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-[#E6B86A]" />
                <span>Google Maps API Key</span>
              </div>
              <span className="font-mono text-[10px] text-white/50">
                {apiKey ? `${apiKey.slice(0, 6)}...` : 'Not Set'}
              </span>
            </button>
          </div>
        )}

        {/* Route Path Calibration Section */}
        <div className="pt-3 mb-3 border-t border-white/12">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-white/85 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-[#FFB35C]" />
              <span>Route Calibration</span>
            </span>
            {hasLoadedRoute && (
              <span className="text-[10px] font-mono-tabular text-[#FFB35C]">
                {routePointCount} pts
              </span>
            )}
          </div>
          {hasLoadedRoute ? (
            <button
              type="button"
              onClick={onOpenRouteCalibration}
              className="w-full py-2 px-3 rounded-lg bg-[#FF7A18]/20 hover:bg-[#FF7A18]/32 border border-[#FF8C2A]/60 text-[#FFD27D] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Route className="w-3.5 h-3.5" />
              <span>Open Route Calibration Editor</span>
            </button>
          ) : (
            <div className="space-y-2">
              {onLoadSampleRoute && (
                <button
                  type="button"
                  onClick={onLoadSampleRoute}
                  className="w-full py-2 px-3 rounded-lg bg-[#FF7A18]/20 hover:bg-[#FF7A18]/32 border border-[#FF8C2A]/60 text-[#FFD27D] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>Show 24/09/2026 Example Route</span>
                </button>
              )}
              <button
                type="button"
                onClick={onLoadRouteJson}
                className="w-full py-2 px-3 rounded-lg bg-white/8 hover:bg-white/14 border border-white/15 text-white/85 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Route className="w-3.5 h-3.5 text-[#FFB35C]" />
                <span>Load Custom Route JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Compare Hold Action */}
        <div className="pt-3 border-t border-white/12">
          <button
            type="button"
            onMouseDown={() => setIsComparing(true)}
            onMouseUp={() => setIsComparing(false)}
            onMouseLeave={() => setIsComparing(false)}
            onTouchStart={() => setIsComparing(true)}
            onTouchEnd={() => setIsComparing(false)}
            className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isComparing
                ? 'bg-[#E6B86A] text-[#0B1F1A] scale-[0.98]'
                : 'bg-white/10 text-white hover:bg-white/18'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isComparing ? 'Showing Raw Satellite' : 'Hold to Compare Raw View'}</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 venice-gold-btn font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Settings' : 'Copy Calibration'}</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            title="Reset to default calibration"
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/18 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Reset to default calibration"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
);

SettingsModal.displayName = 'SettingsModal';
export default SettingsModal;
