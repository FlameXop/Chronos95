# Implementation Plan: Chronos 95 Retro OS

## Overview

The plan builds Chronos 95 bottom-up. Pure logic modules come first (Event_Bus, Store, window model, raster core, validators, Pydantic models), each followed by its property tests. DOM shells and plugin apps come next, and a final wiring task connects everything through `main.js`. The Frontend is Vanilla HTML5, CSS3, and ES6 modules (`type="module"`). Frontend tests use `node:test` with `fast-check`. The Backend is Python 3.11+ with FastAPI, Pydantic v2, and Hypothesis. Names follow the compliance rules: "Chronos 95", "NotePad.exe", "PixelPaint.exe", "Chippy". Every cross-component interaction goes through `store.js` and `eventBus.js`.

## Tasks

- [ ] 1. Set up project structure and tooling
  - [ ] 1.1 Scaffold the Backend project
    - Create `backend/app` (with `routers/`) and `backend/tests` packages, `requirements.txt` with pinned FastAPI, Pydantic v2, uvicorn, httpx, pytest, and Hypothesis
    - Add `backend/app/config.py` reading `CHIPPY_API_KEY`, `ALLOWED_ORIGIN`, `DOCUMENT_STORE_DIR`, with a startup check that exits non-zero within 10 s and writes to stderr when the store directory is unset or unwritable
    - _Requirements: 11.8, 12.4, 12.5, 12.6, 12.7, 13.2, 13.9_
  - [ ] 1.2 Scaffold the Frontend project
    - Create `frontend/index.html` loading only `<script type="module">`, plus `css/`, `assets/`, `js/core`, `js/apps`, `js/ui`, and `frontend/tests/`
    - Add a dev-only `package.json` with pinned `fast-check` and a `node:test` script; no UI framework dependency
    - _Requirements: 13.1, 13.3, 13.4, 14.10_

- [ ] 2. Implement Event_Bus, Store, and power routing
  - [ ] 2.1 Implement `core/eventBus.js`
    - `subscribe` (returns unsubscribe) and `publish` using a snapshot of subscribers, per-handler try/catch that logs the event name, and safe unsubscribe during dispatch
    - Publishing with no subscribers is a no-op
    - _Requirements: 1.6, 1.7, 1.8, 1.11_
  - [ ]* 2.2 Write property test for Event_Bus
    - **Property 2: Event_Bus delivery, isolation, and unsubscribe**
    - **Validates: Requirements 1.6, 1.7, 1.8, 14.6**
  - [ ] 2.3 Implement `core/store.js` and `core/powerRouter.js`
    - Store starts at `OFF`, uses the transition table, writes state before publishing `power:changed`, and publishes one `error:invalid-transition` on rejection
    - Reset shell and window state on transition to `OFF`
    - `routePowerButton` and subscribers mapping `power:button-pressed`, `boot:complete`, and `shutdown:complete` to transition requests
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.9, 1.10, 3.2, 3.3, 3.5, 4.4, 5.6, 5.7_
  - [ ]* 2.4 Write property test for Store transitions
    - **Property 1: Power state is always valid and transitions follow the table**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.10, 14.4, 14.5**
  - [ ]* 2.5 Write property test for power button routing
    - **Property 4: Power button routing**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
  - [ ]* 2.6 Write property test for reset on power off
    - **Property 11: Reset to fresh state on power off**
    - **Validates: Requirements 5.7**

- [ ] 3. Implement the plugin Window_Manager
  - [ ] 3.1 Implement the pure window model (`core/windowModel.js`)
    - Pure operations for open, focus, minimize, restore, maximize, close; unique stacking order; focus fallback to the topmost non-minimized window
    - `clampMove` (40 px title bar rule) and `clampResize` (min 200x120, max Desktop area)
    - _Requirements: 7.9, 7.10, 7.11, 7.12, 7.15, 7.16, 7.17, 7.18, 7.19, 7.20_
  - [ ]* 3.2 Write property test for window model invariants
    - **Property 7: Window model invariants under operation sequences**
    - **Validates: Requirements 7.11, 7.12, 7.15, 7.16, 7.17, 7.18, 14.7**
  - [ ]* 3.3 Write property test for maximize round trip
    - **Property 8: Maximize round trip**
    - **Validates: Requirements 7.19, 7.20**
  - [ ]* 3.4 Write property test for move and resize clamping
    - **Property 9: Move and resize clamping**
    - **Validates: Requirements 7.9, 7.10**
  - [ ] 3.5 Implement `core/windowManager.js`
    - `registerApp` validating the App_Contract (missing members and duplicate ids publish `error:invalid-app`), `launch` gated on `RUNNING`, mount failure rollback, window chrome (title bar, minimize, maximize, close), drag and resize handlers, and `closeAll` with per-window try/catch
    - Handle `app:launch-requested`, `window:restore-requested`, `window:minimize-requested`, `window:focus-requested`, and `power:changed` to `SHUTTING_DOWN`; publish `window:focused`, `window:minimized`, `window:closed`
    - The manager never imports an app module
    - _Requirements: 5.2, 5.8, 5.9, 5.10, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.13, 7.14, 7.21, 7.22_
  - [ ]* 3.6 Write property test for launch gating and registration
    - **Property 6: Launch is gated and window registration is validated**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 5.10**
  - [ ]* 3.7 Write property test for close-all
    - **Property 10: Close-all closes everything despite failures**
    - **Validates: Requirements 5.2, 5.8, 5.9, 7.13, 7.14**

- [ ] 4. Implement the CRT Hardware_Rig
  - [ ] 4.1 Implement `ui/hardwareRig.js` and `css/crt.css`
    - Pure `rigViewModel` returning `null` for unknown states; rig DOM with CRT bezel, case, LED, and a native power `<button>` with `aria-pressed`, accessible name, and `:focus-visible` outline
    - Publish `power:button-pressed` only in `OFF` or `RUNNING`; update only on `power:changed`
    - CRT scanlines, curvature, phosphor glow; 700 ms turn-on and turn-off keyframes; `prefers-reduced-motion` instant change
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.1, 3.4, 3.6, 3.7, 3.8, 3.9_
  - [ ]* 4.2 Write property test for the rig view model
    - **Property 3: Rig view model is total and ignores invalid states**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.11, 3.8, 3.9**
  - [ ]* 4.3 Write unit tests for the rig DOM
    - Keyboard activation (Enter, Space), ignored presses while booting or shutting down, ARIA state, focus order, reduced-motion CSS present
    - _Requirements: 2.8, 3.4, 3.6, 3.7, 3.8_

- [ ] 5. Implement API client, boot, and shutdown sequencers
  - [ ] 5.1 Implement `core/apiClient.js`
    - `health`, `chat`, `listDocuments`, `getDocument`, `createDocument`, `updateDocument`, `deleteDocument` using `fetch` and `AbortController` (health 2 s, others 10 s); normalized errors `{kind, message}`
    - _Requirements: 4.6, 8.12, 10.6, 11.1_
  - [ ] 5.2 Implement `core/bootSequencer.js`
    - Injected scheduler and api; stages memory test, hardware list, splash (each at least 500 ms, total under 6000 ms)
    - Health check with 2 s abort and "Chippy offline" notice; `completed` flag for exactly one `boot:complete`; Escape handling; cancel on leaving `BOOTING`
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7, 4.8, 4.9, 4.10_
  - [ ]* 5.3 Write property test for the boot sequence
    - **Property 5: Boot sequence completes exactly once**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.7, 4.8, 4.9, 4.10**
  - [ ] 5.4 Implement `core/shutdownSequencer.js`
    - Wait for windows to close, show "It is now safe to turn off your computer", publish `shutdown:complete` within 3000 ms of entering `SHUTTING_DOWN`
    - _Requirements: 5.3, 5.4, 5.5_
  - [ ]* 5.5 Write unit tests for boot and shutdown screens
    - Boot screen order, offline notice, shutdown text and timing with fake timers
    - _Requirements: 4.1, 4.7, 5.3, 5.4_

- [ ] 6. Implement the OS_Shell, Taskbar, and Start_Menu
  - [ ] 6.1 Implement pure shell helpers (`ui/shellModel.js`)
    - `iconsFor`, `formatClock`, `truncateTitle`, `taskbarButtons`, and taskbar click-to-event mapping
    - _Requirements: 6.1, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11_
  - [ ]* 6.2 Write property test for shell view models
    - **Property 12: Shell view models**
    - **Validates: Requirements 6.1, 6.7, 6.8, 6.9, 6.10, 6.11**
  - [ ]* 6.3 Write property test for the clock format
    - **Property 13: Clock format**
    - **Validates: Requirements 6.6**
  - [ ] 6.4 Implement `ui/osShell.js`, `ui/taskbar.js`, `ui/startMenu.js`, `ui/dialogs.js`, and `css/shell.css`, `css/window.css`
    - Desktop icons with 500 ms double-click, Start_Button toggle, outside-click close, Clock refresh, taskbar buttons, roving-tabindex keyboard navigation, error dialog for failed launches
    - Shut Down publishes `power:button-pressed`; ignore input while `SHUTTING_DOWN`; close Start_Menu on shutdown; each component touches only its own DOM subtree
    - _Requirements: 4.5, 5.1, 5.10, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.12, 6.13, 6.14, 13.5_
  - [ ]* 6.5 Write unit tests for shell behavior
    - Double-click launch, Start_Menu toggle and Escape, keyboard navigation, error dialog on unknown app, input ignored during shutdown
    - _Requirements: 6.2, 6.3, 6.5, 6.12, 6.13, 5.10_

- [ ] 7. Checkpoint - Ensure all Frontend core tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement the Backend API
  - [ ] 8.1 Implement Pydantic models (`app/models.py`)
    - `DocumentKind`, `DocumentIn` with text length and image base64/PNG-signature/size validators, `DocumentUpdate`, `Document`, `ChatRequest`, `ChatResponse`, `HealthResponse`, `ErrorBody`
    - _Requirements: 11.2, 11.4, 11.8, 11.12, 11.13, 11.14, 11.15_
  - [ ] 8.2 Implement the Document_Store (`app/store.py`)
    - `DocumentStore` protocol and a file-per-document JSON implementation with atomic writes; create, get, list by kind, update (keep id, kind, created_at; advance updated_at), delete
    - _Requirements: 11.4, 11.5, 11.6, 11.7, 11.17, 12.11_
  - [ ] 8.3 Implement `ChippyService` (`app/chippy.py`)
    - Deterministic rule engine naming "Chippy" and "Chronos 95", replies truncated to 4000 characters; optional provider path under an 8 s timeout raising `ChippyUnavailable`
    - _Requirements: 10.10, 11.2, 11.11, 11.19_
  - [ ] 8.4 Implement `app/main.py` and `app/routers`
    - Health, chat, and documents endpoints; 422 with per-field errors; 404 and 503 `ErrorBody`; CORS limited to `ALLOWED_ORIGIN` (none when unset); startup check from config
    - _Requirements: 11.1, 11.2, 11.3, 11.9, 11.10, 11.11, 11.16, 12.5, 12.6, 12.7_
  - [ ]* 8.5 Write property test for Document JSON round trip
    - **Property 21: Document JSON round trip**
    - **Validates: Requirements 11.18**
  - [ ]* 8.6 Write stateful property test for Document CRUD
    - **Property 20: Document CRUD model consistency** (Hypothesis `RuleBasedStateMachine`, at least 100 examples)
    - **Validates: Requirements 11.3, 11.4, 11.5, 11.6, 11.7, 11.17, 12.11**
  - [ ]* 8.7 Write property test for validation boundaries
    - **Property 22: Validation boundaries reject without side effects**
    - **Validates: Requirements 11.2, 11.8, 11.9, 11.10, 11.12, 11.13, 11.14, 11.15, 14.1, 14.2, 14.3**
  - [ ]* 8.8 Write property test for Chippy determinism
    - **Property 23: Chippy replies are deterministic and in persona**
    - **Validates: Requirements 10.10, 11.2, 11.19**
  - [ ]* 8.9 Write unit tests for Backend behavior
    - Health body, 503 on a failing Chippy service, CORS allow and deny, startup exit on an unwritable store directory
    - _Requirements: 11.1, 11.11, 11.16, 12.5, 12.7_

- [ ] 9. Implement NotePad.exe
  - [ ] 9.1 Implement pure helpers (`apps/notepadModel.js`)
    - `validateDocName` (1 to 100), `validateContent` (at most 100000), `windowTitle(name, dirty)`, dirty check
    - _Requirements: 8.4, 8.5, 8.6, 8.13_
  - [ ]* 9.2 Write property test for length validators
    - **Property 14: Text length validators at the boundaries**
    - **Validates: Requirements 8.4, 8.5, 8.6, 10.2, 10.3**
  - [ ]* 9.3 Write property test for dirty title and text round trip
    - **Property 15: NotePad dirty title and text round trip**
    - **Validates: Requirements 8.13, 8.17**
  - [ ] 9.4 Implement `apps/notepadApp.js`
    - App_Contract module "NotePad.exe": menu bar (File, Edit), text area, New, Save (create or update), Open list, Select All, error dialogs retaining state, close confirmation (Save, Discard, Cancel)
    - Publish `notepad:text-changed` events; communicate only through the bus and content element
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 8.15, 8.16, 7.21_
  - [ ]* 9.5 Write unit tests for NotePad flows
    - Save, Open, New, empty list message, API failure retention, close confirmation outcomes (mock API client)
    - _Requirements: 8.3, 8.10, 8.12, 8.15, 8.16_

- [ ] 10. Implement PixelPaint.exe
  - [ ] 10.1 Implement the raster core (`apps/pixelBuffer.js`)
    - 320x240 RGBA buffer, clipped `setPixel`, Bresenham `plotLine`, `plotRectOutline`, `erase`, iterative 4-connected `floodFill` (no-op when colors match)
    - _Requirements: 9.4, 9.6, 9.7, 9.8, 9.9, 9.16_
  - [ ]* 10.2 Write property test for raster bounds and palette
    - **Property 17: Raster operations respect bounds and palette**
    - **Validates: Requirements 9.4, 9.7, 9.8, 9.9, 9.16**
  - [ ]* 10.3 Write property test for flood fill
    - **Property 18: Flood fill correctness and idempotence**
    - **Validates: Requirements 9.6, 14.9**
  - [ ] 10.4 Implement `apps/paintApp.js`
    - App_Contract module "PixelPaint.exe": white canvas, 5 tools, 16-color palette, File menu (New, Save, Open), no smoothing, PNG encode and decode, error dialogs for backend failure and invalid PNG
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.10, 9.11, 9.12, 9.13, 9.14, 9.15, 9.16, 7.21_
  - [ ]* 10.5 Write property test for image round trip
    - **Property 19: Image round trip**
    - **Validates: Requirements 9.17**
  - [ ]* 10.6 Write unit tests for PixelPaint initial state and flows
    - Initial tool, color, and canvas; tool selection; invalid PNG handling
    - _Requirements: 9.2, 9.3, 9.15_

- [ ] 11. Implement the Chippy assistant widget
  - [ ] 11.1 Implement pure helpers (`ui/chippyModel.js`)
    - `validateQuestion` (1 to 2000), `buildChatPayload` with context truncated to 10000 characters, pending/idle state machine
    - _Requirements: 10.2, 10.3, 10.9_
  - [ ]* 11.2 Write property test for context truncation
    - **Property 16: Chippy context truncation**
    - **Validates: Requirements 10.8, 10.9**
  - [ ] 11.3 Implement `ui/chippyWidget.js` and `css/apps.css`
    - Greeting on `RUNNING`, input and speech bubble, "Chippy is thinking" indicator, 10 s timeout and fixed offline message, dismiss control, "Ask Chippy about this text" offered from `notepad:text-changed` and focus events
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_
  - [ ]* 11.4 Write unit tests for Chippy flows
    - Greeting, pending indicator, offline message and retained input, dismiss, command visibility
    - _Requirements: 10.1, 10.5, 10.6, 10.7, 10.8_

- [ ] 12. Implement the compliance scanner
  - [ ] 12.1 Implement `tools/compliance_scan.py`
    - Pure `scan(files, rules)` plus a CLI over tracked files; rules for Trademark_List names (case-insensitive), non-module scripts, and third-party UI framework references; report path and line; non-zero exit; rule list in a documented excluded config; fixtures build trademark strings at runtime
    - _Requirements: 13.3, 13.4, 13.6, 13.10, 14.8_
  - [ ]* 12.2 Write property test for scanner completeness
    - **Property 24: Compliance scanner completeness**
    - **Validates: Requirements 13.3, 13.4, 13.6, 13.10, 14.8**

- [ ] 13. Containerization and configuration
  - [ ] 13.1 Add Docker assets
    - `backend/Dockerfile` (Python 3.11 slim, non-root user, health check), `docker-compose.yml` for Backend plus static Frontend server, persistent volume, `.env.example` with placeholders, and `.gitignore` excluding secrets
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.8, 12.9, 12.10, 12.11_
  - [ ]* 13.2 Write Docker smoke tests
    - Check Dockerfile base version and non-root user, compose file defines both services, `.env.example` lists every variable read by the Backend
    - _Requirements: 12.1, 12.2, 12.8, 12.10_

- [ ] 14. Integration and wiring
  - [ ] 14.1 Wire everything in `js/main.js` and `index.html`
    - Import and register NotePad_App and PixelPaint_App with the Window_Manager; initialize Store, power router, rig, sequencers, shell, and Chippy widget; link all CSS files
    - _Requirements: 4.5, 6.1, 7.22, 13.3, 13.4_
  - [ ]* 14.2 Write integration tests for the power lifecycle
    - With jsdom, fake timers, and a mock API: OFF to BOOTING to RUNNING, launch an app, then shutdown to OFF with a state reset; run the compliance scan over the real repository
    - _Requirements: 4.4, 4.5, 5.2, 5.6, 5.7, 13.6, 13.10_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design; unit tests cover examples and edge cases
- Requirements 2.6 to 2.8, 6.12, and accessibility generally also need manual review with assistive technologies

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1", "6.1", "8.1", "9.1", "10.1", "11.1", "12.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "4.1", "6.2", "6.3", "8.2", "8.3", "9.2", "9.3", "9.4", "10.2", "10.3", "10.4", "11.2", "11.3", "12.2"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.6", "3.5", "4.2", "4.3", "5.2", "6.4", "8.4", "9.5", "10.5", "10.6", "11.4"] },
    { "id": 4, "tasks": ["3.6", "3.7", "5.3", "5.4", "6.5", "8.5", "8.6", "8.7", "8.8", "8.9", "13.1"] },
    { "id": 5, "tasks": ["5.5", "13.2", "14.1"] },
    { "id": 6, "tasks": ["14.2"] }
  ]
}
```
