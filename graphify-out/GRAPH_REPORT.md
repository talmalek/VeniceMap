# Graph Report - .  (2026-11-26)

## Corpus Check
- Large corpus: 54 files · ~1,075,594 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 75 nodes · 96 edges · 6 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_README  SDR  routeCalibration|README / SDR / routeCalibration]]
- [[_COMMUNITY_veniceData|veniceData]]
- [[_COMMUNITY_AlbumImportModal|AlbumImportModal]]
- [[_COMMUNITY_exifParser|exifParser]]
- [[_COMMUNITY_routeParser|routeParser]]
- [[_COMMUNITY_AGENTS  cryptoKey|AGENTS / cryptoKey]]

## God Nodes (most connected - your core abstractions)
1. `docs/SDR.md (Software Design Record)` - 19 edges
2. `rebuildRoutePoints()` - 7 edges
3. `parseAlbumImageFiles()` - 6 edges
4. `parseRouteObject()` - 6 edges
5. `haversineMeters()` - 5 edges
6. `snapRouteWithGoogleWalking()` - 5 edges
7. `cleanGpsErrors()` - 4 edges
8. `handleProcessFiles()` - 4 edges
9. `sleep()` - 3 edges
10. `snapRouteWithGoogleRoadsApi()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `docs/SDR.md (Software Design Record)` --references--> `getRouteProgressAtTime()`  [INFERRED]
  docs/SDR.md → src/utils/routeParser.ts
- `docs/SDR.md (Software Design Record)` --references--> `exportCalibratedRouteJson()`  [INFERRED]
  docs/SDR.md → src/utils/routeCalibration.ts
- `docs/SDR.md (Software Design Record)` --references--> `decryptApiKey()`  [INFERRED]
  docs/SDR.md → src/utils/cryptoKey.ts
- `docs/SDR.md (Software Design Record)` --references--> `haversineMeters()`  [INFERRED]
  docs/SDR.md → src/utils/routeParser.ts
- `docs/SDR.md (Software Design Record)` --references--> `parseLatLngString()`  [INFERRED]
  docs/SDR.md → src/utils/routeParser.ts

## Communities

### Community 0 - "README / SDR / routeCalibration"
Cohesion: 0.41
Nodes (11): veniceSampleRoute.json (24/09/2026 Calibrated Route), README.md (Project Documentation), docs/SDR.md (Software Design Record), cleanGpsErrors(), exportCalibratedRouteJson(), haversineMeters(), rebuildRoutePoints(), sleep() (+3 more)

### Community 1 - "veniceData"
Cohesion: 0.25
Nodes (3): computeViewportCoverZoom(), computeWidescreenBounds(), findClosestVeniceZone()

### Community 2 - "AlbumImportModal"
Cohesion: 0.32
Nodes (3): handleDrop(), handleOpenLocalDirectory(), handleProcessFiles()

### Community 3 - "exifParser"
Cohesion: 0.43
Nodes (5): formatCaptureDate(), formatFileTitle(), parseAlbumImageFiles(), pickLocalDesktopDirectory(), yieldToMain()

### Community 4 - "routeParser"
Cohesion: 0.53
Nodes (5): getRouteProgressAtTime(), haversineMeters(), parseLatLngString(), parseRouteJson(), parseRouteObject()

### Community 9 - "AGENTS / cryptoKey"
Cohesion: 1.0
Nodes (2): AGENTS.md (Operational Context), decryptApiKey()

## Knowledge Gaps
- **Thin community `AGENTS / cryptoKey`** (3 nodes): `AGENTS.md (Operational Context)`, `cryptoKey.ts`, `decryptApiKey()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseAlbumImageFiles()` connect `exifParser` to `veniceData`, `AlbumImportModal`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `docs/SDR.md (Software Design Record)` connect `README / SDR / routeCalibration` to `AGENTS / cryptoKey`, `routeParser`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `findClosestVeniceZone()` connect `veniceData` to `exifParser`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `docs/SDR.md (Software Design Record)` (e.g. with `routeCalibration.ts` and `haversineMeters()`) actually correct?**
  _`docs/SDR.md (Software Design Record)` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `rebuildRoutePoints()` (e.g. with `isInsideMapBounds()` and `docs/SDR.md (Software Design Record)`) actually correct?**
  _`rebuildRoutePoints()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `parseAlbumImageFiles()` (e.g. with `findClosestVeniceZone()` and `handleProcessFiles()`) actually correct?**
  _`parseAlbumImageFiles()` has 2 INFERRED edges - model-reasoned connections that need verification._