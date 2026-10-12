# AL Sewer Health Predictor

Static, browser-based screening prototype for Krushna Kharwade. Non-CCTV inputs, transparent factor contributions, manual assessments, CSV import/export, synthetic test scenarios and public Chennai input prefills. No prediction API, trained model, or durable record storage is used.

## Run and validate

Static entry: `dist/index.html`. Serve `dist` with any ordinary static host supporting JavaScript modules. No build or external frontend dependency is needed. Core validation: `npm test` or `node --test tests/core.test.mjs`.

Scoring module: `dist/model.js`. Public rainfall window: `dist/public-data.js`. Client interactions: `dist/app.js`. The deployed Site is public; the app does not implement a sign-in system.

## Prediction meaning

The result is a 0–100 assumption-based maintenance screening index, not an empirically calibrated probability, structural-health measurement or 30-day forecast. Weights, caps, material multipliers, thresholds and units are visible under Data & method. Factor points sum to the index before rounding. Location is an identifier and is not scored. Low 0–34, Moderate 35–64, High 65–100.

The cleaning comparison only resets cleaning delay and assumes at least four cleanings per year. It is an arithmetic scenario and does not establish a causal maintenance benefit. This model must not be advertised as validated ML. Accuracy is unknown.

## Synthetic and public data

`dist/sample-data.js` contains 12 fabricated Chennai locality scenarios; no observations are represented. Each exported record contains `data_source`, `source_note`, and prediction version.

Real source inputs were retrieved 2026-10-06:

- Sewer-main KMZ: OpenCity Chennai Sewerage Collection System, attributed to CMWSSB GIS. Companion TXT decodes material and pipe-size codes. 181,147 source features; the app includes 380 selected features from 191 depot keys. Sampling selects at most the first two eligible features per depot, not a statistical sample or a verified inventory of unique assets. Unrecognised codes are excluded (1,522 features). Actual pipe age, cleaning and incident histories are not present in this extraction.
- Daily rainfall CSV: OpenCity Chennai Daily Rainfall Data from 1991–2023, source attributed to TNDMA in the resource metadata. Raw file has 21,416 readings and 62 station names. Actual dates in this snapshot run 1993-03-03 through 2023-12-26. Exact duplicates collapse. 86 station-days have conflicting readings and cannot be used in a complete window. Missing dates are never interpreted as zero. A seven-day total applies only when all seven preceding days have unambiguous observations at one station.

Public inputs do not create complete sewer assessment records by themselves. Prefills leave unavailable numbers empty. User-entered estimates combined with public fields must be labeled Mixed / estimated and explained. All provenance labels on user records are self-reported, not verified.

Source URLs, sampling rules, retrieval dates, licenses as listed by the portals and original file SHA-256 values are recorded in `dist/data/*json`. The unmodified rainfall CSV and sewer code dictionary are hosted for download. The original sewer KMZ is not bundled in this GitHub export. To rebuild the sewer subset, download the `meta.raw_url` recorded in `dist/data/chennai-sewer-subset.json`, save it as `source-data/chennai-sewer-main.kmz`, and verify its SHA-256 against `meta.raw_sha256`. The application runs using the included derived JSON; it does not require the KMZ.

Rebuild derived data with `python scripts/prepare-rainfall.py` and `python scripts/prepare-sewers.py`. The rainfall snapshot is included. Rebuilding sewer data requires the original KMZ downloaded as described above. Both portals list Other (Public Domain).

Source resource pages:

- https://data.opencity.in/dataset/chennai-sewerage-collection-system
- https://data.opencity.in/dataset/chennai-rainfall-data/resource/3086f865-a04c-431e-815d-105ae658871f

## Input and privacy behavior

Every numeric value is required and checked against ranges. Counts must be integers; dates must be valid ISO dates. Missing numeric values cannot be substituted with zero. Unknown material uses a documented assumption and is flagged.

CSV input: exact headers in `dist/model.js` (`columns`); maximum 1,000 rows / 2 MB; duplicate identifiers and invalid rows block the entire import. Quoted fields are supported. Source fields are required. Result exports include model version and guard text cells from spreadsheet formula execution.

CSV import replaces the session dataset. Entries exist only in memory while the page is open; no localStorage, D1 or cloud record collection. Export before reload or closing. Source input assets are served from the same Site. App code contains no telemetry, external fonts or third-party scripts.

## Validation performed

- Seven automated core test groups pass: score/explanation arithmetic; missing/range/date rejection; sensible monotonic responses; CSV round trips/provenance; malformed/duplicate/oversized import rejection; actual decoded public dimensions; complete/incomplete/conflicting rainfall windows.
- DOM workflow exercised using jsdom: navigation, search and filtering, prediction, record add/edit, stale result invalidation, public prefills, CSV file preview/import/error without record corruption, export and optional WebMCP action state.
- Local assets, HTML references, module syntax and source-data hashes checked before deployment.
- Real cloud-browser rendering and native WebMCP integration were not tested. Static Sites in this environment have no supported browser-preview server. The DOM check uses a WebMCP registry test double rather than a browser implementation.

## Path to supervised ML

Obtain dated, deduplicated, asset-linked verified blockages and completed cleanings. Define a future event horizon (e.g. verified blockage within 30 days), observe non-events, create past-only feature windows and avoid leakage. Evaluate with temporal and geographic holdouts, class-imbalance-aware PR-AUC/recall and calibration against a simple baseline. Flooding and complaints require verification and are not interchangeable with confirmed sewer outcomes.

## Live demo

https://al-sewer-health-krushna.krushnask191204.chatgpt.site

## Run locally

```bash
python -m http.server 8000 --directory dist
```

Open http://localhost:8000. Node.js is needed only to run the core tests.

## GitHub export limits

The detailed `dist/data/chennai-sewer-subset.json` infrastructure dataset and original KMZ are omitted from this export. Manual predictions, synthetic scenarios, and CSV assessments remain available. The combined Chennai source explorer requires the omitted dataset; it shows an unavailable-source notice without it. The full test suite includes an asset-data test that requires that JSON file. Seven tests passed against the deployed source before export.
