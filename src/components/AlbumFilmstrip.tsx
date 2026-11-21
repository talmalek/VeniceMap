import React, {useRef, useEffect, useState, useMemo} from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FolderOpen,
  X,
  Camera,
  Eye,
} from 'lucide-react';
import {GeotaggedPhoto} from '../data/veniceData';

interface AlbumFilmstripProps {
  isOpen: boolean;
  albumTitle: string;
  photos: GeotaggedPhoto[];
  selectedPhoto: GeotaggedPhoto | null;
  hoveredPhotoId: string | null;
  onSelectPhoto: (photo: GeotaggedPhoto) => void;
  onHoverPhoto: (photoId: string | null) => void;
  onRemovePhoto: (photoId: string) => void;
  onOpenImportModal: () => void;
  onCloseFilmstrip: () => void;
}

export const AlbumFilmstrip: React.FC<AlbumFilmstripProps> = React.memo(
  ({
    isOpen,
    albumTitle,
    photos,
    selectedPhoto,
    hoveredPhotoId,
    onSelectPhoto,
    onHoverPhoto,
    onRemovePhoto,
    onOpenImportModal,
    onCloseFilmstrip,
  }) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [isMinimized, setIsMinimized] = useState(false);

    const hoveredPhoto = useMemo(
      () => photos.find((p) => p.id === hoveredPhotoId) || null,
      [photos, hoveredPhotoId]
    );

    const [previewPhoto, setPreviewPhoto] = useState<GeotaggedPhoto | null>(null);

    useEffect(() => {
      if (hoveredPhoto) {
        setPreviewPhoto(hoveredPhoto);
      }
    }, [hoveredPhoto]);

    const geotaggedCount = useMemo(
      () => photos.filter((p) => p.lat && p.lng).length,
      [photos]
    );

    // Reset to expanded whenever the album is freshly opened
    useEffect(() => {
      if (isOpen) {
        setIsMinimized(false);
      }
    }, [isOpen]);

    // Auto-scroll to center the selected photo in the filmstrip
    useEffect(() => {
      if (selectedPhoto && !isMinimized) {
        const el = cardRefs.current.get(selectedPhoto.id);
        if (el) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }
      }
    }, [selectedPhoto, isMinimized]);

    if (!isOpen || photos.length === 0) return null;

    const handleScroll = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
        const offset = direction === 'left' ? -360 : 360;
        scrollContainerRef.current.scrollBy({left: offset, behavior: 'smooth'});
      }
    };

    // Minimized low-profile translucent emerald bar hugged to the bottom edge
    if (isMinimized) {
      return (
        <div className="fixed bottom-3 inset-x-0 z-40 px-3 sm:px-6 flex justify-center pointer-events-none select-none contain-overlay">
          <div className="pointer-events-auto animate-slide-up venice-glass rounded-full pl-3 pr-2 py-1.5 text-white flex items-center gap-3 max-w-full">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B86A] rounded-full"
              title="Expand location filmstrip"
            >
              {selectedPhoto ? (
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.title}
                  width={28}
                  height={28}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-white/30 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[#E6B86A] shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="flex items-baseline gap-2 min-w-0 text-left">
                <span className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-[260px] group-hover:text-[#E6B86A] transition-colors">
                  {selectedPhoto ? selectedPhoto.title : albumTitle}
                </span>
                <span className="hidden sm:inline text-[11px] font-mono-tabular text-[#E6B86A] shrink-0">
                  {geotaggedCount} pinned
                </span>
              </div>
            </button>

            <div className="w-px h-4 bg-white/15 shrink-0" aria-hidden="true" />

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                title="Expand filmstrip"
                aria-label="Expand filmstrip"
              >
                <ChevronUp className="w-3.5 h-3.5 text-[#E6B86A]" />
                <span>Expand</span>
              </button>

              <button
                type="button"
                onClick={onCloseFilmstrip}
                className="w-8 h-8 rounded-full hover:bg-white/12 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Hide Album from Map"
                aria-label="Hide Album from Map"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Dynamic Center Pop-up Preview on Bottom List Hover */}
        <div
          className={`fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 transition-all duration-250 ease-out will-change-transform ${
            hoveredPhoto && previewPhoto
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-75 translate-y-24'
          }`}
          aria-hidden={!hoveredPhoto}
        >
          {previewPhoto && (
            <div className="venice-glass-strong bg-[#061E19]/95 border border-[#E6B86A]/45 rounded-2xl p-2.5 sm:p-3.5 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.9)] w-fit max-w-[92vw] flex flex-col items-center mx-auto">
              {/* Locked Y Dimension Container — True Aspect Ratio with ZERO black bars */}
              <div className="relative h-[44vh] sm:h-[50vh] w-fit rounded-xl overflow-hidden shrink-0">
                <img
                  src={previewPhoto.imageUrl}
                  alt={previewPhoto.title}
                  className="h-full w-auto block rounded-xl shadow-md"
                  decoding="async"
                />
              </div>
              <div className="w-0 min-w-full px-1 pt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-white truncate leading-tight">
                    {previewPhoto.title}
                  </p>
                  <p className="text-xs text-white/70 truncate mt-0.5">
                    {previewPhoto.sestiere}
                  </p>
                </div>
                {previewPhoto.lat && previewPhoto.lng && (
                  <span className="font-mono-tabular text-xs font-semibold text-[#E6B86A] bg-black/50 border border-[#E6B86A]/30 px-2.5 py-1 rounded-md shrink-0">
                    {previewPhoto.lat.toFixed(4)}°, {previewPhoto.lng.toFixed(4)}°
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filmstrip Dock */}
        <div className="fixed bottom-4 inset-x-0 z-40 px-3 sm:px-6 flex justify-center pointer-events-none select-none contain-overlay">
          <div className="w-full max-w-5xl pointer-events-auto animate-slide-up venice-glass rounded-xl px-4 py-3.5 sm:px-5 sm:py-4 text-white overflow-hidden">
          {/* Header Bar — Clean Unboxed Typography */}
          <div className="flex items-center justify-between gap-4 pb-2.5 mb-2.5 border-b border-white/12">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[#E6B86A] shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold tracking-tight text-white leading-tight truncate">
                  {albumTitle}
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-white/70 leading-none mt-1 truncate">
                  <span className="font-mono-tabular font-medium text-[#E6B86A]">
                    {geotaggedCount} pinned
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Local PC folder</span>
                  <span aria-hidden="true" className="hidden sm:inline">
                    ·
                  </span>
                  <span className="hidden sm:inline">Click any photo to fly over</span>
                </div>
              </div>
            </div>

            {/* Action Controls: Change Folder, Minimize to Bottom, Hide */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenImportModal}
                className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/18 border border-white/15 text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B86A]"
                title="Change Local PC Folder"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#E6B86A]" />
                <span className="hidden sm:inline">Change Folder</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="w-9 h-9 rounded-lg bg-white/8 hover:bg-white/16 border border-white/12 text-white/80 hover:text-white flex items-center justify-center transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B86A]"
                title="Minimize to bottom"
                aria-label="Minimize to bottom"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onCloseFilmstrip}
                className="w-9 h-9 rounded-lg bg-white/8 hover:bg-white/16 border border-white/12 text-white/80 hover:text-white flex items-center justify-center transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B86A]"
                title="Hide Album from Map"
                aria-label="Hide Album from Map"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Filmstrip Track */}
          <div className="relative group/track flex items-center gap-2">
            {/* Left Scroll Button */}
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="hidden sm:flex w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/85 hover:text-white items-center justify-center shrink-0 transition-transform duration-150 active:scale-95 cursor-pointer"
              aria-label="Scroll filmstrip left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Horizontal Scroll Area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 flex items-stretch gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1"
            >
              {photos.map((photo) => {
                const isSelected = selectedPhoto?.id === photo.id;
                const isHovered = hoveredPhotoId === photo.id;

                return (
                  <div
                    key={photo.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(photo.id, el);
                      else cardRefs.current.delete(photo.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectPhoto(photo)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectPhoto(photo);
                      }
                    }}
                    className={`filmstrip-card group text-left relative flex-shrink-0 w-fit flex flex-col rounded-lg p-1.5 transition-all duration-200 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B86A] ${
                      isSelected
                        ? 'bg-white/16 ring-2 ring-[#E6B86A] shadow-[0_10px_24px_-6px_rgba(0,0,0,0.65)] -translate-y-0.5'
                        : isHovered
                        ? 'bg-white/12 ring-1 ring-white/35'
                        : 'bg-white/6 hover:bg-white/12 ring-1 ring-white/12'
                    }`}
                  >
                    {/* Locked Y Dimension Thumbnail Container — True Aspect Ratio with ZERO black bars */}
                    <div className="relative h-24 sm:h-28 w-fit shrink-0 rounded-[6px] overflow-hidden">
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-auto block rounded-[6px] transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Small Eye Preview Icon on Opposite Left Side */}
                      <button
                        type="button"
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          onHoverPhoto(photo.id);
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          onHoverPhoto(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={`Hover to preview "${photo.title}"`}
                        aria-label={`Hover to preview "${photo.title}"`}
                        className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full bg-black/70 hover:bg-[#0E3F33] text-white/80 hover:text-[#E6B86A] border border-white/25 flex items-center justify-center transition-all duration-150 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-90 cursor-pointer shadow-md"
                      >
                        <Eye className="w-3 h-3 stroke-[2.2]" />
                      </button>

                      {/* Remove image button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePhoto(photo.id);
                        }}
                        title={`Remove "${photo.title}" from album`}
                        aria-label={`Remove "${photo.title}" from album`}
                        className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white/80 hover:text-white border border-white/25 flex items-center justify-center transition-all duration-150 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-90 cursor-pointer shadow-md"
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Clean Unboxed Card Metadata with Lat & Lon */}
                    <div className="px-0.5 pt-2 pb-0.5 w-0 min-w-full">
                      <p className="text-[11.5px] font-semibold text-white leading-tight truncate">
                        {photo.title}
                      </p>
                      <div className="flex items-center justify-between gap-1 text-[10px] text-white/65 mt-1">
                        <span className="truncate">
                          {photo.sestiere.split('·')[0].trim()}
                        </span>
                        <span className="font-mono-tabular text-[#E6B86A] shrink-0 text-[9.5px]">
                          {photo.lat && photo.lng
                            ? `${photo.lat.toFixed(3)}°, ${photo.lng.toFixed(3)}°`
                            : photo.lat
                            ? `${photo.lat.toFixed(3)}°`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Scroll Button */}
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="hidden sm:flex w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/85 hover:text-white items-center justify-center shrink-0 transition-transform duration-150 active:scale-95 cursor-pointer"
              aria-label="Scroll filmstrip right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
  }
);

AlbumFilmstrip.displayName = 'AlbumFilmstrip';
export default AlbumFilmstrip;
