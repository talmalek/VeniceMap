# Respond to User Interactions and Events on a Photorealistic 3D Map

This guide covers how to manage user interactions, configure gesture handling,
restrict camera movement and geographical boundaries, and respond to interactive
events on a Photorealistic 3D Map (`gmp-map-3d`).

## Prerequisites

-   **Add an interactive, photorealistic 3D map to a web page**: Ensure the Maps
    JavaScript API is loaded using the dynamic library loader
    (`google.maps.importLibrary('maps3d')`) and a `<gmp-map-3d>` web component
    is present in the DOM.

--------------------------------------------------------------------------------

## 1. Control Gesture Handling

When a user scrolls a page containing a 3D map, the scrolling action can
inadvertently cause the map to zoom or pan. You can control how the map responds
to scroll and touch gestures using the `gesture-handling` HTML attribute (or
`gestureHandling` property in JavaScript).

### Gesture Handling Modes

Mode              | Behavior
:---------------- | :-------
**`cooperative`** | Allows the user to scroll the page without impacting the map's zoom or pan. Users can zoom using map controls, two-finger touch gestures, or by holding `CMD`/`CTRL` while scrolling.
**`greedy`**      | The map reacts immediately to all scroll events and single-finger touch gestures.
**`auto`**        | Adapts behavior automatically: uses `cooperative` if the map is inside an `<iframe>`, and `greedy` if it is not inside an `<iframe>`.

### HTML Configuration

```html
<gmp-map-3d
    id="gmp-map-3d"
    center="20.92,-156.36,500"
    tilt="67.5"
    mode="hybrid"
    gesture-handling="cooperative"
    internal-usage-attribution-ids="gmp_git_agentskills_v1">
</gmp-map-3d>
```

--------------------------------------------------------------------------------

## 2. Restrict Geographical Map Bounds

You can restrict the geographical boundaries (latitude and longitude) within
which a user can pan the camera by setting the `bounds` property on the
`Map3DElement`.

### JavaScript / TypeScript

```typescript
async function init(): Promise<void> {
    await google.maps.importLibrary('maps3d');

    const map3DElement = document.querySelector('gmp-map-3d')!;

    // Restrict the position of the camera to the specified geographical bounds.
    map3DElement.bounds = {
        south: -48.3,
        west: 163.56,
        north: -32.86,
        east: -180,
    };
}

void init();
```

--------------------------------------------------------------------------------

## 3. Restrict Camera Movement

In addition to geographical bounds, you can constrain the camera's altitude,
heading, and tilt to prevent users from zooming too far out, looking
underground, or rotating beyond desired viewing angles.

### Supported Camera Restriction Properties

-   `maxAltitude` (meters)
-   `minAltitude` (meters)
-   `maxHeading` (degrees)
-   `minHeading` (degrees)
-   `maxTilt` (degrees)
-   `minTilt` (degrees)

### Combining Camera and Map Bounds Restrictions

You can simultaneously apply camera angle/altitude limits and geographical
bounds:

```javascript
async function init() {
    await google.maps.importLibrary('maps3d');

    const map3DElement = document.querySelector('gmp-map-3d');

    // 1. Restrict the movement and angles of the camera.
    map3DElement.maxAltitude = 1000;
    map3DElement.minAltitude = 500;
    map3DElement.maxTilt = 55;
    map3DElement.minTilt = 35;

    // 2. Restrict the geographical position of the camera.
    map3DElement.bounds = {
        north: 20.93,
        west: -156.38,
        south: 20.90,
        east: -156.31,
    };
}

void init();
```

--------------------------------------------------------------------------------

## 4. Complete Implementation Example (Vanilla JS & HTML)

The following complete example initializes a 3D map with `cooperative` gesture
handling and applies geographical and camera restrictions.

### HTML (`index.html`)

```html
<!DOCTYPE html>
<html>
    <head>
        <title>3D Map Camera Restrictions & Interactions</title>
        <style>
            html,
            body {
                height: 100%;
                margin: 0;
                padding: 0;
            }
        </style>
        <script type="module" src="./index.js"></script>
        <script>
            (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
                key: "YOUR_GOOGLE_MAPS_API_KEY"
            });
        </script>
    </head>
    <body>
        <gmp-map-3d
            id="gmp-map-3d"
            center="-47.1375,169.5235,150000"
            tilt="67.5"
            mode="hybrid"
            gesture-handling="cooperative"
            internal-usage-attribution-ids="gmp_git_agentskills_v1">
        </gmp-map-3d>
    </body>
</html>
```

### JavaScript (`index.js`)

```javascript
async function init() {
    await google.maps.importLibrary('maps3d');

    const map3DElement = document.querySelector('gmp-map-3d');

    // Restrict the geographical position of the camera to the specified bounds.
    map3DElement.bounds = {
        south: -48.3,
        west: 163.56,
        north: -32.86,
        east: -180,
    };
}

void init();
```

--------------------------------------------------------------------------------

## 5. Responding to Interactive 3D Marker Events (React)

When building interactive 3D maps using `@vis.gl/react-google-maps`, you can
respond to user click events on 3D markers (`Marker3D`) and display interactive
popovers (`Popover`) anchored to the clicked 3D marker element
(`google.maps.maps3d.Marker3DInteractiveElement`).

### Verified React Pattern

Source:
[https://github.com/visgl/react-google-maps/blob/HEAD/examples/map-3d-markers/src/app.tsx?utm_campaign=gmp_git_agentskills_v1](https://github.com/visgl/react-google-maps/blob/HEAD/examples/map-3d-markers/src/app.tsx?utm_campaign=gmp_git_agentskills_v1)

```tsx
import React, {useCallback, useState} from 'react';
import {AltitudeMode, APIProvider, Pin} from '@vis.gl/react-google-maps';
import {Map3D, MapMode, Marker3D, Popover} from '@vis.gl/react-google-maps/3d';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY as string;

const INITIAL_VIEW_PROPS = {
  defaultCenter: {lat: 40.7093, lng: -73.9968, altitude: 32},
  defaultRange: 1733,
  defaultHeading: 5,
  defaultTilt: 70,
  defaultRoll: 0
};

export const App = () => {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [interactiveMarker, setInteractiveMarker] =
    useState<google.maps.maps3d.Marker3DInteractiveElement | null>(null);

  const handleInteractiveMarkerRef = useCallback(
    (
      marker:
        | google.maps.maps3d.Marker3DElement
        | google.maps.maps3d.Marker3DInteractiveElement
        | null
    ) => {
      setInteractiveMarker(
        marker instanceof google.maps.maps3d.Marker3DInteractiveElement
          ? marker
          : null
      );
    },
    []
  );

  return (
    <APIProvider apiKey={API_KEY} libraries={['maps3d', 'marker']}>
      <Map3D
        mode={MapMode.SATELLITE}
        {...INITIAL_VIEW_PROPS}
        defaultLabelsDisabled
        internalUsageAttributionIds={['gmp_git_agentskills_v1']}>

        {/* Interactive marker with click listener and popover */}
        <Marker3D
          ref={handleInteractiveMarkerRef}
          position={{lat: 40.705666, lng: -73.996382, altitude: 50}}
          altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
          onClick={() => {
            console.log('Interactive marker clicked!');
            setOpenPopoverId('colored-pin');
          }}
          title="Click to see details">
          <Pin borderColor="#0D652D" background="#34A853" glyphColor="white" />
        </Marker3D>

        {openPopoverId === 'colored-pin' && (
          <Popover
            open
            anchor={interactiveMarker}
            onClose={() => {
              setOpenPopoverId(null);
            }}>
            <div style={{padding: '12px', maxWidth: '200px'}}>
              <h3 style={{margin: '0 0 8px 0', fontSize: '14px'}}>
                Custom Pin Marker
              </h3>
              <p style={{margin: 0, fontSize: '12px'}}>
                An interactive marker with custom pin colors. Click the marker
                to toggle this popover.
              </p>
            </div>
          </Popover>
        )}
      </Map3D>
    </APIProvider>
  );
};
```

### Handling Web Component Click Events in Vanilla JS

When working with Google Maps Web Components in Vanilla JS, ensure the custom
element definition is registered via `customElements.whenDefined` before
attaching event listeners such as `gmp-click`:

Source:
[https://github.com/googlemaps/js-samples/blob/HEAD/samples/web-components-events/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/web-components-events/index.ts?utm_campaign=gmp_git_agentskills_v1)

```typescript
customElements.whenDefined(element.localName).then(async () => {
  element.addEventListener('gmp-click', async (event) => {
    // Handle interaction
  });
});
```
