import React, {useState} from 'react';

interface VeniceVectorMapProps {
  className?: string;
  onSelectDistrict?: (lat: number, lng: number, name: string) => void;
}

interface SestiereShape {
  id: string;
  name: string;
  lat: number;
  lng: number;
  path: string;
  subdivisions: string[];
}

/**
 * Authentic Cartographic Vector Silhouette of Venice's Historic Lagoon Islands:
 * - Six historic Sestieri separated by the sweeping reverse-S Grand Canal
 * - Giudecca crescent, Isola di San Giorgio Maggiore, Tronchetto & Isola di San Michele
 * Styled as crisp white segmented territories with fine lagoon-emerald partition lines.
 */
const VENICE_SESTIERI: SestiereShape[] = [
  {
    id: 'cannaregio',
    name: 'Cannaregio',
    lat: 45.4445,
    lng: 12.3292,
    path: 'M 78,108 L 96,86 L 122,68 L 154,56 L 194,52 L 230,60 L 254,74 L 246,92 L 232,102 L 214,104 L 198,116 L 180,124 L 158,120 L 136,110 L 114,116 L 94,126 Z',
    subdivisions: [
      'M 122,68 L 138,110',
      'M 154,56 L 164,120',
      'M 194,52 L 192,118',
      'M 224,60 L 216,104',
      'M 102,94 L 242,84',
    ],
  },
  {
    id: 'santa-croce',
    name: 'Santa Croce',
    lat: 45.4408,
    lng: 12.3228,
    path: 'M 52,138 L 76,116 L 96,132 L 116,122 L 138,116 L 150,128 L 144,148 L 122,158 L 96,162 L 66,158 Z',
    subdivisions: [
      'M 96,132 L 98,160',
      'M 122,122 L 122,156',
      'M 68,144 L 146,138',
    ],
  },
  {
    id: 'san-polo',
    name: 'San Polo',
    lat: 45.4381,
    lng: 12.3335,
    path: 'M 148,126 L 168,124 L 194,132 L 204,146 L 190,162 L 166,168 L 148,154 Z',
    subdivisions: [
      'M 172,125 L 170,166',
      'M 150,144 L 198,144',
    ],
  },
  {
    id: 'dorsoduro',
    name: 'Dorsoduro',
    lat: 45.4318,
    lng: 12.3292,
    path: 'M 58,166 L 94,168 L 128,164 L 154,160 L 172,174 L 192,176 L 214,186 L 234,200 L 218,210 L 184,210 L 144,206 L 104,202 L 64,196 L 48,182 Z',
    subdivisions: [
      'M 98,168 L 104,202',
      'M 138,164 L 144,206',
      'M 176,174 L 182,210',
      'M 62,184 L 222,196',
    ],
  },
  {
    id: 'san-marco',
    name: 'San Marco',
    lat: 45.4341,
    lng: 12.3390,
    path: 'M 206,120 L 230,114 L 254,126 L 260,152 L 252,178 L 234,190 L 206,174 L 198,160 L 212,144 Z',
    subdivisions: [
      'M 230,114 L 228,184',
      'M 208,148 L 258,148',
      'M 212,168 L 252,170',
    ],
  },
  {
    id: 'castello',
    name: 'Castello',
    lat: 45.4348,
    lng: 12.3528,
    path: 'M 256,82 L 284,88 L 312,102 L 336,122 L 354,148 L 368,180 L 382,208 L 366,228 L 342,226 L 324,208 L 316,184 L 294,178 L 262,180 L 266,152 L 260,122 L 242,106 Z',
    subdivisions: [
      'M 284,88 L 288,178',
      'M 312,102 L 318,186',
      'M 336,122 L 344,224',
      'M 262,126 L 342,134',
      'M 264,154 L 364,166',
      'M 322,194 L 376,204',
    ],
  },
  {
    id: 'giudecca',
    name: 'Giudecca',
    lat: 45.4283,
    lng: 12.3203,
    path: 'M 72,222 L 108,224 L 154,230 L 198,232 L 240,226 L 248,238 L 220,252 L 174,256 L 122,250 L 82,240 L 66,230 Z',
    subdivisions: [
      'M 112,225 L 116,248',
      'M 154,230 L 156,254',
      'M 196,232 L 198,254',
    ],
  },
  {
    id: 'san-giorgio',
    name: 'San Giorgio Maggiore',
    lat: 45.4293,
    lng: 12.3433,
    path: 'M 258,214 L 278,210 L 290,222 L 280,236 L 260,232 Z',
    subdivisions: ['M 272,212 L 272,234'],
  },
  {
    id: 'san-michele',
    name: 'Isola di San Michele',
    lat: 45.4470,
    lng: 12.3473,
    path: 'M 286,36 L 318,40 L 322,64 L 290,66 Z',
    subdivisions: ['M 304,38 L 304,65'],
  },
  {
    id: 'tronchetto',
    name: 'Tronchetto',
    lat: 45.4401,
    lng: 12.3075,
    path: 'M 14,156 L 38,148 L 44,174 L 32,192 L 12,184 Z',
    subdivisions: ['M 26,152 L 24,188'],
  },
];

export const VeniceVectorMap: React.FC<VeniceVectorMapProps> = React.memo(
  ({className = '', onSelectDistrict}) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const hoveredDistrict = VENICE_SESTIERI.find((s) => s.id === hoveredId);

    return (
      <div className={`relative select-none ${className}`}>
        <svg
          viewBox="0 0 400 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible drop-shadow-[0_14px_28px_rgba(3,18,14,0.6)]"
          role="img"
          aria-label="Vector map of Venice sestieri and lagoon islands"
        >
          {/* Ponte della Libertà slender western causeway stem */}
          <path
            d="M 2,112 L 62,134"
            stroke="rgba(255,255,255,0.82)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Segmented White Territories (Sestieri & Lagoon Islands) */}
          {VENICE_SESTIERI.map((zone) => {
            const isHovered = hoveredId === zone.id;
            return (
              <g
                key={zone.id}
                className={
                  onSelectDistrict
                    ? 'cursor-pointer transition-transform duration-150'
                    : undefined
                }
                onMouseEnter={() => setHoveredId(zone.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectDistrict?.(zone.lat, zone.lng, zone.name)}
              >
                <path
                  d={zone.path}
                  fill={isHovered ? '#F2CE84' : '#FFFFFF'}
                  stroke="#082A22"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  className="transition-colors duration-150"
                />
                {/* Fine Cartographic District / Canal Subdivision Lines */}
                {zone.subdivisions.map((line, idx) => (
                  <path
                    key={`${zone.id}-sub-${idx}`}
                    d={line}
                    stroke="#0A332A"
                    strokeOpacity="0.42"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    className="pointer-events-none"
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {/* Subtle Unboxed District Readout on Hover */}
        {hoveredDistrict && (
          <div className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] font-medium tracking-[0.14em] text-[#F2CE84] whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {hoveredDistrict.name}
          </div>
        )}
      </div>
    );
  }
);

VeniceVectorMap.displayName = 'VeniceVectorMap';

/**
 * Large translucent cartographic outline floating softly in the upper-right background,
 * echoing the layered dual-map depth motif from the reference design.
 */
export const VeniceGhostOutline: React.FC<{className?: string}> = React.memo(
  ({className = ''}) => (
    <svg
      viewBox="0 0 400 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {VENICE_SESTIERI.map((zone) => (
        <path
          key={`ghost-${zone.id}`}
          d={zone.path}
          fill="rgba(255, 255, 255, 0.035)"
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
);

VeniceGhostOutline.displayName = 'VeniceGhostOutline';
