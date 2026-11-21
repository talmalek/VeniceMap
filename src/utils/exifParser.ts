import {
  GeotaggedPhoto,
  VENICE_CENTER,
  findClosestVeniceZone,
} from '../data/veniceData';

export interface AlbumParseResult {
  photos: GeotaggedPhoto[];
  totalParsed: number;
  withGpsCount: number;
  albumTitle: string;
}

/**
 * Yield to the main thread between heavy local file parses so user input and progress UI
 * remain responsive (INP optimization using scheduler.yield() with setTimeout fallback).
 */
function yieldToMain(): Promise<void> {
  const globalScheduler = (
    globalThis as unknown as {
      scheduler?: {yield?: () => Promise<void>};
    }
  ).scheduler;

  if (globalScheduler && typeof globalScheduler.yield === 'function') {
    return globalScheduler.yield();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Release previously allocated local Object URLs to prevent browser memory leaks
 * when switching folders or closing local albums.
 */
export function revokeAlbumObjectUrls(photos: GeotaggedPhoto[]): void {
  for (const photo of photos) {
    if (photo.isUserUploaded && photo.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photo.imageUrl);
    }
  }
}

/**
 * Format a raw date string or Date object into a readable Venice travel timestamp
 */
function formatCaptureDate(rawDate: unknown, fileFallbackDate: number): string {
  try {
    const d = rawDate instanceof Date ? rawDate : rawDate ? new Date(String(rawDate)) : new Date(fileFallbackDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    // Fallback
  }
  return new Date(fileFallbackDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a filename into a clean presentation title
 */
function formatFileTitle(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, '');
  const clean = base
    .replace(/^IMG[-_]?/i, 'Photo ')
    .replace(/^DSC[-_]?/i, 'Capture ')
    .replace(/[-_]+/g, ' ')
    .trim();
  return clean.length > 0 ? clean : 'Venice Capture';
}

/**
 * Modern Desktop File System Access API:
 * Reads files directly from the user's local PC drive without network upload.
 */
export async function pickLocalDesktopDirectory(): Promise<{files: File[]; folderName: string} | null> {
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as unknown as {
        showDirectoryPicker: (opts?: {mode?: 'read' | 'readwrite'}) => Promise<{
          name: string;
          values: () => AsyncIterable<{
            kind: 'file' | 'directory';
            name: string;
            getFile: () => Promise<File>;
          }>;
        }>;
      }).showDirectoryPicker({mode: 'read'});

      const files: File[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const lower = entry.name.toLowerCase();
          if (
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.png') ||
            lower.endsWith('.heic') ||
            lower.endsWith('.webp') ||
            lower.endsWith('.avif')
          ) {
            const file = await entry.getFile();
            files.push(file);
          }
        }
      }
      return {files, folderName: dirHandle.name};
    } catch (err: unknown) {
      if ((err as {name?: string})?.name === 'AbortError') {
        // User closed picker dialog without selecting
        return null;
      }
      // If permission or feature failed, fallback to file input
      return null;
    }
  }
  return null;
}

/**
 * Parse an array of user-provided photo files, extracting embedded EXIF GPS tags.
 * Everything is processed purely in-memory in the browser.
 * ZERO bytes are sent over the network. Files remain 100% on the local computer hard drive.
 */
export async function parseAlbumImageFiles(
  files: File[],
  onProgress?: (current: number, total: number) => void,
  customFolderName?: string
): Promise<AlbumParseResult> {
  const imageFiles = files.filter((f) => {
    const lower = f.name.toLowerCase();
    return (
      f.type.startsWith('image/') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.heic') ||
      lower.endsWith('.avif')
    );
  });

  let albumTitle = customFolderName || 'Venice Local Album';
  // Try to derive folder name from webkitRelativePath if not explicitly provided
  if (!customFolderName) {
    for (const f of imageFiles) {
      if (f.webkitRelativePath) {
        const parts = f.webkitRelativePath.split('/');
        if (parts.length > 1 && parts[0]) {
          albumTitle = parts[0].replace(/[-_]+/g, ' ');
          break;
        }
      }
    }
  }

  const photos: GeotaggedPhoto[] = [];
  let withGpsCount = 0;
  const total = imageFiles.length;

  // Code-split exifr out of the initial critical bundle; load only when parsing local files
  const exifr = total > 0 ? (await import('exifr')).default : null;

  for (let i = 0; i < total; i++) {
    const file = imageFiles[i];
    onProgress?.(i + 1, total);

    const imageUrl = URL.createObjectURL(file);
    const title = formatFileTitle(file.name);

    let lat = VENICE_CENTER.lat;
    let lng = VENICE_CENTER.lng;
    let hasGps = false;
    let cameraModel = 'Digital Camera';
    let lensInfo = 'Standard Lens';
    let aperture = 'f/2.8';
    let shutterSpeed = '1/250s';
    let iso = 'ISO 100';
    let capturedAt = formatCaptureDate(null, file.lastModified);
    let altitudeMeters: number | undefined;

    try {
      // Parse EXIF and GPS tags
      const exifData = exifr
        ? await exifr.parse(file, {
            gps: true,
            exif: true,
            tiff: true,
          })
        : null;

      if (exifData) {
        if (
          typeof exifData.latitude === 'number' &&
          typeof exifData.longitude === 'number' &&
          !isNaN(exifData.latitude) &&
          !isNaN(exifData.longitude)
        ) {
          lat = exifData.latitude;
          lng = exifData.longitude;
          hasGps = true;
          withGpsCount++;
        }

        if (typeof exifData.GPSAltitude === 'number') {
          altitudeMeters = Math.round(exifData.GPSAltitude);
        }

        const make = exifData.Make ? String(exifData.Make).trim() : '';
        const model = exifData.Model ? String(exifData.Model).trim() : '';
        if (model) {
          cameraModel = model.startsWith(make) ? model : `${make} ${model}`.trim();
        } else if (make) {
          cameraModel = make;
        }

        if (exifData.LensModel) {
          lensInfo = String(exifData.LensModel).trim();
        }

        if (exifData.FNumber) {
          aperture = `f/${Number(exifData.FNumber).toFixed(1)}`;
        }

        if (exifData.ExposureTime) {
          const exp = Number(exifData.ExposureTime);
          shutterSpeed = exp < 1 ? `1/${Math.round(1 / exp)}s` : `${exp}s`;
        }

        if (exifData.ISO) {
          iso = `ISO ${exifData.ISO}`;
        }

        if (exifData.DateTimeOriginal) {
          capturedAt = formatCaptureDate(exifData.DateTimeOriginal, file.lastModified);
        }
      }
    } catch {
      // EXIF parse error or no EXIF: fallback to file defaults
    }

    const zone = findClosestVeniceZone(lat, lng);
    const sestiere = hasGps
      ? zone
        ? `${zone.name} · Venice`
        : 'Venice Lagoon'
      : 'Venice (Unassigned)';

    photos.push({
      id: `album-photo-${i}-${Date.now()}`,
      title,
      subtitle: `${cameraModel} · ${capturedAt}`,
      sestiere,
      description: hasGps
        ? `Captured in ${sestiere} with ${cameraModel}.`
        : `Photo from ${albumTitle}. No embedded GPS found in file headers.`,
      imageUrl,
      lat,
      lng,
      hasGps,
      fileName: file.name,
      isUserUploaded: true,
      placeQuery: `${title}, Venice, Italy`,
      exif: {
        camera: cameraModel,
        lens: lensInfo,
        focalLength: '35mm',
        aperture,
        shutterSpeed,
        iso,
        capturedAt,
        altitudeMeters,
      },
    });

    // Yield to the main thread so progress UI & user interactions stay responsive (INP)
    await yieldToMain();
  }

  // Sort photos: geotagged first, then by date/filename
  photos.sort((a, b) => {
    if (a.hasGps && !b.hasGps) return -1;
    if (!a.hasGps && b.hasGps) return 1;
    return a.title.localeCompare(b.title);
  });

  return {
    photos,
    totalParsed: photos.length,
    withGpsCount,
    albumTitle,
  };
}
