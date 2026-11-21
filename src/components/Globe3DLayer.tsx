import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  Map3D,
  MapMode,
  Map3DRef,
  Marker3D,
  AltitudeMode,
  CollisionBehavior,
} from '@vis.gl/react-google-maps';
import {
  GeotaggedPhoto,
  VENICE_CENTER,
  VENICE_HOME_GUARD_RAILS,
  zoomTo3DRange,
} from '../data/veniceData';
import {
  ColorGradingSettings,
  buildCssFilterString,
} from '../types/colorSettings';
import {Glossy3DRedPinSvg} from './Glossy3DRedPin';

export interface Globe3DLayerRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetHome: () => void;
  exploreIn: () => void;
  toggleTilt: () => boolean;
  rotate45: () => void;
  flyToLocation: (lat: number, lng: number, range?: number) => void;
  flyToLocationAndOrbit: (lat: number, lng: number, range?: number, tilt?: number) => void;
  stopOrbit: () => void;
  isOrbiting: () => boolean;
  getTilt: () => number;
}

interface Globe3DLayerProps {
  initialZoom: number;
  showLocations: boolean;
  photos: GeotaggedPhoto[];
  selectedPhoto: GeotaggedPhoto | null;
  hoveredPhotoId: string | null;
  colorSettings: ColorGradingSettings;
  isComparing: boolean;
  onTiltChange?: (is3D: boolean) => void;
  onZoomProgressChange?: (progress: number) => void;
  onSelectPhoto: (photo: GeotaggedPhoto | null) => void;
  onHoverPhoto: (photoId: string | null) => void;
  onOrbitChange?: (isOrbiting: boolean) => void;
}

// Re-export guard rails
export {VENICE_HOME_GUARD_RAILS};

export const Globe3DLayer = React.memo(
  forwardRef<Globe3DLayerRef, Globe3DLayerProps>(
  (
    {
      initialZoom,
      showLocations,
      photos,
      selectedPhoto,
      hoveredPhotoId,
      colorSettings,
      isComparing,
      onTiltChange,
      onZoomProgressChange,
      onSelectPhoto,
      onHoverPhoto,
      onOrbitChange,
    },
    ref
  ) => {
    const map3dContainerRef = useRef<Map3DRef | null>(null);

    // Orbit & Cinematic fly-over circling refs
    const orbitRafRef = useRef<number | null>(null);
    const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isOrbitingRef = useRef<boolean>(false);
    const orbitHeadingRef = useRef<number>(0);
    const orbitCenterRef = useRef<{lat: number; lng: number}>({
      lat: VENICE_CENTER.lat,
      lng: VENICE_CENTER.lng,
    });
    const orbitRangeRef = useRef<number>(460);
    const orbitTiltRef = useRef<number>(62);

    const visibilityHandlerRef = useRef<(() => void) | null>(null);

    const stopOrbit = useCallback(() => {
      if (flightTimerRef.current !== null) {
        clearTimeout(flightTimerRef.current);
        flightTimerRef.current = null;
      }
      if (orbitRafRef.current !== null) {
        cancelAnimationFrame(orbitRafRef.current);
        orbitRafRef.current = null;
      }
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }
      if (isOrbitingRef.current) {
        isOrbitingRef.current = false;
        onOrbitChange?.(false);
      }
    }, [onOrbitChange]);

    useEffect(() => {
      return () => {
        stopOrbit();
      };
    }, [stopOrbit]);

    // Viewport dimensions
    const [viewport, setViewport] = useState({
      width: typeof window !== 'undefined' ? window.innerWidth : 1280,
      height: typeof window !== 'undefined' ? window.innerHeight : 800,
    });

    useEffect(() => {
      const handleResize = () => {
        setViewport({width: window.innerWidth, height: window.innerHeight});
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Initial camera range in meters from initial zoom (maximum overview range)
    const initialRange = useMemo(
      () => zoomTo3DRange(initialZoom, viewport.height),
      [initialZoom, viewport.height]
    );

    const initialRangeRef = useRef(initialRange);
    useEffect(() => {
      initialRangeRef.current = initialRange;
    }, [initialRange]);

    // Live camera ref tracks instantaneous camera coordinates without causing React re-renders
    const liveCameraRef = useRef({
      lat: VENICE_CENTER.lat,
      lng: VENICE_CENTER.lng,
      range: initialRange,
      heading: 0,
      tilt: 0,
    });

    const onZoomProgressChangeRef = useRef(onZoomProgressChange);
    useEffect(() => {
      onZoomProgressChangeRef.current = onZoomProgressChange;
    }, [onZoomProgressChange]);

    const onTiltChangeRef = useRef(onTiltChange);
    useEffect(() => {
      onTiltChangeRef.current = onTiltChange;
    }, [onTiltChange]);

    const lastProgressRef = useRef(0);

    // Configure native bounds and altitude limits directly on the Map3DElement
    useEffect(() => {
      const map3d = map3dContainerRef.current?.map3d;
      if (!map3d) return;

      try {
        const winGoogle = (window as unknown as {
          google?: {
            maps?: {
              LatLngBounds?: new (
                sw: {lat: number; lng: number} | {south: number; west: number},
                ne: {lat: number; lng: number} | {north: number; east: number}
              ) => unknown;
            };
          };
        }).google;

        if (winGoogle?.maps?.LatLngBounds) {
          map3d.bounds = new winGoogle.maps.LatLngBounds(
            {south: VENICE_HOME_GUARD_RAILS.south, west: VENICE_HOME_GUARD_RAILS.west},
            {north: VENICE_HOME_GUARD_RAILS.north, east: VENICE_HOME_GUARD_RAILS.east}
          );
        } else {
          map3d.bounds = VENICE_HOME_GUARD_RAILS;
        }
        map3d.maxAltitude = initialRange;
        map3d.minAltitude = 60;
      } catch {
        // Fallback
      }
    }, [initialRange]);

    // Handle camera updates from user gestures (mouse drag, wheel scroll, pinch)
    // Non-blocking telemetry updates with stable callback identity ensures the WebGL gesture controller
    // never drops events, tears down listeners, or gets stuck when zooming in/out.
    const handleCameraChanged = useCallback((ev: unknown) => {
      const event = ev as {
        detail?: {
          center?: {lat: number; lng: number; altitude?: number};
          range?: number;
          heading?: number;
          tilt?: number;
        };
      };
      if (!event.detail) return;
      const detail = event.detail;
      const map3d = map3dContainerRef.current?.map3d;

      const currentRange = detail.range ?? map3d?.range ?? liveCameraRef.current.range;
      const center = detail.center ?? map3d?.center;
      const currentLat = center?.lat ?? liveCameraRef.current.lat;
      const currentLng = center?.lng ?? liveCameraRef.current.lng;
      const currentHeading = detail.heading ?? map3d?.heading ?? liveCameraRef.current.heading;
      const currentTilt = detail.tilt ?? map3d?.tilt ?? liveCameraRef.current.tilt;

      liveCameraRef.current = {
        lat: currentLat,
        lng: currentLng,
        range: currentRange,
        heading: currentHeading,
        tilt: currentTilt,
      };

      // Zoom progress calculation:
      // At home overview: progress = 0
      // Smoothly reaches 1 as the user zooms into 3D Venice buildings
      const span = Math.max(900, initialRangeRef.current * 0.58);
      const rawProgress = (initialRangeRef.current - currentRange) / span;
      const clampedProgress = Math.min(1, Math.max(0, rawProgress));

      if (Math.abs(clampedProgress - lastProgressRef.current) >= 0.004) {
        lastProgressRef.current = clampedProgress;
        onZoomProgressChangeRef.current?.(clampedProgress);
      }
    }, []);

    // Expose imperative camera controls to parent UI buttons without fighting React state
    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          stopOrbit();
          const map3d = map3dContainerRef.current?.map3d;
          if (!map3d) return;
          try {
            map3d.stopCameraAnimation();
            const currentRange = map3d.range || liveCameraRef.current.range;
            const newRange = Math.max(120, currentRange * 0.65);
            map3d.flyCameraTo({
              endCamera: {
                center: map3d.center || {
                  lat: liveCameraRef.current.lat,
                  lng: liveCameraRef.current.lng,
                  altitude: 0,
                },
                range: newRange,
                tilt: map3d.tilt,
                heading: map3d.heading,
              },
              durationMillis: 350,
            });
          } catch (e) {
            console.warn('Map3D camera command failed:', e);
          }
        },

        zoomOut: () => {
          stopOrbit();
          const map3d = map3dContainerRef.current?.map3d;
          if (!map3d) return;
          try {
            map3d.stopCameraAnimation();
            const currentRange = map3d.range || liveCameraRef.current.range;
            const newRange = Math.min(initialRangeRef.current, currentRange * 1.45);
            const currentCenter = map3d.center || liveCameraRef.current;
            const clampedLat = Math.min(
              VENICE_HOME_GUARD_RAILS.north,
              Math.max(VENICE_HOME_GUARD_RAILS.south, currentCenter.lat)
            );
            const clampedLng = Math.min(
              VENICE_HOME_GUARD_RAILS.east,
              Math.max(VENICE_HOME_GUARD_RAILS.west, currentCenter.lng)
            );
            map3d.flyCameraTo({
              endCamera: {
                center: {
                  lat: clampedLat,
                  lng: clampedLng,
                  altitude: 0,
                },
                range: newRange,
                tilt: map3d.tilt,
                heading: map3d.heading,
              },
              durationMillis: 350,
            });
          } catch (e) {
            console.warn('Map3D camera command failed:', e);
          }
        },

        resetHome: () => {
          stopOrbit();
          const map3d = map3dContainerRef.current?.map3d;
          if (!map3d) return;
          try {
            map3d.stopCameraAnimation();
            map3d.flyCameraTo({
              endCamera: {
                center: {lat: VENICE_CENTER.lat, lng: VENICE_CENTER.lng, altitude: 0},
                range: initialRangeRef.current,
                tilt: 0,
                heading: 0,
              },
              durationMillis: 750,
            });
            onTiltChangeRef.current?.(false);
          } catch (e) {
            console.warn('Map3D camera command failed:', e);
          }
        },

        exploreIn: () => {
          stopOrbit();
          const map3d = map3dContainerRef.current?.map3d;
          if (!map3d) return;
          try {
            map3d.stopCameraAnimation();
            map3d.flyCameraTo({
              endCamera: {
                center: {lat: VENICE_CENTER.lat, lng: VENICE_CENTER.lng, altitude: 0},
                range: 1850,
                tilt: 48,
                heading: 18,
              },
              durationMillis: 1350,
            });
            onTiltChangeRef.current?.(true);
          } catch (e) {
            console.warn('Map3D camera command failed:', e);
          }
        },

        toggleTilt: () => {
          const wasFlyingOrOrbiting =
            isOrbitingRef.current || flightTimerRef.current !== null;
          stopOrbit();

          const map3d = map3dContainerRef.current?.map3d;
          if (!map3d) return false;

          try {
            map3d.stopCameraAnimation();

            const currentTilt = map3d.tilt || liveCameraRef.current.tilt;
            const shouldDisable3D = wasFlyingOrOrbiting || currentTilt > 15;
            const nextTilt = shouldDisable3D ? 0 : 60;

            const targetCenter = wasFlyingOrOrbiting
              ? {
                  lat: orbitCenterRef.current.lat,
                  lng: orbitCenterRef.current.lng,
                  altitude: 0,
                }
              : map3d.center || {
                  lat: liveCameraRef.current.lat,
                  lng: liveCameraRef.current.lng,
                  altitude: 0,
                };

            map3d.flyCameraTo({
              endCamera: {
                center: targetCenter,
                range: map3d.range || liveCameraRef.current.range,
                tilt: nextTilt,
                heading: nextTilt === 0 ? 0 : map3d.heading || liveCameraRef.current.heading,
              },
              durationMillis: 600,
            });
            const isNow3D = nextTilt > 0;
            onTiltChangeRef.current?.(isNow3D);
            return isNow3D;
          } catch (e) {
            console.warn('Map3D camera command failed:', e);
            return false;
          }
        },

        rotate45: () => {
          stopOrbit();
          const map3d = map3dContainerRef.current?.map3d;
          if (!map3d) return;
          try {
            map3d.stopCameraAnimation();
            const nextHeading = ((map3d.heading || liveCameraRef.current.heading) + 45) % 360;
            map3d.flyCameraTo({
              endCamera: {
                center: map3d.center || {
                  lat: liveCameraRef.current.lat,
                  lng: liveCameraRef.current.lng,
                  altitude: 0,
                },
                range: map3d.range || liveCameraRef.current.range,
                tilt: map3d.tilt || liveCameraRef.current.tilt,
                heading: nextHeading,
              },
              durationMillis: 450,
            });
          } catch (e) {
            console.warn('Map3D camera command failed:', e);
          }
        },

        flyToLocation: (lat: number, lng: number, range: number = 900) => {
          stopOrbit();
          const map3d = map3dContainerRef.current?.map3d;
          if (!map3d) return;
          try {
            map3d.stopCameraAnimation();
            map3d.flyCameraTo({
              endCamera: {
                center: {lat, lng, altitude: 0},
                range,
                tilt: 54,
                heading: map3d.heading || 12,
              },
              durationMillis: 1200,
            });
            onTiltChangeRef.current?.(true);
          } catch (e) {
            console.warn('Map3D camera command failed:', e);
          }
        },

        flyToLocationAndOrbit: (lat: number, lng: number, range: number = 440, tilt: number = 62) => {
          stopOrbit();
          const map3d = map3dContainerRef.current?.map3d;
          if (!map3d) return;

          try {
            map3d.stopCameraAnimation();
            const currentHeading = map3d.heading || liveCameraRef.current.heading || 0;
            orbitHeadingRef.current = currentHeading;
            orbitCenterRef.current = {lat, lng};
            orbitRangeRef.current = range;
            orbitTiltRef.current = tilt;

            onTiltChangeRef.current?.(true);

            // Step 1: Slow, majestic fly-over zoom in to the pin location
            map3d.flyCameraTo({
              endCamera: {
                center: {lat, lng, altitude: 0},
                range,
                tilt,
                heading: currentHeading,
              },
              durationMillis: 3000,
            });
          } catch (e) {
            console.warn('Map3D camera command failed:', e);
          }

          // Step 2: Begin continuous slow circling orbit around location ENDLESSLY
          // Automatically pauses when tab is backgrounded (Page Visibility API) to save CPU/GPU & battery
          flightTimerRef.current = setTimeout(() => {
            isOrbitingRef.current = true;
            onOrbitChange?.(true);
            let lastTime = performance.now();

            const loop = (currentTime: number) => {
              if (!isOrbitingRef.current || !map3dContainerRef.current?.map3d || document.hidden) {
                orbitRafRef.current = null;
                return;
              }
              // Clamp dt to 100ms to prevent camera jumps after frame drops
              const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
              lastTime = currentTime;

              // Slow, smooth cinematic rotation (~7.5 degrees/sec => ~48s for a full 360° circle)
              orbitHeadingRef.current = (orbitHeadingRef.current + dt * 7.5) % 360;

              const m = map3dContainerRef.current.map3d;
              m.heading = orbitHeadingRef.current;
              m.center = {lat: orbitCenterRef.current.lat, lng: orbitCenterRef.current.lng, altitude: 0};
              m.range = orbitRangeRef.current;
              m.tilt = orbitTiltRef.current;

              orbitRafRef.current = requestAnimationFrame(loop);
            };

            const handleVisibilityChange = () => {
              if (!isOrbitingRef.current) return;
              if (document.hidden) {
                if (orbitRafRef.current !== null) {
                  cancelAnimationFrame(orbitRafRef.current);
                  orbitRafRef.current = null;
                }
              } else if (orbitRafRef.current === null) {
                lastTime = performance.now();
                orbitRafRef.current = requestAnimationFrame(loop);
              }
            };

            visibilityHandlerRef.current = handleVisibilityChange;
            document.addEventListener('visibilitychange', handleVisibilityChange);

            if (!document.hidden) {
              orbitRafRef.current = requestAnimationFrame(loop);
            }
          }, 3020);
        },

        stopOrbit,

        isOrbiting: () => isOrbitingRef.current,

        getTilt: () => {
          const map3d = map3dContainerRef.current?.map3d;
          return map3d?.tilt ?? liveCameraRef.current.tilt;
        },
      }),
      [stopOrbit, onOrbitChange]
    );

    // Build the live GPU-accelerated CSS filter pipeline
    const activeCssFilter = useMemo(() => {
      if (isComparing) return 'none';
      return buildCssFilterString(colorSettings);
    }, [colorSettings, isComparing]);

    // Clarity ratio for the SVG high-pass convolution matrix
    const clarityRatio = (colorSettings.clarity / 100) * 0.9;
    const kEdge = (-0.18 * clarityRatio).toFixed(4);
    const kCenter = (1 + 0.72 * clarityRatio).toFixed(4);

    // Filter visible 3D markers: when a specific location is clicked/orbiting, show ONLY that pin
    const visibleMarkerPhotos = useMemo(() => {
      if (!showLocations) return [];
      if (selectedPhoto) {
        return photos.filter((photo) => photo.id === selectedPhoto.id);
      }
      return photos.filter((photo) => photo.hasGps !== false && photo.lat && photo.lng);
    }, [showLocations, selectedPhoto, photos]);

    return (
      <div className="relative w-full h-full bg-[#061E19] overflow-hidden">
        {/* SVG Clarity Kernel Filter Definition */}
        <svg
          className="absolute w-0 h-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="venice-clarity-filter"
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feConvolveMatrix
                order="3"
                preserveAlpha="true"
                kernelMatrix={`0 ${kEdge} 0 ${kEdge} ${kCenter} ${kEdge} 0 ${kEdge} 0`}
              />
            </filter>
          </defs>
        </svg>

        {/* GPU Color-Graded Google Maps 3D Globe View with True Geodetic 3D Markers */}
        <div
          className="w-full h-full will-change-[filter]"
          style={{
            filter: activeCssFilter,
            transition: 'filter 120ms ease-out',
          }}
        >
          <Map3D
            ref={map3dContainerRef}
            defaultCenter={{
              lat: VENICE_CENTER.lat,
              lng: VENICE_CENTER.lng,
              altitude: 0,
            }}
            defaultRange={initialRange}
            defaultTilt={0}
            defaultHeading={0}
            bounds={VENICE_HOME_GUARD_RAILS}
            maxAltitude={initialRange}
            minAltitude={60}
            mode={MapMode.SATELLITE}
            defaultUIHidden={true}
            gestureHandling="GREEDY"
            onCameraChanged={handleCameraChanged}
            className="w-full h-full"
            style={{width: '100%', height: '100%'}}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            {/* Native 3D Geodetic Markers anchored accurately to exact lat/lng on the 3D Venice mesh */}
            {visibleMarkerPhotos.map((photo) => {
              const isSelected = selectedPhoto?.id === photo.id;
              const isHovered = hoveredPhotoId === photo.id;
              const pinWidth = isHovered && !isSelected ? 36 : 30;
              const pinHeight = isHovered && !isSelected ? 47 : 39;

              return (
                <Marker3D
                  key={photo.id}
                  position={{
                    lat: photo.lat,
                    lng: photo.lng,
                    altitude: isHovered && !isSelected ? 22 : 16,
                  }}
                  altitudeMode={AltitudeMode.RELATIVE_TO_MESH}
                  extruded={true}
                  sizePreserved={true}
                  drawsWhenOccluded={true}
                  collisionBehavior={CollisionBehavior.REQUIRED}
                  zIndex={isSelected ? 50 : isHovered ? 40 : 20}
                  title={photo.title}
                  onClick={() => onSelectPhoto(photo)}
                >
                  <Glossy3DRedPinSvg
                    pinId={photo.id}
                    width={pinWidth}
                    height={pinHeight}
                    isSelected={isSelected}
                    isHovered={isHovered}
                  />
                </Marker3D>
              );
            })}
          </Map3D>
        </div>
      </div>
    );
  })
);

Globe3DLayer.displayName = 'Globe3DLayer';
