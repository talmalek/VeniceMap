import {VENICE_HOME_GUARD_RAILS} from '../data/veniceData';

export interface RoutePoint {
  lat: number;
  lng: number;
  timeMs: number;
  timestamp: string;
  cumulativeDistanceMeters: number;
}

export interface ParsedRouteData {
  fileName: string;
  locationLabel: string;
  points: RoutePoint[];
  startTimeMs: number;
  endTimeMs: number;
  totalDistanceMeters: number;
  filteredOutCount: number;
}

export interface RouteProgressSnapshot {
  path: Array<{lat: number; lng: number; altitude: number}>;
  head: {lat: number; lng: number; timeMs: number};
  progress: number;
  distanceMeters: number;
  activePointIndex: number;
}

const EARTH_RADIUS_M = 6371000;

function haversineMeters(
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

export function isInsideMapBounds(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= VENICE_HOME_GUARD_RAILS.south &&
    lat <= VENICE_HOME_GUARD_RAILS.north &&
    lng >= VENICE_HOME_GUARD_RAILS.west &&
    lng <= VENICE_HOME_GUARD_RAILS.east
  );
}

/**
 * Parse degree strings such as "45.5015316°, 12.3390112°" from Google Maps semanticSegments.
 */
function parseLatLngString(raw: string): {lat: number; lng: number} | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/°/g, '').trim();
  const parts = cleaned.split(',');
  if (parts.length !== 2) return null;
  const lat = Number.parseFloat(parts[0].trim());
  const lng = Number.parseFloat(parts[1].trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {lat, lng};
}

interface RawCandidate {
  lat: number;
  lng: number;
  timeMs: number;
  timestamp: string;
}

/**
 * Parse a Google Maps Timeline JSON string and immediately discard all coordinates
 * outside VENICE_HOME_GUARD_RAILS so out-of-bounds data is never kept in memory.
 */
export function parseRouteJson(rawText: string, fileName: string): ParsedRouteData {
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON file. Could not parse file contents.');
  }
  return parseRouteObject(json, fileName);
}

/**
 * Parse an already-decoded Google Maps Timeline JSON object with strict map-bounds filtering.
 */
export function parseRouteObject(json: unknown, fileName: string): ParsedRouteData {
  if (!json || typeof json !== 'object') {
    throw new Error('Unsupported JSON structure. Expected a Google Maps timeline object.');
  }

  const root = json as Record<string, unknown>;
  const inBounds: RawCandidate[] = [];
  let filteredOutCount = 0;

  const ingestPoint = (lat: number, lng: number, rawTime: unknown) => {
    const timestamp = typeof rawTime === 'string' ? rawTime : '';
    const timeMs =
      typeof rawTime === 'number'
        ? rawTime
        : timestamp
          ? Date.parse(timestamp)
          : NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(timeMs)) {
      return;
    }

    if (!isInsideMapBounds(lat, lng)) {
      filteredOutCount += 1;
      return;
    }

    inBounds.push({
      lat,
      lng,
      timeMs,
      timestamp: timestamp || new Date(timeMs).toISOString(),
    });
  };

  // Format 1: Extracted timeline JSON with `routePoints`
  if (Array.isArray(root.routePoints)) {
    for (const entry of root.routePoints) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      ingestPoint(Number(item.lat), Number(item.lng), item.timestamp ?? item.time);
    }
  } else if (Array.isArray(root.semanticSegments)) {
    // Format 2: Raw Google Maps Timeline export (`semanticSegments[].timelinePath`)
    for (const seg of root.semanticSegments) {
      if (!seg || typeof seg !== 'object') continue;
      const segment = seg as Record<string, unknown>;
      if (Array.isArray(segment.timelinePath)) {
        for (const tp of segment.timelinePath) {
          if (!tp || typeof tp !== 'object') continue;
          const node = tp as Record<string, unknown>;
          const parsed = parseLatLngString(String(node.point ?? ''));
          if (parsed) {
            ingestPoint(parsed.lat, parsed.lng, node.time);
          }
        }
      }
    }
  } else if (Array.isArray(root.locations)) {
    // Format 3: Legacy Google Takeout Records.json (`locations[]` with E7 coords)
    for (const loc of root.locations) {
      if (!loc || typeof loc !== 'object') continue;
      const item = loc as Record<string, unknown>;
      const lat =
        typeof item.latitudeE7 === 'number'
          ? item.latitudeE7 / 1e7
          : Number(item.lat);
      const lng =
        typeof item.longitudeE7 === 'number'
          ? item.longitudeE7 / 1e7
          : Number(item.lng);
      const rawTime =
        item.timestamp ??
        (item.timestampMs ? Number(item.timestampMs) : undefined);
      ingestPoint(lat, lng, rawTime);
    }
  } else {
    throw new Error(
      'No supported timeline arrays found (expected routePoints, semanticSegments, or locations).'
    );
  }

  if (inBounds.length < 2) {
    throw new Error(
      inBounds.length === 0
        ? `No locations found inside Venice map boundaries (${filteredOutCount} outside points filtered).`
        : 'Only 1 location found inside Venice map boundaries. At least 2 points are required to draw a route.'
    );
  }

  // Sort chronologically
  inBounds.sort((a, b) => a.timeMs - b.timeMs);

  // Deduplicate exact identical timestamps + coords and compute cumulative distance
  const points: RoutePoint[] = [];
  let cumulativeDistanceMeters = 0;

  for (const item of inBounds) {
    const prev = points[points.length - 1];
    if (
      prev &&
      prev.timeMs === item.timeMs &&
      Math.abs(prev.lat - item.lat) < 1e-7 &&
      Math.abs(prev.lng - item.lng) < 1e-7
    ) {
      continue;
    }

    if (prev) {
      cumulativeDistanceMeters += haversineMeters(
        prev.lat,
        prev.lng,
        item.lat,
        item.lng
      );
    }

    points.push({
      lat: item.lat,
      lng: item.lng,
      timeMs: item.timeMs,
      timestamp: item.timestamp,
      cumulativeDistanceMeters,
    });
  }

  if (points.length < 2) {
    throw new Error('Route must contain at least 2 distinct points inside Venice map boundaries.');
  }

  const locationLabel =
    typeof root.location === 'string' && root.location.trim()
      ? root.location.trim()
      : 'Venice, Italy';

  return {
    fileName,
    locationLabel,
    points,
    startTimeMs: points[0].timeMs,
    endTimeMs: points[points.length - 1].timeMs,
    totalDistanceMeters: cumulativeDistanceMeters,
    filteredOutCount,
  };
}

/**
 * Compute the smoothly interpolated route polyline and current head position
 * for any timestamp along [startTimeMs, endTimeMs].
 */
export function getRouteProgressAtTime(
  route: ParsedRouteData,
  currentTimeMs: number,
  altitude: number = 4
): RouteProgressSnapshot {
  const {points, startTimeMs, endTimeMs} = route;
  const clampedTime = Math.min(endTimeMs, Math.max(startTimeMs, currentTimeMs));
  const duration = Math.max(1, endTimeMs - startTimeMs);
  const progress = (clampedTime - startTimeMs) / duration;

  // Binary search for the last point with timeMs <= clampedTime
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (points[mid].timeMs <= clampedTime) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const path: Array<{lat: number; lng: number; altitude: number}> = new Array(lo + 1);
  for (let i = 0; i <= lo; i++) {
    path[i] = {lat: points[i].lat, lng: points[i].lng, altitude};
  }

  const curr = points[lo];
  const next = points[lo + 1];

  if (next && next.timeMs > curr.timeMs && clampedTime > curr.timeMs) {
    const segT = (clampedTime - curr.timeMs) / (next.timeMs - curr.timeMs);
    const interpLat = curr.lat + (next.lat - curr.lat) * segT;
    const interpLng = curr.lng + (next.lng - curr.lng) * segT;
    const interpDist =
      curr.cumulativeDistanceMeters +
      (next.cumulativeDistanceMeters - curr.cumulativeDistanceMeters) * segT;

    path.push({lat: interpLat, lng: interpLng, altitude});

    return {
      path,
      head: {lat: interpLat, lng: interpLng, timeMs: clampedTime},
      progress,
      distanceMeters: interpDist,
      activePointIndex: lo,
    };
  }

  return {
    path,
    head: {lat: curr.lat, lng: curr.lng, timeMs: clampedTime},
    progress,
    distanceMeters: curr.cumulativeDistanceMeters,
    activePointIndex: lo,
  };
}
