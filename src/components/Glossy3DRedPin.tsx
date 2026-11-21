import React from 'react';

interface Glossy3DRedPinSvgProps {
  pinId?: string;
  width?: number;
  height?: number;
  isSelected?: boolean;
  isHovered?: boolean;
}

/**
 * Pure standalone SVG for Google Maps native <Marker3D> (wrapped in <template> by Map3D).
 * Uses unique gradient IDs per pin so multiple 3D markers render cleanly on the WebGL globe.
 */
export const Glossy3DRedPinSvg: React.FC<Glossy3DRedPinSvgProps> = React.memo(
  ({pinId = 'default', width = 32, height = 42, isSelected = false, isHovered = false}) => {
    const safeId = pinId.replace(/[^a-zA-Z0-9_-]/g, '');
    const bodyGradId = `pin3dBody-${safeId}`;
    const edgeGradId = `pin3dEdge-${safeId}`;
    const holeGradId = `pin3dHole-${safeId}`;
    const glossGradId = `pin3dGloss-${safeId}`;
    const rimGradId = `pin3dRim-${safeId}`;
    const shadowFilterId = `pin3dShadow-${safeId}`;

    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 36 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient
            id={bodyGradId}
            cx="35%"
            cy="25%"
            r="70%"
            fx="28%"
            fy="18%"
          >
            <stop offset="0%" stopColor={isSelected || isHovered ? '#FF8080' : '#FF6B6B'} />
            <stop offset="25%" stopColor="#EF1424" />
            <stop offset="65%" stopColor="#C40514" />
            <stop offset="100%" stopColor="#750009" />
          </radialGradient>

          <linearGradient id={edgeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4D4D" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#C40514" stopOpacity="0" />
            <stop offset="100%" stopColor="#4A0005" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id={holeGradId} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#540006" />
            <stop offset="60%" stopColor="#8A000C" />
            <stop offset="100%" stopColor="#DC1423" />
          </linearGradient>

          <linearGradient id={glossGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={rimGradId} x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#FF9E9E" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#FF9E9E" stopOpacity="0" />
          </linearGradient>

          <filter id={shadowFilterId} x="-20%" y="-10%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation={isSelected ? '2.2' : '1.5'}
              floodColor={isSelected ? '#DC2626' : '#000000'}
              floodOpacity={isSelected ? '0.65' : '0.45'}
            />
          </filter>
        </defs>

        {/* Outer glow ring when selected or hovered */}
        {(isSelected || isHovered) && (
          <circle
            cx="18"
            cy="15.5"
            r={isSelected ? '16.5' : '15.2'}
            stroke={isSelected ? '#F5CF8B' : '#FFFFFF'}
            strokeOpacity={isSelected ? '0.9' : '0.65'}
            strokeWidth={isSelected ? '2' : '1.4'}
          />
        )}

        <g filter={`url(#${shadowFilterId})`}>
          {/* Outer 3D Pin Shell with Center Cutout Hole */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="
              M 18,45
              C 13,35.5 4,24.5 4,15.5
              C 4,7.5 10.2,1.5 18,1.5
              C 25.8,1.5 32,7.5 32,15.5
              C 32,24.5 23,35.5 18,45
              Z
              M 18,22.5
              C 21.86,22.5 25,19.36 25,15.5
              C 25,11.64 21.86,8.5 18,8.5
              C 14.14,8.5 11,11.64 11,15.5
              C 11,19.36 14.14,22.5 18,22.5
              Z
            "
            fill={`url(#${bodyGradId})`}
          />

          {/* 3D Depth Shade Overlay */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="
              M 18,45
              C 13,35.5 4,24.5 4,15.5
              C 4,7.5 10.2,1.5 18,1.5
              C 25.8,1.5 32,7.5 32,15.5
              C 32,24.5 23,35.5 18,45
              Z
              M 18,22.5
              C 21.86,22.5 25,19.36 25,15.5
              C 25,11.64 21.86,8.5 18,8.5
              C 14.14,8.5 11,11.64 11,15.5
              C 11,19.36 14.14,22.5 18,22.5
              Z
            "
            fill={`url(#${edgeGradId})`}
          />

          {/* Recessed 3D Inner Donut Hole Depth Wall */}
          <path
            d="
              M 11.2,15
              C 11.2,19 14.2,22.2 18,22.2
              C 21.8,22.2 24.8,19 24.8,15
              C 24.8,16.8 21.8,19.8 18,19.8
              C 14.2,19.8 11.2,16.8 11.2,15
              Z
            "
            fill={`url(#${rimGradId})`}
          />
          <path
            d="
              M 11.2,15.5
              C 11.2,11.8 14.2,8.8 18,8.8
              C 21.8,8.8 24.8,11.8 24.8,15.5
              C 24.8,14 21.8,11 18,11
              C 14.2,11 11.2,14 11.2,15.5
              Z
            "
            fill={`url(#${holeGradId})`}
          />

          {/* Curved Glossy Highlight on Top-Left Outer Shoulder */}
          <path
            d="
              M 7,14
              C 7,8.5 11.5,4 17.5,3.2
              C 15.5,4 13.8,5.5 12.8,7.5
              C 11.2,10.5 11.5,13.8 12.5,16.5
              C 10.2,17.2 8.5,16.2 7,14
              Z
            "
            fill={`url(#${glossGradId})`}
          />

          {/* Bright Specular Reflection Accent on Top Rim */}
          <ellipse cx="17" cy="4.2" rx="5" ry="1.4" fill="#FFFFFF" fillOpacity="0.85" />

          {/* Subtle Bottom Point Specular Glint */}
          <circle cx="18" cy="43.5" r="1.2" fill="#FFA3A8" fillOpacity="0.75" />
        </g>
      </svg>
    );
  }
);

Glossy3DRedPinSvg.displayName = 'Glossy3DRedPinSvg';

interface Glossy3DRedPinProps {
  className?: string;
  isSelected?: boolean;
  isHovered?: boolean;
}

export const Glossy3DRedPin: React.FC<Glossy3DRedPinProps> = React.memo(
  ({className = 'w-7 h-10', isSelected = false, isHovered = false}) => (
    <div className={`relative select-none ${className}`}>
      <Glossy3DRedPinSvg isSelected={isSelected} isHovered={isHovered} />
    </div>
  )
);

Glossy3DRedPin.displayName = 'Glossy3DRedPin';
