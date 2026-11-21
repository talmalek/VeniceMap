import sanMarcoImg from '../assets/images/venice_san_marco_1794385966785.jpg';
import dogesPalaceImg from '../assets/images/venice_doges_palace_1795262443727.jpg';
import rialtoBridgeImg from '../assets/images/venice_rialto_bridge_1794385965330.jpg';
import bridgeSighsImg from '../assets/images/venice_bridge_sighs_1795262443174.jpg';
import saluteBasilicaImg from '../assets/images/venice_salute_basilica_1794385968671.jpg';
import accademiaBridgeImg from '../assets/images/venice_accademia_bridge_1795262443537.jpg';
import peggyGuggenheimImg from '../assets/images/venice_peggy_guggenheim_1795262443357.jpg';
import teatroFeniceImg from '../assets/images/venice_teatro_fenice_1795262442252.jpg';
import sanGiorgioImg from '../assets/images/venice_san_giorgio_1795262271600.jpg';
import caDoroImg from '../assets/images/venice_ca_doro_1795262444585.jpg';
import frariBasilicaImg from '../assets/images/venice_frari_basilica_1795262446373.jpg';
import acquaAltaImg from '../assets/images/venice_acqua_alta_1795262444341.jpg';
import bovoloStaircaseImg from '../assets/images/venice_bovolo_staircase_1795262444398.jpg';
import puntaDoganaImg from '../assets/images/venice_punta_dogana_1795262443973.jpg';
import rialtoMarketImg from '../assets/images/venice_rialto_market_1795262444644.jpg';
import arsenaleBasinImg from '../assets/images/venice_arsenale_basin_1795262272734.jpg';
import muranoIslandImg from '../assets/images/venice_murano_island_1795262445082.jpg';
import cannaregioCanalImg from '../assets/images/venice_murano_canal_1794385969414.jpg';
import sanMicheleImg from '../assets/images/venice_san_michele_1795262269342.jpg';
import molinoStuckyImg from '../assets/images/venice_molino_stucky_1795262271958.jpg';

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  rotationDeg: number;
}

/**
 * Sub-pixel Geodetic Calibration for the original 2500 x 2000 master photograph
 * (/assets/aistudio/venice1_4a0244c8.jpeg)
 */
export const DEFAULT_VENICE_BOUNDS: GeoBounds = {
  north: 45.457208,
  south: 45.419228,
  east: 12.365729,
  west: 12.297892,
  rotationDeg: -5.586,
};

/**
 * Calibrated 16:9 Widescreen Outpainted Geodetic Bounds
 * (/src/assets/images/venice_aerial_16_9_outpaint_1794417433070.jpg)
 * Naturally extends the original 2500x2000 aerial survey across the full 16:9 viewport
 * (from Ponte della Libertà & Marghera in the west to Certosa, Sant'Erasmo & Lido in the east).
 * The original 2500x2000 high-resolution image sits inside this frame at:
 * left: 16.48%, top: 6.98%, width: 60.14%, height: 76.81%.
 */
export const WIDESCREEN_OUTPAINT_OFFSET = {
  leftPercent: 16.48,
  topPercent: 6.98,
  widthPercent: 60.14,
  heightPercent: 76.81,
};

export function computeWidescreenBounds(coreBounds: GeoBounds): GeoBounds {
  const spanLat = coreBounds.north - coreBounds.south;
  const spanLng = coreBounds.east - coreBounds.west;

  const uMin = (0 - WIDESCREEN_OUTPAINT_OFFSET.leftPercent) / WIDESCREEN_OUTPAINT_OFFSET.widthPercent;
  const uMax = (100 - WIDESCREEN_OUTPAINT_OFFSET.leftPercent) / WIDESCREEN_OUTPAINT_OFFSET.widthPercent;
  const vMin = (0 - WIDESCREEN_OUTPAINT_OFFSET.topPercent) / WIDESCREEN_OUTPAINT_OFFSET.heightPercent;
  const vMax = (100 - WIDESCREEN_OUTPAINT_OFFSET.topPercent) / WIDESCREEN_OUTPAINT_OFFSET.heightPercent;

  return {
    north: Number((coreBounds.north - vMin * spanLat).toFixed(6)),
    south: Number((coreBounds.north - vMax * spanLat).toFixed(6)),
    west: Number((coreBounds.west + uMin * spanLng).toFixed(6)),
    east: Number((coreBounds.west + uMax * spanLng).toFixed(6)),
    rotationDeg: coreBounds.rotationDeg,
  };
}

export const VENICE_CENTER = {
  lat: 45.4372,
  lng: 12.3338,
};

/**
 * Geographic Guard Rails matching the home page boundaries:
 * Top-left corner: lat 45.4607, lng 12.2793
 * Bottom-right corner: lat 45.4112, lng 12.3921
 */
export const VENICE_HOME_GUARD_RAILS = {
  north: 45.4607,
  south: 45.4112,
  west: 12.2793,
  east: 12.3921,
};

export const VENICE_AERIAL_IMAGE_URL = '/assets/aistudio/venice1_4a0244c8.jpeg';
export const VENICE_WIDESCREEN_IMAGE_URL =
  '/src/assets/images/venice_aerial_16_9_outpaint_1794417433070.jpg';

/**
 * Compute the exact Google Maps fractional zoom level so that the 16:9 widescreen
 * Venice aerial photograph fills 100% of the browser viewport edge-to-edge on load.
 */
export function computeViewportCoverZoom(
  viewportWidth: number,
  viewportHeight: number,
  coreBounds: GeoBounds = DEFAULT_VENICE_BOUNDS
): number {
  const wide = computeWidescreenBounds(coreBounds);
  const spanLng = wide.east - wide.west;
  const spanLat = wide.north - wide.south;
  const cosLat = Math.cos((VENICE_CENTER.lat * Math.PI) / 180);

  // World pixels at zoom 0 (256px tile size)
  const worldWidthAtZoom0 = 256 * (spanLng / 360);
  const worldHeightAtZoom0 = 256 * (spanLat / (360 * cosLat));

  // Add 14% margin so the rotated (-5.586 deg) frame completely covers all 4 screen corners
  const targetWidth = Math.max(320, viewportWidth) * 1.14;
  const targetHeight = Math.max(320, viewportHeight) * 1.14;

  const zoomX = Math.log2(targetWidth / worldWidthAtZoom0);
  const zoomY = Math.log2(targetHeight / worldHeightAtZoom0);

  const coverZoom = Math.max(zoomX, zoomY);
  return Number(Math.max(13.6, Math.min(14.8, coverZoom)).toFixed(2));
}

/**
 * Convert standard Web Mercator fractional zoom to Map3D range (camera distance in meters)
 * based on Google Maps 3D default vertical FOV = 35 degrees and viewport height.
 */
export function zoomTo3DRange(zoom: number, viewportHeight: number = 800): number {
  const tanHalfFov = Math.tan((35 / 2) * (Math.PI / 180)); // 0.3152988
  const groundHeight = (viewportHeight * 109846) / Math.pow(2, zoom);
  return Math.max(250, groundHeight / (2 * tanHalfFov));
}

/**
 * Convert Map3D range (camera distance in meters) to standard Web Mercator fractional zoom
 */
export function rangeTo3DZoom(range: number, viewportHeight: number = 800): number {
  const tanHalfFov = Math.tan((35 / 2) * (Math.PI / 180));
  const groundHeight = 2 * range * tanHalfFov;
  const zoom = Math.log2((viewportHeight * 109846) / groundHeight);
  return Number(Math.max(12, Math.min(21, zoom)).toFixed(2));
}

export interface GeotaggedPhoto {
  id: string;
  title: string;
  subtitle: string;
  sestiere: string;
  description: string;
  imageUrl: string;
  lat: number;
  lng: number;
  isLandmark?: boolean;
  isUserUploaded?: boolean;
  hasGps?: boolean;
  fileName?: string;
  placeQuery: string;
  exif: {
    camera: string;
    lens: string;
    focalLength: string;
    aperture: string;
    shutterSpeed: string;
    iso: string;
    capturedAt: string;
    altitudeMeters?: number;
  };
}

export interface VeniceZone {
  id: string;
  name: string;
  italianTitle: string;
  summary: string;
  keyHighlights: string[];
  lat: number;
  lng: number;
  radiusDeg: number;
}

export const VENICE_ZONES: VeniceZone[] = [
  {
    id: 'san-marco',
    name: 'Sestiere di San Marco',
    italianTitle: 'Cuore Politico e Monumentale',
    summary:
      'The historic civic and religious heart of the Venetian Republic, home to St. Mark’s Basilica, the Doge’s Palace, and the Campanile.',
    keyHighlights: [
      'Piazza San Marco',
      'Palazzo Ducale',
      'Basilica di San Marco',
      'Teatro La Fenice',
    ],
    lat: 45.434167,
    lng: 12.3388,
    radiusDeg: 0.0055,
  },
  {
    id: 'rialto-san-polo',
    name: 'San Polo & Rialto',
    italianTitle: 'Mercato Storico sul Canal Grande',
    summary:
      'The commercial epicenter of Venice since 1097, anchored by the stone arch of Ponte di Rialto and the historic spice and fish markets.',
    keyHighlights: [
      'Ponte di Rialto',
      'Mercato di Rialto',
      'Basilica dei Frari',
      'Campo San Polo',
    ],
    lat: 45.437984,
    lng: 12.335898,
    radiusDeg: 0.0055,
  },
  {
    id: 'dorsoduro',
    name: 'Dorsoduro & Punta della Dogana',
    italianTitle: 'Promontorio dell’Arte e della Salute',
    summary:
      'A sunlit southern promenade where the Grand Canal meets the Giudecca Canal, crowned by Santa Maria della Salute and major art collections.',
    keyHighlights: [
      'Basilica della Salute',
      'Punta della Dogana',
      'Gallerie dell’Accademia',
      'Zattere Promenade',
    ],
    lat: 45.43069,
    lng: 12.33472,
    radiusDeg: 0.006,
  },
  {
    id: 'cannaregio',
    name: 'Sestiere di Cannaregio',
    italianTitle: 'Canali Settentrionali e Fondamenta',
    summary:
      'The northern district characterized by long parallel canals, quiet artisan workshops, the historic Ghetto, and views toward Murano.',
    keyHighlights: [
      'Fondamenta della Misericordia',
      'Ca’ d’Oro',
      'Ghetto Nuovo',
      'Madonna dell’Orto',
    ],
    lat: 45.44372,
    lng: 12.33245,
    radiusDeg: 0.0065,
  },
  {
    id: 'castello-arsenale',
    name: 'Castello & Arsenale',
    italianTitle: 'Cantieri Navali della Serenissima',
    summary:
      'The largest sestiere of Venice, housing the fortified medieval shipyards of the Venetian Arsenal and the green Biennale Gardens.',
    keyHighlights: [
      'Arsenale di Venezia',
      'Giardini della Biennale',
      'San Pietro di Castello',
      'Via Garibaldi',
    ],
    lat: 45.43545,
    lng: 12.35265,
    radiusDeg: 0.0075,
  },
  {
    id: 'giudecca-san-giorgio',
    name: 'Giudecca & San Giorgio Maggiore',
    italianTitle: 'Isole Meridionali della Laguna',
    summary:
      'An elongated arc of islands south of the main city offering panoramic vistas across the water toward the Doge’s Palace.',
    keyHighlights: [
      'Basilica di San Giorgio Maggiore',
      'Chiesa del Redentore',
      'Molino Stucky',
      'Canale della Giudecca',
    ],
    lat: 45.4293,
    lng: 12.3433,
    radiusDeg: 0.007,
  },
  {
    id: 'san-michele-murano',
    name: 'San Michele & Isola di Murano',
    italianTitle: 'Laguna Nord e Arte Vetraria',
    summary:
      'The cypress-lined monumental island of San Michele and the world-renowned glassmaking archipelago of Murano to the northeast.',
    keyHighlights: [
      'Isola di San Michele',
      'Canal Grande di Murano',
      'Museo del Vetro',
      'Basilica dei Santi Maria e Donato',
    ],
    lat: 45.44715,
    lng: 12.34695,
    radiusDeg: 0.0085,
  },
  {
    id: 'santa-croce-piazzale',
    name: 'Santa Croce, Stazione & Tronchetto',
    italianTitle: 'Porta Occidentale di Venezia',
    summary:
      'The western gateway where the Ponte della Libertà causeway connects the mainland to Santa Lucia Station and the Grand Canal.',
    keyHighlights: [
      'Ponte della Libertà',
      'Stazione di Venezia Santa Lucia',
      'Ponte della Costituzione',
      'Isola del Tronchetto',
    ],
    lat: 45.44107,
    lng: 12.32106,
    radiusDeg: 0.0085,
  },
];

export const INITIAL_GEOTAGGED_PHOTOS: GeotaggedPhoto[] = [
  {
    id: 'photo-san-marco',
    title: 'Piazza San Marco & Campanile',
    subtitle: 'Heart of the Venetian Republic',
    sestiere: 'San Marco · Piazzetta',
    description:
      'First light breaking across the marble flagstones of Venice’s grand civic square, framed by the 98.6-meter Campanile di San Marco, the Basilica’s golden domes, and the Procuratie arcades.',
    imageUrl: sanMarcoImg,
    lat: 45.43417,
    lng: 12.3388,
    isLandmark: true,
    placeQuery: 'Piazza San Marco, Venice, Italy',
    exif: {
      camera: 'Sony Alpha 7R V',
      lens: 'FE 24-70mm f/2.8 GM II',
      focalLength: '28mm',
      aperture: 'f/8.0',
      shutterSpeed: '1/125s',
      iso: 'ISO 100',
      capturedAt: '2026-09-19 06:38 CEST',
      altitudeMeters: 2,
    },
  },
  {
    id: 'photo-doges-palace',
    title: 'Palazzo Ducale (Doge’s Palace)',
    subtitle: 'Venetian Gothic Waterfront Masterpiece',
    sestiere: 'San Marco · Molo',
    description:
      'The iconic pink-and-white Verona marble diamond facade rising above delicate Istrian stone Gothic loggias, overlooking the gondolas moored along the San Marco Basin.',
    imageUrl: dogesPalaceImg,
    lat: 45.43367,
    lng: 12.34039,
    isLandmark: true,
    placeQuery: 'Doge’s Palace, Venice, Italy',
    exif: {
      camera: 'Leica M11',
      lens: 'Summilux-M 35mm f/1.4 ASPH',
      focalLength: '35mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/400s',
      iso: 'ISO 100',
      capturedAt: '2026-09-19 18:12 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-rialto',
    title: 'Ponte di Rialto',
    subtitle: 'Grand Canal Central Stone Archway',
    sestiere: 'San Polo · Canal Grande',
    description:
      'Designed by Antonio da Ponte and completed in 1591, the sweeping Istrian stone arch spans the narrowest point of the Grand Canal above bustling Riva del Vin gondola moorings.',
    imageUrl: rialtoBridgeImg,
    lat: 45.43798,
    lng: 12.3359,
    isLandmark: true,
    placeQuery: 'Ponte di Rialto, Venice, Italy',
    exif: {
      camera: 'Leica M11',
      lens: 'Summilux-M 35mm f/1.4 ASPH',
      focalLength: '35mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/320s',
      iso: 'ISO 125',
      capturedAt: '2026-09-18 17:42 CEST',
      altitudeMeters: 4,
    },
  },
  {
    id: 'photo-bridge-sighs',
    title: 'Ponte dei Sospiri (Bridge of Sighs)',
    subtitle: 'Baroque Limestone Span Over Rio di Palazzo',
    sestiere: 'San Marco · Rio di Palazzo',
    description:
      'Built in 1600 by Antonio Contino from sculpted white Istrian limestone, this enclosed Baroque bridge links the Doge’s Palace interrogation chambers to the historic Prigioni Nuove.',
    imageUrl: bridgeSighsImg,
    lat: 45.43406,
    lng: 12.34086,
    isLandmark: true,
    placeQuery: 'Bridge of Sighs, Venice, Italy',
    exif: {
      camera: 'Leica M11',
      lens: 'APO-Summicron-M 50mm f/2 ASPH',
      focalLength: '50mm',
      aperture: 'f/4.0',
      shutterSpeed: '1/250s',
      iso: 'ISO 160',
      capturedAt: '2026-09-19 14:22 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-salute',
    title: 'Basilica di Santa Maria della Salute',
    subtitle: 'Baroque Crown of the Grand Canal',
    sestiere: 'Dorsoduro · Punta della Dogana',
    description:
      'Baldassare Longhena’s monumental octagonal Baroque basilica and soaring dome illuminated at dusk where the Grand Canal opens into the San Marco Basin.',
    imageUrl: saluteBasilicaImg,
    lat: 45.43069,
    lng: 12.33472,
    isLandmark: true,
    placeQuery: 'Basilica di Santa Maria della Salute, Venice, Italy',
    exif: {
      camera: 'Hasselblad X2D 100C',
      lens: 'XCD 38V f/2.5',
      focalLength: '38mm',
      aperture: 'f/4.0',
      shutterSpeed: '1/40s',
      iso: 'ISO 400',
      capturedAt: '2026-09-19 20:14 CEST',
      altitudeMeters: 5,
    },
  },
  {
    id: 'photo-accademia-bridge',
    title: 'Ponte dell’Accademia & Grand Canal',
    subtitle: 'Iconic Sunset Vista Toward La Salute',
    sestiere: 'Dorsoduro · Accademia',
    description:
      'The beloved wooden arch bridge connecting Dorsoduro and San Marco near Gallerie dell’Accademia, famous for the sweeping sunset panorama down the Grand Canal toward Santa Maria della Salute.',
    imageUrl: accademiaBridgeImg,
    lat: 45.43168,
    lng: 12.32895,
    isLandmark: true,
    placeQuery: 'Ponte dell’Accademia, Venice, Italy',
    exif: {
      camera: 'Hasselblad X2D 100C',
      lens: 'XCD 28P f/4',
      focalLength: '28mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/80s',
      iso: 'ISO 200',
      capturedAt: '2026-09-18 19:28 CEST',
      altitudeMeters: 6,
    },
  },
  {
    id: 'photo-peggy-guggenheim',
    title: 'Peggy Guggenheim Collection',
    subtitle: 'Palazzo Venier dei Leoni on the Grand Canal',
    sestiere: 'Dorsoduro · Canal Grande',
    description:
      'Venice’s renowned modern art museum housed inside the distinctive unfinished 18th-century white Istrian stone palace with its lush sculpture garden and Grand Canal terrace.',
    imageUrl: peggyGuggenheimImg,
    lat: 45.43078,
    lng: 12.33154,
    isLandmark: true,
    placeQuery: 'Peggy Guggenheim Collection, Venice, Italy',
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      focalLength: '28mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/500s',
      iso: 'ISO 100',
      capturedAt: '2026-09-20 16:15 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-teatro-fenice',
    title: 'Teatro La Fenice',
    subtitle: 'Venice’s Legendary Historic Opera House',
    sestiere: 'San Marco · Campo San Fantin',
    description:
      'Reborn from the ashes twice since 1792, the Neoclassical Istrian stone facade crowned by the gilded phoenix hosts world premieres and grand Venetian opera evenings.',
    imageUrl: teatroFeniceImg,
    lat: 45.4336,
    lng: 12.33376,
    isLandmark: true,
    placeQuery: 'Teatro La Fenice, Venice, Italy',
    exif: {
      camera: 'Leica M11',
      lens: 'Summilux-M 35mm f/1.4 ASPH',
      focalLength: '35mm',
      aperture: 'f/2.8',
      shutterSpeed: '1/60s',
      iso: 'ISO 640',
      capturedAt: '2026-09-19 20:42 CEST',
      altitudeMeters: 2,
    },
  },
  {
    id: 'photo-san-giorgio',
    title: 'Isola di San Giorgio Maggiore',
    subtitle: 'Palladian Monastic Island & Campanile',
    sestiere: 'San Marco Basin · Isola',
    description:
      'Andrea Palladio’s gleaming white marble basilica, Renaissance dome, and panoramic red-brick Campanile rising across the turquoise waters opposite Piazza San Marco.',
    imageUrl: sanGiorgioImg,
    lat: 45.4293,
    lng: 12.3433,
    isLandmark: true,
    placeQuery: 'Isola di San Giorgio Maggiore, Venice, Italy',
    exif: {
      camera: 'Leica M11',
      lens: 'APO-Summicron-M 50mm f/2 ASPH',
      focalLength: '50mm',
      aperture: 'f/6.3',
      shutterSpeed: '1/640s',
      iso: 'ISO 100',
      capturedAt: '2026-09-20 16:50 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-ca-doro',
    title: 'Ca’ d’Oro (Palazzo Santa Sofia)',
    subtitle: 'The Golden House on the Grand Canal',
    sestiere: 'Cannaregio · Canal Grande',
    description:
      'The crown jewel of Venetian Flamboyant Gothic architecture, celebrated for its lacy Istrian stone quatrefoil loggias, rose Verona marble facade, and Galleria Franchetti collection.',
    imageUrl: caDoroImg,
    lat: 45.44056,
    lng: 12.33389,
    isLandmark: true,
    placeQuery: 'Ca’ d’Oro, Venice, Italy',
    exif: {
      camera: 'Sony Alpha 7R V',
      lens: 'FE 35mm f/1.4 GM',
      focalLength: '35mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/500s',
      iso: 'ISO 100',
      capturedAt: '2026-09-20 17:18 CEST',
      altitudeMeters: 4,
    },
  },
  {
    id: 'photo-frari',
    title: 'Basilica di Santa Maria Gloriosa dei Frari',
    subtitle: 'Monumental Gothic Church & Titian’s Assumption',
    sestiere: 'San Polo · Campo dei Frari',
    description:
      'One of Venice’s grandest brick Gothic churches and its second-tallest bell tower, sheltering masterpieces by Titian, Giovanni Bellini, Donatello, and Antonio Canova.',
    imageUrl: frariBasilicaImg,
    lat: 45.43667,
    lng: 12.32611,
    isLandmark: true,
    placeQuery: 'Basilica di Santa Maria Gloriosa dei Frari, Venice, Italy',
    exif: {
      camera: 'Leica M11',
      lens: 'Elmarit-M 28mm f/2.8 ASPH',
      focalLength: '28mm',
      aperture: 'f/8.0',
      shutterSpeed: '1/400s',
      iso: 'ISO 100',
      capturedAt: '2026-09-20 15:05 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-acqua-alta',
    title: 'Libreria Acqua Alta',
    subtitle: 'Venice’s Famous Canal-Side Bookshop',
    sestiere: 'Castello · Calle Longa S. Maria Formosa',
    description:
      'Beloved worldwide for its vintage books stacked inside wooden gondolas and its colorful courtyard book staircase opening directly onto a tranquil Castello canal.',
    imageUrl: acquaAltaImg,
    lat: 45.4381,
    lng: 12.3423,
    isLandmark: true,
    placeQuery: 'Libreria Acqua Alta, Venice, Italy',
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      focalLength: '28mm',
      aperture: 'f/2.8',
      shutterSpeed: '1/200s',
      iso: 'ISO 200',
      capturedAt: '2026-09-21 10:34 CEST',
      altitudeMeters: 2,
    },
  },
  {
    id: 'photo-bovolo',
    title: 'Scala Contarini del Bovolo',
    subtitle: 'Hidden Renaissance Spiral Staircase Tower',
    sestiere: 'San Marco · Corte del Bovolo',
    description:
      'Built around 1499 in warm terracotta brick and stacked Istrian stone arches, this snail-shell external spiral staircase ascends to a domed belvedere over Venice’s rooftops.',
    imageUrl: bovoloStaircaseImg,
    lat: 45.43482,
    lng: 12.33453,
    isLandmark: true,
    placeQuery: 'Scala Contarini del Bovolo, Venice, Italy',
    exif: {
      camera: 'Leica M11',
      lens: 'Elmarit-M 28mm f/2.8 ASPH',
      focalLength: '28mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/320s',
      iso: 'ISO 100',
      capturedAt: '2026-09-21 09:15 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-punta-dogana',
    title: 'Punta della Dogana',
    subtitle: 'Historic Maritime Customs House & Pinault Museum',
    sestiere: 'Dorsoduro · Punta della Dogana',
    description:
      'Standing at the prow where the Grand Canal meets the Giudecca Canal, the 17th-century customs house is crowned by twin bronze Atlases supporting the gleaming golden sphere of Fortune.',
    imageUrl: puntaDoganaImg,
    lat: 45.43098,
    lng: 12.33566,
    isLandmark: true,
    placeQuery: 'Punta della Dogana, Venice, Italy',
    exif: {
      camera: 'Hasselblad X2D 100C',
      lens: 'XCD 38V f/2.5',
      focalLength: '38mm',
      aperture: 'f/6.3',
      shutterSpeed: '1/250s',
      iso: 'ISO 100',
      capturedAt: '2026-09-20 18:48 CEST',
      altitudeMeters: 4,
    },
  },
  {
    id: 'photo-rialto-market',
    title: 'Mercato di Rialto & Pescheria',
    subtitle: 'Centuries-Old Grand Canal Market Loggia',
    sestiere: 'San Polo · Campo della Pescaria',
    description:
      'Venice’s historic culinary heart since 1097, where wooden barges unload fresh Adriatic seafood and lagoon produce beneath the neo-Gothic brick and stone arches of the Pescheria.',
    imageUrl: rialtoMarketImg,
    lat: 45.43959,
    lng: 12.33458,
    isLandmark: true,
    placeQuery: 'Mercato di Rialto, Venice, Italy',
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      focalLength: '28mm',
      aperture: 'f/4.0',
      shutterSpeed: '1/400s',
      iso: 'ISO 100',
      capturedAt: '2026-09-21 08:22 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-arsenale',
    title: 'Arsenale di Venezia & Torri dell’Arsenale',
    subtitle: 'Historic Naval Shipyards & Biennale Venue',
    sestiere: 'Castello · Arsenale',
    description:
      'The twin medieval red-brick watchtowers flanking the water entrance to the fortified Venetian Arsenal basin, where the Serenissima built its legendary maritime fleet.',
    imageUrl: arsenaleBasinImg,
    lat: 45.43484,
    lng: 12.34975,
    isLandmark: true,
    placeQuery: 'Arsenale di Venezia, Venice, Italy',
    exif: {
      camera: 'Leica M11',
      lens: 'Summilux-M 35mm f/1.4 ASPH',
      focalLength: '35mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/640s',
      iso: 'ISO 100',
      capturedAt: '2026-09-15 15:20 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-murano-island-glass',
    title: 'Isola di Murano · Ponte Longo & Canal Grande',
    subtitle: 'World-Famous Venetian Glassmaking Island',
    sestiere: 'Murano · Canal Grande di Murano',
    description:
      'Home to master glassblowers since 1291, Murano’s wide Grand Canal is lined with sunlit pastel artisan houses, centuries-old furnaces, and the graceful stone arch of Ponte Longo.',
    imageUrl: muranoIslandImg,
    lat: 45.456,
    lng: 12.3531,
    isLandmark: true,
    placeQuery: 'Ponte Longo, Murano, Venice, Italy',
    exif: {
      camera: 'Leica M11',
      lens: 'Summilux-M 35mm f/1.4 ASPH',
      focalLength: '35mm',
      aperture: 'f/6.3',
      shutterSpeed: '1/800s',
      iso: 'ISO 100',
      capturedAt: '2026-09-21 12:40 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-murano-cannaregio',
    title: 'Fondamenta della Misericordia',
    subtitle: 'Authentic Northern Canal & Bacari Promenade',
    sestiere: 'Cannaregio · Fondamenta',
    description:
      'Traditional wooden boats moored beside weathered Istrian stone quays, terracotta palazzi, and lively local cicchetti bars along one of Cannaregio’s most atmospheric waterways.',
    imageUrl: cannaregioCanalImg,
    lat: 45.44372,
    lng: 12.33245,
    isLandmark: true,
    placeQuery: 'Fondamenta della Misericordia, Venice, Italy',
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      focalLength: '28mm',
      aperture: 'f/4.5',
      shutterSpeed: '1/500s',
      iso: 'ISO 100',
      capturedAt: '2026-09-20 11:25 CEST',
      altitudeMeters: 3,
    },
  },
  {
    id: 'photo-murano-island',
    title: 'Isola di San Michele',
    subtitle: 'Cypress-Walled Renaissance Lagoon Island',
    sestiere: 'Isola di San Michele · Northern Lagoon',
    description:
      'The tranquil red-brick walled island rising between Fondamente Nove and Murano, crowned with tall Mediterranean cypresses and Mauro Codussi’s white Istrian stone Renaissance church.',
    imageUrl: sanMicheleImg,
    lat: 45.44715,
    lng: 12.34695,
    isLandmark: true,
    placeQuery: 'Isola di San Michele, Venice, Italy',
    exif: {
      camera: 'Sony Alpha 7R V',
      lens: 'FE 35mm f/1.4 GM',
      focalLength: '35mm',
      aperture: 'f/5.0',
      shutterSpeed: '1/400s',
      iso: 'ISO 100',
      capturedAt: '2026-09-21 14:18 CEST',
      altitudeMeters: 2,
    },
  },
  {
    id: 'photo-giudecca',
    title: 'Canale della Giudecca & Molino Stucky',
    subtitle: 'Historic Neo-Gothic Waterfront Landmark',
    sestiere: 'Giudecca · Canale della Giudecca',
    description:
      'The monumental red-brick stepped gables and central tower of the 19th-century Molino Stucky rising along the wide deepwater Giudecca Canal with sweeping views across to Dorsoduro.',
    imageUrl: molinoStuckyImg,
    lat: 45.42831,
    lng: 12.32032,
    isLandmark: true,
    placeQuery: 'Molino Stucky, Giudecca, Venice, Italy',
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      focalLength: '28mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/800s',
      iso: 'ISO 100',
      capturedAt: '2026-09-21 17:05 CEST',
      altitudeMeters: 4,
    },
  },
];

/**
 * Convert geographic { lat, lng } to normalized image coordinates { xPercent, yPercent } (0 to 100)
 */
export function latLngToImagePercent(
  lat: number,
  lng: number,
  bounds: GeoBounds = DEFAULT_VENICE_BOUNDS
): {xPercent: number; yPercent: number; isInside: boolean} {
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;
  const spanLat = bounds.north - bounds.south;
  const spanLng = bounds.east - bounds.west;
  const cosLat = Math.cos((centerLat * Math.PI) / 180);

  const dX = (lng - centerLng) * cosLat;
  const dY = centerLat - lat;

  const rad = ((-bounds.rotationDeg || 0) * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const imgX = dX * cosR - dY * sinR;
  const imgY = dX * sinR + dY * cosR;

  const u = 0.5 + imgX / (spanLng * cosLat);
  const v = 0.5 + imgY / spanLat;

  const isInside = u >= 0 && u <= 1 && v >= 0 && v <= 1;
  return {
    xPercent: Math.max(0, Math.min(100, u * 100)),
    yPercent: Math.max(0, Math.min(100, v * 100)),
    isInside,
  };
}

/**
 * Convert normalized image ratio (u in 0..1, v in 0..1) to geographic { lat, lng }
 */
export function imageRatioToLatLng(
  u: number,
  v: number,
  bounds: GeoBounds = DEFAULT_VENICE_BOUNDS
): {lat: number; lng: number} {
  const clampedU = Math.max(0, Math.min(1, u));
  const clampedV = Math.max(0, Math.min(1, v));

  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;
  const spanLat = bounds.north - bounds.south;
  const spanLng = bounds.east - bounds.west;
  const cosLat = Math.cos((centerLat * Math.PI) / 180);

  const imgX = (clampedU - 0.5) * (spanLng * cosLat);
  const imgY = (clampedV - 0.5) * spanLat;

  const rad = ((bounds.rotationDeg || 0) * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const dX = imgX * cosR - imgY * sinR;
  const dY = imgX * sinR + imgY * cosR;

  const lng = centerLng + dX / cosLat;
  const lat = centerLat - dY;
  return {lat, lng};
}

export function findClosestVeniceZone(lat: number, lng: number): VeniceZone | null {
  let closest: VeniceZone | null = null;
  let minDistance = Infinity;

  for (const zone of VENICE_ZONES) {
    const dLat = lat - zone.lat;
    const dLng = (lng - zone.lng) * 0.7016;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < zone.radiusDeg && dist < minDistance) {
      minDistance = dist;
      closest = zone;
    }
  }
  return closest;
}

export function formatCoord(value: number, isLat: boolean): string {
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${Math.abs(value).toFixed(4)}° ${dir}`;
}
