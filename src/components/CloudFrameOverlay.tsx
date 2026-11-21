import React, {useEffect, useState} from 'react';
import {Compass, Images, Landmark} from 'lucide-react';
import {VeniceGhostOutline, VeniceVectorMap} from './VeniceVectorMap';

interface CloudFrameOverlayProps {
  zoomProgress: number; // 0 = overview, 1 = zoomed in
  isAlbumActive?: boolean;
  onExploreClick: () => void;
  onResetHomeClick: () => void;
  onFlyToSpot: (lat: number, lng: number, range?: number) => void;
  onOpenAlbumClick: () => void;
}

export const CloudFrameOverlay: React.FC<CloudFrameOverlayProps> = React.memo(
  ({
    zoomProgress,
    isAlbumActive = false,
    onExploreClick,
    onResetHomeClick,
    onFlyToSpot,
    onOpenAlbumClick,
  }) => {
    const [viewport, setViewport] = useState({
      width: typeof window !== 'undefined' ? window.innerWidth : 1440,
      height: typeof window !== 'undefined' ? window.innerHeight : 900,
    });

    useEffect(() => {
      const handleResize = () => {
        setViewport({width: window.innerWidth, height: window.innerHeight});
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Smoothly clamp zoomProgress [0..1]
    const p = Math.max(0, Math.min(1, zoomProgress));
    // Gentle ease-out curve for the logo glide so initial scroll gives responsive motion
    const glide = 1 - Math.pow(1 - p, 1.8);

    // Overview elements fade out cleanly as user zooms into 3D buildings
    const atmosphereOpacity = Math.max(0, 1 - p * 1.35);
    const vectorMapOpacity = Math.max(0, 1 - p * 2.15);
    const vectorMapScale = 1 + p * 0.16;
    const cardsOpacity = Math.max(0, 1 - p * 2.6);
    const showBottomCards = !isAlbumActive && cardsOpacity > 0.02;

    // Responsive geometry for the "EXPLORE VENICE" brush logo glide:
    // Rendered at crisp full hero resolution and scaled down cleanly via GPU transform
    // from center-left hero position (p = 0) to compact upper-left corner (p = 1).
    const isSmall = viewport.width < 640;
    const isMedium = viewport.width >= 640 && viewport.width < 1024;

    const logoNaturalWidth = isSmall ? 260 : isMedium ? 360 : 450;
    const logoNaturalHeight = isSmall ? 115 : isMedium ? 150 : 185;
    const startScale = 1;
    const endScale = isSmall ? 0.42 : isMedium ? 0.34 : 0.29;
    const currentScale = startScale + (endScale - startScale) * glide;

    // Hero center position: slightly left of center on desktop so the Venice Vector Map sits alongside it
    const heroOffsetX = isSmall ? 0 : isMedium ? -105 : -148;
    const startX = Math.max(20, viewport.width / 2 - logoNaturalWidth / 2 + heroOffsetX);
    const startY = Math.max(96, viewport.height * (isSmall ? 0.25 : 0.38) - logoNaturalHeight / 2);

    // Docked upper-left corner position
    const endX = isSmall ? 16 : 24;
    const endY = isSmall ? 12 : 14;

    const currentX = startX + (endX - startX) * glide;
    const currentY = startY + (endY - startY) * glide;

    // Subtle scroll cue visible only right at overview
    const scrollHintOpacity = Math.max(0, 1 - p * 5);

    return (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none contain-overlay">
        {/*
          1. Moody Venetian Lagoon Emerald Vignette & Warm Upper-Right Sunset Mist
          Echoes the rich dark emerald & warm peach atmospheric depth of the reference design,
          fading out cleanly as the user zooms into the live 3D buildings of Venice.
        */}
        {atmosphereOpacity > 0.01 && (
          <div
            className="absolute inset-0 pointer-events-none will-change-[opacity]"
            style={{opacity: atmosphereOpacity}}
          >
            {/* Deep Lagoon Emerald Framing Scrim */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 72% 68% at 46% 48%, rgba(6, 32, 26, 0.14) 0%, rgba(5, 29, 23, 0.56) 68%, rgba(3, 18, 15, 0.86) 100%)',
              }}
            />

            {/* Top Nav Readability Scrim */}
            <div
              className="absolute inset-x-0 top-0 h-28"
              style={{
                background:
                  'linear-gradient(180deg, rgba(4, 22, 18, 0.72) 0%, rgba(4, 22, 18, 0) 100%)',
              }}
            />

            {/* Warm Sunset Mist Wash in Upper-Right Corner (Reference Atmospheric Glow) */}
            <div
              className="absolute -top-24 -right-24 w-[56vw] max-w-[780px] h-[56vh] max-h-[540px]"
              style={{
                background:
                  'radial-gradient(ellipse at 72% 28%, rgba(235, 190, 152, 0.38) 0%, rgba(212, 162, 122, 0.16) 44%, rgba(6, 30, 25, 0) 74%)',
              }}
            />

            {/* Large Translucent Venice Ghost Silhouette in the Upper-Right Mist */}
            <div className="hidden md:block absolute top-[7%] right-[3%] w-[40vw] max-w-[560px] pointer-events-none">
              <VeniceGhostOutline className="w-full h-auto opacity-80" />
            </div>
          </div>
        )}

        {/* Subtle top edge gradient that stays active when zoomed in so white nav links remain crisp */}
        <div
          className="absolute inset-x-0 top-0 h-24 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(4, 20, 16, 0.62) 0%, rgba(4, 20, 16, 0.18) 58%, rgba(4, 20, 16, 0) 100%)',
          }}
        />

        {/*
          2. White Vector Map of Venice Positioned to the Side of "EXPLORE VENICE"
          Interactive: clicking any sestiere flies smoothly into that district in 3D.
          Fades and expands softly away as the user zooms into the live 3D map.
        */}
        {vectorMapOpacity > 0.01 && (
          <div
            className="hidden sm:block absolute left-1/2 top-[39%] will-change-[transform,opacity]"
            style={{
              opacity: vectorMapOpacity,
              transform: `translate3d(${isMedium ? 45 : 72}px, -50%, 0) scale(${vectorMapScale})`,
              pointerEvents: vectorMapOpacity > 0.45 ? 'auto' : 'none',
            }}
          >
            <VeniceVectorMap
              className="w-[230px] md:w-[300px] lg:w-[355px]"
              onSelectDistrict={(lat, lng) => onFlyToSpot(lat, lng, 1100)}
            />
          </div>
        )}

        {/* Compact Mobile Venice Vector Map centered below title at overview */}
        {isSmall && vectorMapOpacity > 0.01 && (
          <div
            className="absolute left-1/2 top-[46%] will-change-[transform,opacity]"
            style={{
              opacity: vectorMapOpacity,
              transform: `translate3d(-50%, 0, 0) scale(${vectorMapScale})`,
              pointerEvents: vectorMapOpacity > 0.45 ? 'auto' : 'none',
            }}
          >
            <VeniceVectorMap
              className="w-[210px]"
              onSelectDistrict={(lat, lng) => onFlyToSpot(lat, lng, 1100)}
            />
          </div>
        )}

        {/*
          3. Dynamic Morphing "EXPLORE VENICE" Brush Display Logo
          Smoothly glides via GPU transform from center hero to the upper-left corner
          and stays docked in small as the user scrolls/zooms into the 3D buildings.
        */}
        <button
          type="button"
          onClick={p > 0.45 ? onResetHomeClick : onExploreClick}
          title={
            p > 0.45
              ? 'Return to Explore Venice Overview'
              : 'Zoom into 3D Venice'
          }
          aria-label={
            p > 0.45
              ? 'Explore Venice — Return to Overview'
              : 'Explore Venice — Zoom into 3D Map'
          }
          className="fixed left-0 top-0 z-30 pointer-events-auto cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6B86A] rounded-lg will-change-transform"
          style={{
            transformOrigin: 'top left',
            transform: `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0) scale(${currentScale.toFixed(4)})`,
            transition: 'transform 90ms cubic-bezier(0.22, 1, 0.36, 1)',
            width: `${logoNaturalWidth}px`,
          }}
        >
          <div className="flex flex-col items-center sm:items-start leading-none">
            <span
              className="font-brush-display text-white tracking-[0.06em] block drop-shadow-[0_6px_18px_rgba(2,16,12,0.88)]"
              style={{
                fontSize: isSmall ? '1.85rem' : isMedium ? '2.55rem' : '3.15rem',
                transform: 'rotate(-4deg) translateX(12%)',
              }}
            >
              EXPLORE
            </span>
            <h1
              className="font-brush-display text-white tracking-[0.02em] block -mt-2 sm:-mt-3 drop-shadow-[0_10px_28px_rgba(2,16,12,0.92)]"
              style={{
                fontSize: isSmall ? '4.6rem' : isMedium ? '6.4rem' : '8.2rem',
                lineHeight: 0.9,
                transform: 'rotate(-2.5deg)',
              }}
            >
              VENICE
            </h1>
          </div>
        </button>

        {/* Quiet Scroll-to-Zoom Hint (Overview Only, fades immediately on scroll) */}
        {scrollHintOpacity > 0.02 && !isAlbumActive && (
          <div
            className="hidden md:flex absolute left-1/2 bottom-[168px] -translate-x-1/2 items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-white/70 uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] will-change-[opacity]"
            style={{opacity: scrollHintOpacity}}
          >
            <span>Scroll to zoom into 3D Venice</span>
          </div>
        )}

        {/*
          4. Bottom 3 Translucent Deep-Emerald Discovery Cards (Matching Reference Layout)
          Each card is a real interactive action; smoothly slides down & dissolves on zoom or when album opens.
        */}
        {showBottomCards && (
          <div
            className="fixed bottom-5 inset-x-0 z-20 px-4 sm:px-8 flex justify-center will-change-[transform,opacity]"
            style={{
              opacity: cardsOpacity,
              transform: `translate3d(0, ${(p * 36).toFixed(1)}px, 0)`,
              pointerEvents: cardsOpacity > 0.35 ? 'auto' : 'none',
            }}
          >
            <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
              {/* Card 1: Grand Canal & Rialto */}
              <button
                type="button"
                onClick={() => onFlyToSpot(45.437984, 12.335898, 620)}
                className="venice-card text-left rounded-[6px] px-5 py-4 sm:py-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B86A]"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] text-white uppercase">
                  <Compass className="w-3.5 h-3.5 text-[#E6B86A] shrink-0" />
                  <span>Grand Canal</span>
                </div>
                <p className="mt-2.5 text-xs text-white/78 leading-relaxed">
                  Glide into 3D over Ponte di Rialto, marble palazzi, and the winding heart of Venice.
                </p>
              </button>

              {/* Card 2: Piazza San Marco */}
              <button
                type="button"
                onClick={() => onFlyToSpot(45.434167, 12.3388, 560)}
                className="venice-card hidden sm:block text-left rounded-[6px] px-5 py-4 sm:py-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B86A]"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] text-white uppercase">
                  <Landmark className="w-3.5 h-3.5 text-[#E6B86A] shrink-0" />
                  <span>San Marco</span>
                </div>
                <p className="mt-2.5 text-xs text-white/78 leading-relaxed">
                  Explore St. Mark’s Basilica, the Doge’s Palace, and the sunlit lagoon basin in 3D.
                </p>
              </button>

              {/* Card 3: Local PC Photo Album */}
              <button
                type="button"
                onClick={onOpenAlbumClick}
                className="venice-card text-left rounded-[6px] px-5 py-4 sm:py-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B86A]"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] text-white uppercase">
                  <Images className="w-3.5 h-3.5 text-[#E6B86A] shrink-0" />
                  <span>Photo Album</span>
                </div>
                <p className="mt-2.5 text-xs text-white/78 leading-relaxed">
                  Plot geotagged photos directly from your PC folder onto the 3D map with zero uploads.
                </p>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

CloudFrameOverlay.displayName = 'CloudFrameOverlay';
