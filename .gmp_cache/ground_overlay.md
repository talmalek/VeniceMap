# Add an Overlay Image Grounded to the Surface of a Map

## Overview

Overlays are objects on a map that are tied to latitude and longitude
coordinates, allowing them to move and scale smoothly as the user drags or zooms
the map. To place a single image anchored to specific geographical bounds on the
map's surface, use the `google.maps.GroundOverlay` class. The image renders
constrained to the given `LatLngBounds` and conforms to the map's projection.

## Prerequisites

-   **Add a customizable, interactive map to a web page or mobile app**: You
    must have the Maps JavaScript API loaded and an initialized
    `google.maps.Map` instance on your page.

## Implementation Workflow

### 1. Define the Geographical Bounds

Specify the area where the image will be anchored using a
`google.maps.LatLngBounds` instance or a `google.maps.LatLngBoundsLiteral`
object (`{ north, south, east, west }`).

```javascript
const imageBounds = {
  north: 40.773941,
  south: 40.712216,
  east: -74.12544,
  west: -74.22655,
};
```

### 2. Instantiate and Attach the GroundOverlay

Create a new `google.maps.GroundOverlay` object by passing the image URL and the
geographical bounds to its constructor. Call `setMap(map)` on the overlay
instance to render it on the map.

### 3. Manage Overlay Lifecycle (Hide, Restore, or Delete)

-   **Hide / Remove from Map**: Call `overlay.setMap(null)`. Note that this
    removes the overlay from the map display but retains the object instance in
    memory so it can be re-attached later.
-   **Restore to Map**: Call `overlay.setMap(map)` on the existing instance.
-   **Delete**: Call `overlay.setMap(null)` to detach it from the map, and then
    set the overlay reference variable itself to `null` (`overlay = null`) to
    allow garbage collection.

--------------------------------------------------------------------------------

## Complete Code Examples

### Modern Asynchronous Pattern (`importLibrary`)

This example uses the modern `google.maps.importLibrary()` pattern to initialize
the map and attach a `GroundOverlay`.

```javascript
let map;
let historicalOverlay;

async function initMap() {
  const { Map, GroundOverlay } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    zoom: 13,
    center: { lat: 40.74, lng: -74.18 },
    internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
  });

  const imageBounds = {
    north: 40.773941,
    south: 40.712216,
    east: -74.12544,
    west: -74.22655,
  };

  historicalOverlay = new GroundOverlay(
    "https://storage.googleapis.com/geo-devrel-public-buckets/newark_nj_1922-661x516.jpeg",
    imageBounds
  );

  historicalOverlay.setMap(map);
}

initMap();
```

### TypeScript with UI Lifecycle Controls (Add, Remove, Restore)

Based on the official open-source sample
([samples/overlay-remove/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-remove/index.ts?utm_campaign=gmp_git_agentskills_v1)),
this implementation demonstrates how to attach UI controls to toggle the ground
overlay on and off the map.

```typescript
let historicalOverlay: google.maps.GroundOverlay | null;
let map: google.maps.Map;

function initMap(): void {
  map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
    zoom: 13,
    center: { lat: 40.74, lng: -74.18 },
    internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
  });

  const imageBounds: google.maps.LatLngBoundsLiteral = {
    north: 40.773941,
    south: 40.712216,
    east: -74.12544,
    west: -74.22655,
  };

  historicalOverlay = new google.maps.GroundOverlay(
    "https://storage.googleapis.com/geo-devrel-public-buckets/newark_nj_1922-661x516.jpeg",
    imageBounds
  );

  // Attach UI event listeners for lifecycle management
  document
    .getElementById("restore-overlay")
    ?.addEventListener("click", restoreOverlay);
  document
    .getElementById("remove-overlay")
    ?.addEventListener("click", removeOverlay);

  // Initially display the overlay on the map
  restoreOverlay();
}

function restoreOverlay(): void {
  if (historicalOverlay) {
    historicalOverlay.setMap(map);
  }
}

function removeOverlay(): void {
  if (historicalOverlay) {
    historicalOverlay.setMap(null);
  }
}

function deleteOverlay(): void {
  if (historicalOverlay) {
    historicalOverlay.setMap(null);
    historicalOverlay = null;
  }
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
export {};
```

--------------------------------------------------------------------------------

## Choosing the Right Image Overlay Class

While `GroundOverlay` is the standard choice for anchoring a single image to
geographic bounds, the Maps JavaScript API provides other classes depending on
your specific requirements:

Class                           | Best Used For                                                                                                                                                    | Reference Sample
:------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------
**`google.maps.GroundOverlay`** | Placing a single static image conformed directly to the map's projection within a bounding box (`LatLngBounds`).                                                 | [samples/overlay-remove/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-remove/index.ts?utm_campaign=gmp_git_agentskills_v1)
**`google.maps.OverlayView`**   | Custom HTML/DOM overlays (such as `<div>` containers, custom CSS visibility toggling, or interactive popups) tied to map coordinates via `fromLatLngToDivPixel`. | [samples/overlay-simple/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-simple/index.ts?utm_campaign=gmp_git_agentskills_v1)<br>[samples/overlay-hideshow/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-hideshow/index.ts?utm_campaign=gmp_git_agentskills_v1)
**`google.maps.ImageMapType`**  | Large or multi-resolution tiled image overlays pushed into `map.overlayMapTypes` that load dynamically based on tile coordinates (`x`, `y`) and `zoom` level.    | [samples/maptype-image-overlay/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/maptype-image-overlay/index.ts?utm_campaign=gmp_git_agentskills_v1)

## Reference Links

-   [Ground Overlays Documentation](https://developers.google.com/maps/documentation/javascript/groundoverlays)
-   [GroundOverlay API Reference](https://developers.google.com/maps/documentation/javascript/reference#GroundOverlay)
-   [Drawing on the Map (Other Overlays)](https://developers.google.com/maps/documentation/javascript/overlays)
-   [Using TypeScript with Google Maps](https://developers.google.com/maps/documentation/javascript/using-typescript)
