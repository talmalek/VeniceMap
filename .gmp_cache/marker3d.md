# Add a marker to a photorealistic 3D map

Use markers to draw a user's attention to a location on a 3D map. You can
control the shape, size, and color of markers, in addition to the altitude at
which they appear, their interactivity, and how they behave when colliding with
other markers or map labels.

## Prerequisites

Before adding markers to a 3D map, ensure you have completed the prerequisite
workflow:

-   **Add an interactive, photorealistic 3D map to a web page**: You must have
    an initialized 3D map element (`gmp-map-3d` / `Map3DElement`) and the
    `maps3d` library loaded via `google.maps.importLibrary("maps3d")`.

## Choosing the Right 3D Marker Class

3D Maps in Maps JavaScript API provides distinct marker classes optimized for
specific uses:

Capability               | `MarkerElement`                                                          | `Marker3DElement`
:----------------------- | :----------------------------------------------------------------------- | :----------------
**Customization**        | High (Supports custom HTML elements, core animation APIs, etc.)          | Low (Less customizable; supports `PinElement` and SVG templates)
**Performance**          | Lower interaction performance (FPS drops with a large number of markers) | Higher interaction performance (Optimized for rendering large datasets)
**Recommended capacity** | Reliable interaction performance up to around 1,000 markers              | Strongly encouraged for applications handling over 1,000 markers

Additionally, for markers that need to respond to user clicks and keyboard
events, use **`Marker3DInteractiveElement`**.

--------------------------------------------------------------------------------

## Implementation Workflows

### 1. Add a Standard 3D Marker (`Marker3DElement`)

To add a basic 3D marker, import `Marker3DElement` from the `maps3d` library,
instantiate it with a `position` (`{ lat, lng }` or `{ lat, lng, altitude }`),
and append it to the `gmp-map-3d` element.

#### HTML

```html
<gmp-map-3d
  id="map-3d"
  mode="hybrid"
  center="37.7952,-122.4028,100"
  tilt="67.5"
  range="1000"
  internal-usage-attribution-ids="gmp_git_agentskills_v1">
</gmp-map-3d>
```

#### JavaScript / TypeScript

```javascript
async function initMap() {
  const { Marker3DElement } = await google.maps.importLibrary("maps3d");

  const map3DElement = document.querySelector("gmp-map-3d");

  // Instantiate a standard 3D marker
  const marker = new Marker3DElement({
    position: { lat: 37.7952, lng: -122.4028 },
    label: "Transamerica Pyramid",
  });

  // Append the marker to the 3D map element
  map3DElement.append(marker);
}

initMap();
```

### 2. Set Marker Altitude and Extrusion

You can elevate a marker above the ground or terrain by providing an `altitude`
value inside the `position` object and setting `altitudeMode`. Set `extruded:
true` to draw a vertical line connecting the elevated marker down to the ground
surface.

```javascript
async function addExtrudedMarker() {
  const { Marker3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
  const map3DElement = document.querySelector("gmp-map-3d");

  const extrudedMarker = new Marker3DElement({
    position: { lat: 37.7952, lng: -122.4028, altitude: 150 },
    altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
    extruded: true,
    label: "Elevated Point",
  });

  map3DElement.append(extrudedMarker);
}
```

### 3. Customize Color, Scale, and Icon Image

You can customize the default marker's background, glyph, border color, and size
using `PinElement` from the `marker` library, or replace the icon with a custom
image/SVG resource wrapped in a `<template>` element.

#### Customize with `PinElement`

```javascript
async function addCustomPinMarker() {
  const { Marker3DElement } = await google.maps.importLibrary("maps3d");
  const { PinElement } = await google.maps.importLibrary("marker");
  const map3DElement = document.querySelector("gmp-map-3d");

  const marker = new Marker3DElement({
    position: { lat: 37.7952, lng: -122.4028 },
  });

  const pin = new PinElement({
    background: "#4285F4",
    borderColor: "#1967D2",
    glyphColor: "#FFFFFF",
    scale: 1.5,
  });

  marker.append(pin);
  map3DElement.append(marker);
}
```

#### Customize with an SVG or Image Resource

```javascript
async function addGraphicMarker() {
  const { Marker3DElement } = await google.maps.importLibrary("maps3d");
  const map3DElement = document.querySelector("gmp-map-3d");

  const marker = new Marker3DElement({
    position: { lat: 37.7952, lng: -122.4028 },
  });

  // Wrap custom SVG or <img> inside a <template> before appending to Marker3DElement
  const template = document.createElement("template");
  template.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#EA4335">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  marker.append(template);
  map3DElement.append(marker);
}
```

### 4. Make Markers Respond to Click and Keyboard Events

To make a 3D marker interactive (supporting click and keyboard events, or
triggering a popover), use `Marker3DInteractiveElement` and listen for the
`gmp-click` event.

```javascript
async function addInteractiveMarker() {
  const { Marker3DInteractiveElement, PopoverElement } = await google.maps.importLibrary("maps3d");
  const map3DElement = document.querySelector("gmp-map-3d");

  const position = { lat: 37.7952, lng: -122.4028, altitude: 50 };

  // Optional: Create a popover to associate with the interactive marker
  const popover = new PopoverElement({
    open: false,
  });
  popover.append("Transamerica Pyramid - Click Info");

  // Instantiate Marker3DInteractiveElement
  const interactiveMarker = new Marker3DInteractiveElement({
    position,
    gmpPopoverTargetElement: popover,
    title: "Click to view details",
  });

  // Listen for click / keyboard activation events
  interactiveMarker.addEventListener("gmp-click", (event) => {
    console.log("Interactive 3D marker clicked at:", position);
  });

  map3DElement.append(interactiveMarker);
  map3DElement.append(popover);
}
```

### 5. Set Marker Collision Behavior

Specify how a marker should behave when it collides with another marker or a 3D
map label by setting `collisionBehavior`:

-   `'REQUIRED'`: Always display the marker regardless of collision.
-   `'OPTIONAL_AND_HIDES_LOWER_PRIORITY'`: Display the marker only if it does
    not overlap with other markers; hides lower-priority markers or labels.
-   `'REQUIRED_AND_HIDES_OPTIONAL'`: Always display the marker and hide any
    optional markers that overlap with it.

```javascript
async function addCollisionConfiguredMarker() {
  const { Marker3DElement } = await google.maps.importLibrary("maps3d");
  const map3DElement = document.querySelector("gmp-map-3d");

  const marker = new Marker3DElement({
    position: { lat: 37.7952, lng: -122.4028 },
    // Specify collision behavior
    collisionBehavior: "REQUIRED",
  });

  map3DElement.append(marker);
}
```

--------------------------------------------------------------------------------

## Lifecycle Management & Cleanup

When managing dynamic datasets (such as filtering locations or refreshing
markers), ensure proper DOM cleanup to maintain optimal rendering performance:

```javascript
const activeMarkers = [];

function createAndTrackMarker(map3DElement, Marker3DElement, position) {
  const marker = new Marker3DElement({ position });
  map3DElement.append(marker);
  activeMarkers.push(marker);
}

function clearAll3DMarkers() {
  for (const marker of activeMarkers) {
    marker.remove(); // Removes the 3D marker element from the DOM and map
  }
  activeMarkers.length = 0;
}
```

## Reference Links

-   **Official Documentation**:
    [Add a marker to a 3D map](https://developers.google.com/maps/documentation/javascript/3d/marker-add)
-   **Open Source Samples**:
    -   [Add Map & Marker Sample](https://github.com/googlemaps/js-samples/blob/HEAD/samples/add-map/index.ts?utm_campaign=gmp_git_agentskills_v1)
    -   [Marker Removal & Lifecycle Sample](https://github.com/googlemaps/js-samples/blob/HEAD/samples/marker-remove/index.ts?utm_campaign=gmp_git_agentskills_v1)
    -   [Advanced Marker Interaction Sample (React)](https://github.com/visgl/react-google-maps/blob/HEAD/examples/advanced-marker-interaction/src/app.tsx?utm_campaign=gmp_git_agentskills_v1)
