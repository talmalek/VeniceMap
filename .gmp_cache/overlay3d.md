# Add an overlay to a photorealistic 3D map

You can add objects to a photorealistic 3D map to designate points, lines,
areas, or collections of objects. In the 3D Maps in Maps JavaScript API, these
objects are called **overlays**. Overlays are tied to geographic coordinates,
meaning they move and scale appropriately when you drag, tilt, rotate, or zoom
the map.

## Prerequisites

-   **Add an interactive, photorealistic 3D map to a web page**: Ensure you have
    initialized a `<gmp-map-3d>` element or `Map3DElement` instance via the
    `maps3d` library.

--------------------------------------------------------------------------------

## Supported 3D Overlay Types

The 3D Maps in Maps JavaScript API supports several types of overlays that you
can add programmatically or declaratively:

1.  **[Popovers](https://developers.google.com/maps/documentation/javascript/3d/popovers)**
    (`PopoverElement` / `<gmp-popover>`):

    -   A special kind of overlay for displaying content (usually text, HTML, or
        images) at a given location or anchored to a marker on a 3D map.
    -   Popovers are analogous to
        [Info windows](https://developers.google.com/maps/documentation/javascript/infowindows)
        in the 2D Maps JavaScript API.

2.  **[Polylines](https://developers.google.com/maps/documentation/javascript/3d/shapes-lines#polylines)**
    (`Polyline3DElement` / `<gmp-polyline-3d>`):

    -   Lines on the map represented as an ordered sequence of 3D coordinates
        (`LatLngAltitude` or `LatLng`) connected by line segments.
    -   Supports customization for stroke color, width, outer width, altitude
        mode, and extruded rendering.

3.  **[Polygons](https://developers.google.com/maps/documentation/javascript/3d/shapes-lines#polygons)**
    (`Polygon3DElement` / `<gmp-polygon-3d>`):

    -   Areas of arbitrary shape on the map. Like polylines, polygons are an
        ordered sequence of locations, but they define a closed region that they
        enclose.
    -   Supports fill color, stroke styling, inner holes, altitude modes, and 3D
        extrusion.

4.  **[Models](https://developers.google.com/maps/documentation/javascript/3d/models)**
    (`Model3DElement` / `<gmp-model-3d>`):

    -   glTF (`.gltf` or `.glb`) resources rendered directly on the map as
        three-dimensional shapes at specific geographic coordinates,
        orientations, and scales.

--------------------------------------------------------------------------------

## Implementation Patterns

In 3D Maps (`maps3d`), overlays are implemented as custom web components
(`HTMLElement` subclasses). You add an overlay to the map by appending the
overlay element as a child of the `<gmp-map-3d>` element, and remove it by
removing the element from the DOM.

### 1. Initializing the 3D Map with Usage Attribution

When creating a 3D map web component, include the
`internal-usage-attribution-ids` attribute on `<gmp-map-3d>`:

```html
<gmp-map-3d
  id="map-3d"
  mode="hybrid"
  center="37.7952,-122.4028,100"
  range="2000"
  tilt="60"
  heading="30"
  internal-usage-attribution-ids="gmp_git_agentskills_v1">
</gmp-map-3d>
```

### 2. Adding Overlays Programmatically (`maps3d` Library)

Use `google.maps.importLibrary("maps3d")` to dynamically load the 3D overlay
classes and append them to the map element.

```typescript
async function init3DOverlays(): Promise<void> {
  // Import the 3D maps library
  const {
    Map3DElement,
    Polyline3DElement,
    Polygon3DElement,
    PopoverElement,
    Model3DElement,
    AltitudeMode,
  } = (await google.maps.importLibrary("maps3d")) as google.maps.Maps3DLibrary;

  const map3D = document.querySelector("gmp-map-3d") as google.maps.maps3d.Map3DElement;

  // 1. Add a 3D Polyline
  const polyline = new Polyline3DElement({
    strokeColor: "#4285F4",
    strokeWidth: 8,
    altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
    extruded: true,
  });
  polyline.coordinates = [
    { lat: 37.7952, lng: -122.4028, altitude: 50 },
    { lat: 37.7980, lng: -122.4050, altitude: 50 },
    { lat: 37.8005, lng: -122.4010, altitude: 50 },
  ];
  map3D.append(polyline);

  // 2. Add a 3D Polygon
  const polygon = new Polygon3DElement({
    fillColor: "rgba(52, 168, 83, 0.5)",
    strokeColor: "#34A853",
    strokeWidth: 4,
    altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
    extruded: true,
  });
  polygon.outerCoordinates = [
    { lat: 37.7920, lng: -122.4040, altitude: 80 },
    { lat: 37.7940, lng: -122.4040, altitude: 80 },
    { lat: 37.7940, lng: -122.4010, altitude: 80 },
    { lat: 37.7920, lng: -122.4010, altitude: 80 },
    { lat: 37.7920, lng: -122.4040, altitude: 80 }, // Close loop
  ];
  map3D.append(polygon);

  // 3. Add a Popover
  const popover = new PopoverElement({
    open: true,
    positionAnchor: { lat: 37.7952, lng: -122.4028, altitude: 60 },
  });
  popover.append("Transamerica Pyramid Area");
  map3D.append(popover);

  // 4. Add a 3D glTF Model
  const model = new Model3DElement({
    src: "https://example.com/path/to/model.glb",
    position: { lat: 37.7960, lng: -122.4000, altitude: 20 },
    altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
    scale: 10,
  });
  map3D.append(model);
}

init3DOverlays();
```

### 3. Lifecycle Management (Removing Overlays)

Because 3D overlays are standard DOM elements inside `<gmp-map-3d>`, removing an
overlay is done using standard DOM removal methods:

```typescript
function remove3DOverlay(overlayElement: HTMLElement): void {
  overlayElement.remove();
}
```

--------------------------------------------------------------------------------

## Reference: 2D Map Overlays vs. 3D Map Overlays

If you are migrating from or working alongside a standard 2D `google.maps.Map`
instance, note the structural differences in how overlays are managed:

Feature           | 3D Maps (`gmp-map-3d`)                                                                                                             | 2D Maps (`google.maps.Map`)
:---------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :--------------------------
**Library**       | `await google.maps.importLibrary("maps3d")`                                                                                        | `await google.maps.importLibrary("maps")`
**Popups / Info** | `[PopoverElement](https://developers.google.com/maps/documentation/javascript/3d/popovers)` (`<gmp-popover>`)                      | `[google.maps.InfoWindow](https://developers.google.com/maps/documentation/javascript/infowindows)` or custom `OverlayView`
**Lines**         | `[Polyline3DElement](https://developers.google.com/maps/documentation/javascript/3d/shapes-lines#polylines)` (`<gmp-polyline-3d>`) | `google.maps.Polyline`
**Areas**         | `[Polygon3DElement](https://developers.google.com/maps/documentation/javascript/3d/shapes-lines#polygons)` (`<gmp-polygon-3d>`)    | `google.maps.Polygon`
**3D Models**     | `[Model3DElement](https://developers.google.com/maps/documentation/javascript/3d/models)` (`<gmp-model-3d>`)                       | `WebGLOverlayView` / ThreeJS integration
**Attachment**    | `map3D.append(overlay)`                                                                                                            | `overlay.setMap(map)`
**Removal**       | `overlay.remove()`                                                                                                                 | `overlay.setMap(null)`

### Verified 2D Overlay Patterns (For Reference & Hybrid Apps)

In standard 2D maps, overlays use `setMap(map)` to attach and `setMap(null)` to
detach, as demonstrated in official open-source samples:

-   **Adding a Map & Marker (`importLibrary`)**:
    [https://github.com/googlemaps/js-samples/blob/HEAD/samples/add-map/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/add-map/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   **Removing Overlays (`setMap(null)`)**:
    [https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-remove/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-remove/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   **Custom HTML Popup Overlay (`OverlayView`)**:
    [https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-popup/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-popup/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   **Hiding and Showing Overlays**:
    [https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-hideshow/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-hideshow/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   **Polygons & Geometry Manipulation**:
    [https://github.com/googlemaps/js-samples/blob/HEAD/samples/map-puzzle/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/map-puzzle/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   **Polylines & Symbols**:
    -   [https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-symbol-arrow/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-symbol-arrow/index.ts?utm_campaign=gmp_git_agentskills_v1)
    -   [https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-symbol-dashed/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-symbol-dashed/index.ts?utm_campaign=gmp_git_agentskills_v1)
    -   [https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-symbol-custom/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-symbol-custom/index.ts?utm_campaign=gmp_git_agentskills_v1)
    -   [https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-symbol-animate/index.ts?utm_campaign=gmp_git_agentskills_v1](https://github.com/googlemaps/js-samples/blob/HEAD/samples/overlay-symbol-animate/index.ts?utm_campaign=gmp_git_agentskills_v1)
