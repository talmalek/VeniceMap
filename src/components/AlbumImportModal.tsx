import React, {useState, useRef, useEffect} from 'react';
import {
  Images,
  X,
  HardDrive,
  ShieldCheck,
  Loader2,
  FolderSearch,
  Laptop,
  Compass,
} from 'lucide-react';
import {
  parseAlbumImageFiles,
  pickLocalDesktopDirectory,
  AlbumParseResult,
} from '../utils/exifParser';

interface AlbumImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlbumLoaded: (result: AlbumParseResult) => void;
  onLoadSampleAlbum: () => void;
  currentAlbumTitle?: string;
  photoCount?: number;
}

export const AlbumImportModal: React.FC<AlbumImportModalProps> = React.memo(
  ({
    isOpen,
    onClose,
    onAlbumLoaded,
    onLoadSampleAlbum,
    currentAlbumTitle,
    photoCount = 0,
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [progress, setProgress] = useState({current: 0, total: 0});
    const [parseStatus, setParseStatus] = useState<string | null>(null);

    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const folderInputRef = useRef<HTMLInputElement | null>(null);
    const filesInputRef = useRef<HTMLInputElement | null>(null);

    // Sync React isOpen prop with native top-layer <dialog> showModal() / close()
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (isOpen) {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else if (dialog.open) {
        dialog.close();
      }
    }, [isOpen]);

    // Native close listener + fallback backdrop click-outside check for browsers without closedBy
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const handleNativeClose = () => {
        onClose();
      };

      const handleFallbackBackdropClick = (event: MouseEvent) => {
        if ('closedBy' in HTMLDialogElement.prototype) return;
        if (event.target === dialog) {
          dialog.close();
        }
      };

      dialog.addEventListener('close', handleNativeClose);
      dialog.addEventListener('click', handleFallbackBackdropClick);

      return () => {
        dialog.removeEventListener('close', handleNativeClose);
        dialog.removeEventListener('click', handleFallbackBackdropClick);
      };
    }, [onClose]);

    const handleProcessFiles = async (
      fileList: FileList | File[],
      customFolderName?: string
    ) => {
      const rawFiles = Array.from(fileList);
      if (rawFiles.length === 0) return;

      setIsParsing(true);
      setProgress({current: 0, total: rawFiles.length});
      setParseStatus('Reading local photos and extracting EXIF GPS coordinates...');

      try {
        const result = await parseAlbumImageFiles(
          rawFiles,
          (current, total) => {
            setProgress({current, total});
          },
          customFolderName
        );

        setParseStatus(
          `Loaded ${result.totalParsed} local photos · ${result.withGpsCount} with Venice GPS coordinates.`
        );

        setTimeout(() => {
          setIsParsing(false);
          onAlbumLoaded(result);
          onClose();
        }, 450);
      } catch {
        setIsParsing(false);
        setParseStatus('Unable to read local photo files. Please check the file formats.');
      }
    };

    // Native OS desktop folder picker (files stay 100% on local computer)
    const handleOpenLocalDirectory = async () => {
      try {
        const picked = await pickLocalDesktopDirectory();
        if (picked && picked.files.length > 0) {
          await handleProcessFiles(picked.files, picked.folderName);
          return;
        }
        if (picked === null) {
          folderInputRef.current?.click();
        }
      } catch {
        folderInputRef.current?.click();
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await handleProcessFiles(e.dataTransfer.files);
      }
    };

    return (
      <dialog
        ref={dialogRef}
        closedby="any"
        aria-labelledby="album-modal-title"
        className="venice-dialog select-none"
      >
        <div className="relative w-full venice-glass-strong rounded-2xl text-white p-6 md:p-8">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/8 hover:bg-white/16 text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B86A]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3.5 pr-10">
            <div className="w-11 h-11 rounded-xl venice-recessed flex items-center justify-center text-[#E6B86A] shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="album-modal-title"
                className="text-xl font-semibold tracking-tight text-white leading-tight"
              >
                Show Local PC Album on Map
              </h2>
              <p className="text-xs text-white/72 mt-1.5 leading-relaxed">
                Your photo folder remains strictly on your computer. Thumbnails and GPS pins are read locally in your browser with zero uploads.
              </p>
            </div>
          </div>

          {/* Recessed Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-6 rounded-xl border border-dashed p-7 text-center transition-all flex flex-col items-center justify-center gap-3.5 ${
              isDragging
                ? 'border-[#E6B86A] bg-[#0E3F33]/80 scale-[1.01]'
                : 'border-white/20 venice-recessed hover:border-[#E6B86A]/55'
            }`}
          >
            {isParsing ? (
              <div className="space-y-3 w-full max-w-xs text-center py-3">
                <Loader2 className="w-8 h-8 text-[#E6B86A] animate-spin mx-auto" />
                <p className="text-sm font-medium text-white">{parseStatus}</p>
                <div className="w-full bg-white/12 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#E6B86A] h-full transition-all duration-150 rounded-full"
                    style={{
                      width:
                        progress.total > 0
                          ? `${(progress.current / progress.total) * 100}%`
                          : '0%',
                    }}
                  />
                </div>
                <p className="text-[11px] text-white/65 font-mono-tabular">
                  Reading file {progress.current} of {progress.total} locally
                </p>
              </div>
            ) : (
              <>
                <div className="w-13 h-13 rounded-full bg-white/8 border border-white/15 flex items-center justify-center text-[#E6B86A]">
                  <FolderSearch className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Drop your Venice photo folder from your PC here
                  </p>
                  <p className="text-xs text-white/65 mt-1">
                    JPEG, JPG, PNG, HEIC, or WebP with embedded camera GPS tags
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    // @ts-expect-error webkitdirectory is standard in modern browsers
                    webkitdirectory=""
                    directory=""
                    className="hidden"
                    onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={handleOpenLocalDirectory}
                    className="px-5 py-2.5 rounded-lg venice-gold-btn font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Laptop className="w-4 h-4 text-[#0B1F1A]" />
                    <span>Choose Folder from PC</span>
                  </button>

                  <input
                    ref={filesInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/heic,image/webp,image/jpg"
                    className="hidden"
                    onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => filesInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/18 border border-white/16 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Images className="w-4 h-4 text-[#E6B86A]" />
                    <span>Select Local Photos</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer: Local Privacy Guarantee & Sample Album */}
          <div className="mt-6 pt-4 border-t border-white/12 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <ShieldCheck className="w-4 h-4 text-[#E6B86A] shrink-0" />
              <span>100% local desktop processing · Zero uploads</span>
            </div>

            <button
              type="button"
              onClick={() => {
                onLoadSampleAlbum();
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-white/8 hover:bg-white/16 border border-white/14 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Compass className="w-3.5 h-3.5 text-[#E6B86A]" />
              <span>Load Top 20 Venice Attractions</span>
            </button>
          </div>

          {/* Active Album Summary */}
          {photoCount > 0 && currentAlbumTitle && (
            <div className="mt-4 pt-3.5 border-t border-white/12 flex items-center justify-between text-xs text-white/70">
              <span className="truncate">
                Active album: <strong className="text-white">{currentAlbumTitle}</strong> ·{' '}
                <span className="font-mono-tabular text-[#E6B86A]">{photoCount} photos</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-[#E6B86A] hover:text-[#F5CF8B] font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0 ml-3"
              >
                Return to Map
              </button>
            </div>
          )}
        </div>
      </dialog>
    );
  }
);

AlbumImportModal.displayName = 'AlbumImportModal';
export default AlbumImportModal;
