import {
  ParsedRouteData,
  RoutePoint,
  isInsideMapBounds,
} from './routeParser';

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface LatLngCoord {
  lat: number;
  lng: number;
  timeMs?: number;
}

/**
 * Rebuild a complete RoutePoint[] array from raw coordinates, enforcing Venice map
 * boundaries and smoothly distributing timestamps along cumulative distance when missing.
 */
export function rebuildRoutePoints(
  coords: LatLngCoord[],
  startTimeMs: number,
  endTimeMs: number
): RoutePoint[] {
  const valid: LatLngCoord[] = [];
  for (const c of coords) {
    if (!isInsideMapBounds(c.lat, c.lng)) continue;
    const prev = valid[valid.length - 1];
    if (
      prev &&
      Math.abs(prev.lat - c.lat) < 1e-7 &&
      Math.abs(prev.lng - c.lng) < 1e-7
    ) {
      continue;
    }
    valid.push(c);
  }

  if (valid.length === 0) return [];

  const cumDist: number[] = new Array(valid.length).fill(0);
  for (let i = 1; i < valid.length; i++) {
    cumDist[i] =
      cumDist[i - 1] +
      haversineMeters(
        valid[i - 1].lat,
        valid[i - 1].lng,
        valid[i].lat,
        valid[i].lng
      );
  }

  const totalDist = cumDist[cumDist.length - 1];
  const duration = Math.max(1000, endTimeMs - startTimeMs);

  return valid.map((c, idx) => {
    let timeMs: number;
    if (typeof c.timeMs === 'number' && Number.isFinite(c.timeMs)) {
      timeMs = c.timeMs;
    } else if (totalDist > 0) {
      timeMs = Math.round(startTimeMs + (cumDist[idx] / totalDist) * duration);
    } else {
      const frac = valid.length > 1 ? idx / (valid.length - 1) : 0;
      timeMs = Math.round(startTimeMs + frac * duration);
    }

    return {
      lat: Number(c.lat.toFixed(7)),
      lng: Number(c.lng.toFixed(7)),
      timeMs,
      timestamp: new Date(timeMs).toISOString(),
      cumulativeDistanceMeters: cumDist[idx],
    };
  });
}

export interface CleanGpsOptions {
  /** Remove points requiring travel faster than this speed (km/h) */
  maxSpeedKmh: number;
  /** Collapse stationary drift points closer than this distance (meters) */
  minSpacingMeters: number;
}

export interface CleanGpsResult {
  points: RoutePoint[];
  removedCount: number;
}

/**
 * Remove GPS teleport spikes, boomerang multipath errors, and stationary jitter clusters.
 */
export function cleanGpsErrors(
  points: RoutePoint[],
  options: CleanGpsOptions
): CleanGpsResult {
  if (points.length <= 2) {
    return {points, removedCount: 0};
  }

  const {maxSpeedKmh, minSpacingMeters} = options;
  const maxSpeedMps = (maxSpeedKmh * 1000) / 3600;

  // Pass 1: Remove single-point boomerang spikes (A -> B -> C where B shoots far away and returns)
  const spikeFiltered: RoutePoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = spikeFiltered[spikeFiltered.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dPrevCurr = haversineMeters(prev.lat, prev.lng, curr.lat, curr.lng);
    const dCurrNext = haversineMeters(curr.lat, curr.lng, next.lat, next.lng);
    const dPrevNext = haversineMeters(prev.lat, prev.lng, next.lat, next.lng);

    const dtSec = Math.max(1, (curr.timeMs - prev.timeMs) / 1000);
    const speedMps = dPrevCurr / dtSec;

    const isBoomerangSpike =
      dPrevCurr > 60 &&
      dCurrNext > 60 &&
      dPrevNext < Math.min(dPrevCurr, dCurrNext) * 0.45;

    const isTeleportSpike = dPrevCurr > 85 && speedMps > maxSpeedMps;

    if (isBoomerangSpike || isTeleportSpike) {
      continue;
    }
    spikeFiltered.push(curr);
  }
  spikeFiltered.push(points[points.length - 1]);

  // Pass 2: Collapse stationary GPS jitter clusters while preserving start & end
  const deduped: RoutePoint[] = [spikeFiltered[0]];
  for (let i = 1; i < spikeFiltered.length - 1; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = spikeFiltered[i];
    const dist = haversineMeters(prev.lat, prev.lng, curr.lat, curr.lng);
    if (dist >= minSpacingMeters) {
      deduped.push(curr);
    }
  }
  deduped.push(spikeFiltered[spikeFiltered.length - 1]);

  const rebuilt = rebuildRoutePoints(
    deduped,
    deduped[0].timeMs,
    deduped[deduped.length - 1].timeMs
  );

  return {
    points: rebuilt,
    removedCount: Math.max(0, points.length - rebuilt.length),
  };
}

export interface SnapResult {
  points: RoutePoint[];
  snappedChunks: number;
  fallbackChunks: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Snap route waypoints onto real Venetian footpaths, calli, and bridges using
 * Google Maps DirectionsService (WALKING mode). Preserves original timestamps
 * per chunk and falls back gracefully on water/vaporetto crossings.
 */
export async function snapRouteWithGoogleWalking(
  points: RoutePoint[],
  onProgress?: (label: string) => void
): Promise<SnapResult> {
  if (points.length < 2) {
    return {points, snappedChunks: 0, fallbackChunks: 0};
  }

  type DirectionsApi = {
    DirectionsService?: new () => {
      route: (
        req: {
          origin: {lat: number; lng: number};
          destination: {lat: number; lng: number};
          waypoints: Array<{location: {lat: number; lng: number}; stopover: boolean}>;
          travelMode: string;
          optimizeWaypoints: boolean;
        },
        cb: (
          result: {
            routes?: Array<{
              legs?: Array<{
                steps?: Array<{
                  path?: Array<{lat: () => number; lng: () => number}>;
                }>;
              }>;
              overview_path?: Array<{lat: () => number; lng: () => number}>;
            }>;
          } | null,
          status: string
        ) => void
      ) => void;
    };
  };

  const mapsApi = (
    window as unknown as {google?: {maps?: DirectionsApi}}
  ).google?.maps;

  if (!mapsApi?.DirectionsService) {
    throw new Error(
      'Google Maps DirectionsService is not loaded. Verify the Maps JavaScript API is active.'
    );
  }

  const service = new mapsApi.DirectionsService();

  // First collapse tiny < 15m jitter so we don't waste waypoint quota on stationary noise
  const anchors: RoutePoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = anchors[anchors.length - 1];
    if (haversineMeters(prev.lat, prev.lng, points[i].lat, points[i].lng) >= 18) {
      anchors.push(points[i]);
    }
  }
  anchors.push(points[points.length - 1]);

  // Google Directions JS API allows origin + up to 23 waypoints + destination = 25 points per call
  const MAX_POINTS_PER_CHUNK = 24;
  const chunks: RoutePoint[][] = [];
  for (let start = 0; start < anchors.length - 1; start += MAX_POINTS_PER_CHUNK - 1) {
    const end = Math.min(anchors.length, start + MAX_POINTS_PER_CHUNK);
    const slice = anchors.slice(start, end);
    if (slice.length >= 2) {
      chunks.push(slice);
    }
    if (end >= anchors.length) break;
  }

  const allSnappedCoords: LatLngCoord[] = [];
  let snappedChunks = 0;
  let fallbackChunks = 0;

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    onProgress?.(`Snapping walking segment ${c + 1} of ${chunks.length}…`);

    const origin = {lat: chunk[0].lat, lng: chunk[0].lng};
    const destination = {
      lat: chunk[chunk.length - 1].lat,
      lng: chunk[chunk.length - 1].lng,
    };
    const waypoints = chunk.slice(1, -1).map((p) => ({
      location: {lat: p.lat, lng: p.lng},
      stopover: true,
    }));

    const chunkStartMs = chunk[0].timeMs;
    const chunkEndMs = chunk[chunk.length - 1].timeMs;

    try {
      const result = await new Promise<Array<{lat: number; lng: number}>>(
        (resolve, reject) => {
          service.route(
            {
              origin,
              destination,
              waypoints,
              travelMode: 'WALKING',
              optimizeWaypoints: false,
            },
            (res, status) => {
              if (status === 'OK' && res?.routes?.[0]) {
                const route = res.routes[0];
                const detailed: Array<{lat: number; lng: number}> = [];
                if (route.legs && route.legs.length > 0) {
                  for (const leg of route.legs) {
                    for (const step of leg.steps ?? []) {
                      for (const pt of step.path ?? []) {
                        detailed.push({lat: pt.lat(), lng: pt.lng()});
                      }
                    }
                  }
                }
                if (detailed.length >= 2) {
                  resolve(detailed);
                } else if (route.overview_path && route.overview_path.length >= 2) {
                  resolve(
                    route.overview_path.map((pt) => ({lat: pt.lat(), lng: pt.lng()}))
                  );
                } else {
                  reject(new Error('Empty route path returned'));
                }
              } else {
                reject(new Error(`Directions API returned: ${status}`));
              }
            }
          );
        }
      );

      // Re-time this chunk's detailed snapped coordinates proportionally across [chunkStartMs, chunkEndMs]
      const timedChunk = rebuildRoutePoints(result, chunkStartMs, chunkEndMs);
      for (const pt of timedChunk) {
        allSnappedCoords.push({lat: pt.lat, lng: pt.lng, timeMs: pt.timeMs});
      }
      snappedChunks += 1;
    } catch {
      // Fallback to original direct points for this chunk (e.g. vaporetto water crossing)
      for (const pt of chunk) {
        allSnappedCoords.push({lat: pt.lat, lng: pt.lng, timeMs: pt.timeMs});
      }
      fallbackChunks += 1;
    }

    if (c < chunks.length - 1) {
      await sleep(240);
    }
  }

  const finalPoints = rebuildRoutePoints(
    allSnappedCoords,
    points[0].timeMs,
    points[points.length - 1].timeMs
  );

  return {
    points: finalPoints,
    snappedChunks,
    fallbackChunks,
  };
}

/**
 * Snap route coordinates using Google Maps Roads API (`snapToRoads` REST endpoint).
 * Best for drivable vehicle roads (e.g., Ponte della Libertà / Piazzale Roma).
 */
export async function snapRouteWithGoogleRoadsApi(
  points: RoutePoint[],
  apiKey: string,
  onProgress?: (label: string) => void
): Promise<SnapResult> {
  if (!apiKey) {
    throw new Error('Google Maps API key is required for Roads API snapping.');
  }
  if (points.length < 2) {
    return {points, snappedChunks: 0, fallbackChunks: 0};
  }

  const MAX_PER_BATCH = 100;
  const batches: RoutePoint[][] = [];
  for (let i = 0; i < points.length; i += MAX_PER_BATCH - 1) {
    const slice = points.slice(i, Math.min(points.length, i + MAX_PER_BATCH));
    if (slice.length >= 2) batches.push(slice);
    if (i + MAX_PER_BATCH >= points.length) break;
  }

  const snappedCoords: LatLngCoord[] = [];
  let snappedChunks = 0;
  let fallbackChunks = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    onProgress?.(`Calling Roads API batch ${b + 1} of ${batches.length}…`);

    const pathParam = batch.map((p) => `${p.lat},${p.lng}`).join('|');
    const url = `https://roads.googleapis.com/v1/snapToRoads?interpolate=true&path=${encodeURIComponent(pathParam)}&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(
        `Roads API error (${res.status}). Ensure Roads API is enabled on your Google Cloud key. ${errBody.slice(0, 140)}`
      );
    }

    const data = (await res.json()) as {
      snappedPoints?: Array<{location?: {latitude: number; longitude: number}}>;
    };

    if (data.snappedPoints && data.snappedPoints.length >= 2) {
      const batchCoords = data.snappedPoints
        .filter((sp) => sp.location)
        .map((sp) => ({
          lat: sp.location!.latitude,
          lng: sp.location!.longitude,
        }));
      const timed = rebuildRoutePoints(
        batchCoords,
        batch[0].timeMs,
        batch[batch.length - 1].timeMs
      );
      for (const pt of timed) {
        snappedCoords.push({lat: pt.lat, lng: pt.lng, timeMs: pt.timeMs});
      }
      snappedChunks += 1;
    } else {
      for (const pt of batch) {
        snappedCoords.push({lat: pt.lat, lng: pt.lng, timeMs: pt.timeMs});
      }
      fallbackChunks += 1;
    }
  }

  const finalPoints = rebuildRoutePoints(
    snappedCoords,
    points[0].timeMs,
    points[points.length - 1].timeMs
  );

  return {
    points: finalPoints,
    snappedChunks,
    fallbackChunks,
  };
}

/**
 * Download the calibrated route as a clean JSON file compatible with parseRouteJson().
 */
export function exportCalibratedRouteJson(route: ParsedRouteData): void {
  const payload = {
    date: new Date(route.startTimeMs).toISOString().slice(0, 10),
    location: route.locationLabel,
    calibrated: true,
    calibratedAt: new Date().toISOString(),
    summary: {
      totalRoutePoints: route.points.length,
      totalDistanceMeters: Math.round(route.totalDistanceMeters),
      startTime: new Date(route.startTimeMs).toISOString(),
      endTime: new Date(route.endTimeMs).toISOString(),
    },
    routePoints: route.points.map((p) => ({
      timestamp: p.timestamp,
      lat: p.lat,
      lng: p.lng,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const baseName = route.fileName.replace(/\.json$/i, '');
  const downloadName = baseName.endsWith('_calibrated')
    ? `${baseName}.json`
    : `${baseName}_calibrated.json`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
