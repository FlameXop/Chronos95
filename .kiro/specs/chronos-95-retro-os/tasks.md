# Implementation Plan: Chronos 95 Retro OS

## Overview

This plan records how Chronos 95 was built, in build order. Every implementation task is complete and cites the file that implements it. Property-test sub-tasks marked `[ ]*` are optional and not yet written. The only property test that exists is Property 1 in `backend/app/tests/test_brain_pbt.py`. The "Known gaps" in requirements.md and design.md are outside the built scope and have no tasks.

## Tasks

- [x] 1. Build the store and event bus
  - [x] 1.1 Implement the event bus in `frontend/js/core/eventBus.js`
    - Singleton with `on(name, cb)` and `emit(name, data)`, callbacks run in subscription order
    - _Requirements: 1.1_

  - [x] 1.2 Implement the store in `frontend/js/core/store.js`
    - `PowerState` enum, initial state OFF, volume 0.8, muted false, locks num true / caps false / scroll false
    - `setPowerState`, `setVolume` (clamped 0 to 1) and `setLocks` (merge) emit POWER_STATE_CHANGED, AUDIO_STATE_CHANGED and LOCKS_CHANGED
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.3 Write property test for event bus ordering in `frontend/tests/eventBus.property.test.js`
    - **Property 8: Event bus delivers in subscription order**
    - **Validates: Requirements 1.1**

  - [ ]* 1.4 Write property test for volume clamping in `frontend/tests/storeVolume.property.test.js`
    - **Property 9: Volume is clamped and effective volume honors mute**
    - **Validates: Requirements 1.4**

  - [ ]* 1.5 Write property test for lock merging in `frontend/tests/storeLocks.property.test.js`
    - **Property 10: Lock updates merge**
    - **Validates: Requirements 1.5**

  - [ ]* 1.6 Write property test for power state announcement in `frontend/tests/storePower.property.test.js`
    - **Property 11: Power state is stored and announced**
    - **Validates: Requirements 1.3**

- [x] 2. Build the sound engine
  - [x] 2.1 Implement `frontend/js/core/hardware/soundEngine.js`
    - Lazy AudioContext, `getEffectiveGain`, `playBiosBeep` (950 Hz square, 0.18 s), `playStartupChime` (five sine notes, about 2.9 s), `playKeyClick` (25 ms triangle)
    - Every sound scales with Store volume and is silent while muted
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 Write property test for gain scaling in `frontend/tests/soundGain.property.test.js`
    - **Property 12: Sound gain scales with volume and silences on mute**
    - **Validates: Requirements 2.4, 2.5**

- [x] 3. Build the hardware rig
  - [x] 3.1 Add the CRT, tower, 104-key keyboard and mousepad markup in `frontend/index.html`
    - CRT with brand "CHRONOS SYNCMASTER 15\"", tower with CD bay, floppy bay, PWR LED, power button and vents
    - Keys carry `data-code` attributes, mouse has left and right buttons
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Style the hardware in `frontend/css/hardware.css`
    - Monitor, tower, keyboard, LEDs, mouse and pressed-key states
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 Wire keyboard, lock LEDs and mouse in `frontend/js/core/main.js`
    - Key highlight by `data-code` on keydown and keyup, key click on non-repeat keydown
    - `syncLockLeds` reads modifier state, calls `setLocks` and updates NUM, CAPS and SCR LEDs from LOCKS_CHANGED
    - Mouse parallax (±42.5 px, ±22.5 px) and left and right button highlight
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 4. Build power, boot, shutdown and sign-out
  - [x] 4.1 Implement the boot flow in `frontend/js/core/main.js`
    - Power button in OFF plays the BIOS beep and sets BOOTING
    - BIOS POST text, splash at 1.5 s, startup chime and RUNNING at 3.4 s
    - POWER_STATE_CHANGED handler resets screen classes, hides stages and popups, sets the PWR LED, and applies `state-off`, `state-booting` with `crt-boot-flash`, and `state-running`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 4.2 Implement `triggerGracefulShutdown` in `frontend/js/core/main.js`
    - Triggered by the power button, Start > Shut Down and Byte shutdown commands
    - Clears timers, calls `closeAll`, sets SHUTTING_DOWN, shows the safe-to-turn-off message, sets OFF after 2.2 s
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.3 Implement sign-out and login dialog in `frontend/js/core/main.js` and `frontend/index.html`
    - Start > Sign Out closes all windows and shows the login dialog for "Admin"
    - OK plays the startup chime and shows the Desktop
    - _Requirements: 6.1, 6.2_

- [x] 5. Build the desktop, taskbar, tray and themes
  - [x] 5.1 Implement the desktop, Start menu and taskbar in `frontend/index.html`, `frontend/css/os-shell.css` and `frontend/js/core/main.js`
    - Four desktop icons, Start toggle, Start items with `data-open`
    - Popups close on desktop click, only one tray popup is open at a time, Byte closes on desktop click
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.9, 7.10_

  - [x] 5.2 Implement taskbar tabs in `renderTaskbarTabs` in `frontend/js/core/osApps.js`
    - One tab per open window, click restores a minimized window, minimizes the top window, or focuses any other
    - _Requirements: 7.5, 7.6, 7.7, 7.8_

  - [x] 5.3 Implement the system tray in `frontend/js/core/main.js`
    - Wi-Fi popup toggle between "Connected (56k Neural Link)" with 📶 and "Disconnected" with ❌
    - Volume slider 0 to 100 (default 80), mute checkbox, label as percent or "MUTED", icons 🔇 / 🔉 / 🔊 from AUDIO_STATE_CHANGED
    - Clock updated every second in hh:mm:ss AM/PM, calendar popup with today highlighted
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 5.4 Implement themes in `frontend/css/os-shell.css` and `applyTheme` in `frontend/js/core/osApps.js`
    - theme-teal (default), theme-matrix, theme-sunset, theme-space
    - Persist to `chronos_theme` and apply the stored theme at startup
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 5.5 Write property test for theme persistence in `frontend/tests/themePersistence.property.test.js`
    - **Property 13: Theme persistence round trip**
    - **Validates: Requirements 9.4, 9.5**

- [x] 6. Build the OSWindowManager
  - [x] 6.1 Implement window creation and lifecycle in `frontend/js/core/osApps.js`
    - `openApp` builds a window from `getAppConfig` (title, size, position, html, onMount) and reuses an existing window
    - `focusWindow`, `minimizeApp`, `toggleMaximize`, `closeApp` (returns boolean), `closeAll`
    - Title bar with minimize, maximize and close buttons, double-click toggles maximize
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.8, 10.9, 10.10_

  - [x] 6.2 Implement dragging and resizing in `frontend/js/core/osApps.js`
    - `makeDraggable` keeps left and top at 0 or greater and ignores drags while maximized
    - `makeResizable` provides eight handles with a 260 by 170 minimum
    - _Requirements: 10.5, 10.6, 10.7_

  - [x] 6.3 Expose the helper API in `frontend/js/core/osApps.js`
    - `getBrowserText`, `writeToNotepad(text, append)`, `getCanvasDataUrl`, `renderTaskbarTabs`
    - _Requirements: 10.11_

  - [ ]* 6.4 Write property test for single-window focus in `frontend/tests/openApp.property.test.js`
    - **Property 14: Opening an app twice keeps one window and focuses it**
    - **Validates: Requirements 10.2, 10.8**

  - [ ]* 6.5 Write property test for closing windows in `frontend/tests/closeAll.property.test.js`
    - **Property 15: closeAll empties the window set**
    - **Validates: Requirements 10.9, 10.10**

  - [ ]* 6.6 Write property test for minimum resize in `frontend/tests/resizeMin.property.test.js`
    - **Property 19: Window resize respects the minimum size**
    - **Validates: Requirements 10.7**

- [x] 7. Build Chronos Explorer
  - [x] 7.1 Implement the `explorer` app config in `frontend/js/core/osApps.js`
    - Tab bar with + and × buttons, titles cut to 12 characters, Home, input, Go, "📝 +NotePad"
    - Go and Enter load the query, `welcome.com` shows the built-in portal, other queries call `askNeuralBrain(q, 'browser')`
    - Link click searches `data-search` or the link text, address is `http://chronos.net/` plus a slug
    - "📝 +NotePad" appends the page text to NotePad, `win.runExplorerSearch` is exposed for Byte
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [ ]* 7.2 Write property test for the address slug in `frontend/tests/explorerSlug.property.test.js`
    - **Property 18: Explorer address is a slug**
    - **Validates: Requirements 11.7**

- [x] 8. Build NotePad.exe
  - [x] 8.1 Implement the `notepad` app config in `frontend/js/core/osApps.js`
    - Autosave to `chronos_notepad` on input, load on open, save-state status label
    - Clear, one-level Undo, "✨ Write / Enhance with Byte" with mode 'notepad' on the selection or last line
    - Reply replaces the selection or is appended after a blank line
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ]* 8.2 Write property test for NotePad append in `frontend/tests/notepadAppend.property.test.js`
    - **Property 16: NotePad append preserves existing text**
    - **Validates: Requirements 16.3, 10.11**

- [x] 9. Build PixelPaint.exe
  - [x] 9.1 Implement the `paint` app config and `mountPaintLogic` in `frontend/js/core/osApps.js`
    - White 405 by 255 canvas, tools brush, eraser, line, rectangle, circle, fill
    - Snapshot-based shape preview, brush size 1 to 28, color picker and hex input kept in sync, 8 swatches, Clear
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 9.2 Implement "👁️ Ask Byte" in `frontend/js/core/osApps.js`
    - Sends `canvas.toDataURL` and a prompt with the current color to `askPaintVision`
    - Shows a thumbnail and the reply in the Byte chat
    - _Requirements: 13.8, 13.9_

- [x] 10. Build Settings
  - [x] 10.1 Implement the `settings` app config in `frontend/js/core/osApps.js`
    - Four `data-theme` buttons that call `applyTheme`
    - _Requirements: 14.1, 9.2_

- [x] 11. Build the Byte widget and command workflow
  - [x] 11.1 Implement the Byte widget in `frontend/js/core/main.js`, `frontend/index.html` and `frontend/css/os-shell.css`
    - Avatar toggle, close button, chat history, input and Send, submit on Enter
    - Time-of-day boot greeting hidden after 5 s unless the input is focused or the chat is expanded
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 11.2 Implement chat memory and reply formatting
    - `saveByteMemory` stores `chronos_byte_html` and the last 20 lines of `chronos_byte_context` in `frontend/js/core/main.js`
    - `formatByteMarkdown` in `frontend/js/core/osApps.js` converts bold, code and newlines
    - `sendByteMessage` passes text to the workflow first, then calls `askNeuralBrain` with the last 10 lines and mode 'assistant'
    - _Requirements: 15.5, 15.6, 15.7, 15.8, 15.9_

  - [x] 11.3 Implement `executeSmartOSWorkflow` in `frontend/js/core/main.js`
    - Clear chat, close all, per-app open, close, minimize and maximize
    - NotePad tasks with browser text limited to 2500 characters, paint-vision questions while PixelPaint is open
    - Search and browse, theme keywords, mute and unmute, shutdown
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9_

  - [ ]* 11.4 Write property test for reply formatting in `frontend/tests/formatByteMarkdown.property.test.js`
    - **Property 17: Markdown formatting leaves no raw newlines**
    - **Validates: Requirements 15.9**

- [x] 12. Build the frontend API client
  - [x] 12.1 Implement `askNeuralBrain` and `askPaintVision` in `frontend/js/core/osApps.js`
    - API base is empty on port 8000 or a non-localhost host, otherwise `http://localhost:8000`
    - `askNeuralBrain` posts `{prompt, mode}` to /api/brain and returns `reply`, with the "[FastAPI Offline]" message on failure
    - `askPaintVision` posts `{image_base64, prompt}` to /api/paint-vision and falls back to `askNeuralBrain` with mode 'assistant'
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [x] 13. Checkpoint - Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Build the backend HTTP API
  - [x] 14.1 Implement `backend/app/main.py`
    - FastAPI app "Chronos 95 Neural Backend" version 1.95.0 with CORS open to all
    - GET /health, POST /api/brain with `BrainRequest`, POST /api/paint-vision with `PaintVisionRequest`
    - Field limits (prompt 8000, image 2,500,000, vision prompt 2000), FastAPI default 422 on invalid bodies
    - Static mount of `../frontend` at "/" with `html=True` when the directory exists
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9_

  - [ ]* 14.2 Write property test for request validation in `backend/app/tests/test_api_validation_pbt.py`
    - **Property 7: Oversized request fields are rejected**
    - **Validates: Requirements 18.4, 18.5, 18.6, 18.7, 18.8**

- [x] 15. Build BrainService text generation
  - [x] 15.1 Implement `process_prompt` and `_get_config` in `backend/app/services/brain_service.py`
    - Load `backend/.env` or the root `.env` with override, read `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` with defaults
    - Blank prompt returns the fixed greeting
    - _Requirements: 19.1, 19.2_

  - [x] 15.2 Implement `_call_groq_text` and `_clean_llm_output` in `backend/app/services/brain_service.py`
    - System prompts for browser, notepad and assistant (unknown modes use assistant)
    - Ordered model list without duplicates, 22 s timeout, max_tokens 900, temperature 0.5 for notepad and 0.65 otherwise, next model on failure
    - Removal of `<think>` blocks and code fences
    - _Requirements: 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10_

  - [x] 15.3 Implement `_smart_local_brain` in `backend/app/services/brain_service.py`
    - Notepad bullets with a limit from "N pointer/point/bullet/step/line/item" (default 5) and reference-page text source
    - "Processed your request!" for other modes
    - _Requirements: 19.11, 19.12, 19.13, 19.14, 19.15_

  - [ ]* 15.4 Write property test for blank prompts in `backend/app/tests/test_brain_blank_pbt.py`
    - **Property 2: Blank prompts get the fixed greeting**
    - **Validates: Requirements 19.2**

  - [ ]* 15.5 Write property test for the model list in `backend/app/tests/test_brain_models_pbt.py`
    - **Property 3: Model candidate list is ordered and unique**
    - **Validates: Requirements 19.7**

  - [ ]* 15.6 Write property test for output cleaning in `backend/app/tests/test_brain_clean_pbt.py`
    - **Property 4: Cleaning removes reasoning blocks**
    - **Validates: Requirements 19.10**

  - [ ]* 15.7 Write property test for the bullet count in `backend/app/tests/test_brain_bullets_pbt.py`
    - **Property 5: Local notepad fallback respects the requested bullet count**
    - **Validates: Requirements 19.12, 19.13**

  - [ ]* 15.8 Write property test for non-notepad fallback in `backend/app/tests/test_brain_fallback_pbt.py`
    - **Property 6: Local fallback in other modes is constant**
    - **Validates: Requirements 19.15**

- [x] 16. Build BrainService canvas analysis
  - [x] 16.1 Implement `analyze_canvas_image` in `backend/app/services/brain_service.py`
    - Strip the data URL prefix, try three vision models with 20 s timeout and max_tokens 350
    - Art-companion prompt with no HTML or CSS and two suggested hex colors
    - Fall back to `process_prompt` in mode 'assistant', or to the fixed tip with #FF6B35 and #FFD166 when no key or image
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

- [x] 17. Write the Hypothesis property test
  - [x] 17.1 Implement `backend/app/tests/test_brain_pbt.py`
    - Prompts of 0 to 500 characters, modes browser, notepad, assistant and unknown, asserts `process_prompt` returns a non-empty string
    - **Property 1: Brain service always returns a non-empty string**
    - **Validates: Requirements 21.1, 21.2**

- [x] 18. Build Docker deployment
  - [x] 18.1 Implement `backend/Dockerfile`
    - `python:3.11-slim`, install `requirements.txt`, copy `app`, expose 8000, run uvicorn on 0.0.0.0:8000
    - _Requirements: 22.1_

  - [x] 18.2 Implement `docker-compose.yml`, `.gitignore` and `backend/requirements.txt`
    - Service `chronos-backend` from `./backend`, port 8000:8000, env file `./backend/.env`, restart `unless-stopped`
    - `.gitignore` excludes `backend/.env` and `*.pyc`
    - Requirements list FastAPI, Pydantic, httpx, python-dotenv, pytest and hypothesis
    - _Requirements: 22.2, 22.3, 22.4_

- [x] 19. Final checkpoint - Project complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked `[x]` are implemented in the files they cite.
- Tasks marked `[ ]*` are optional property tests that do not exist yet. Frontend tests would need a JS property-testing library such as fast-check, which the project does not currently include.
- Property 1 is verified by `backend/app/tests/test_brain_pbt.py`.
- The "Known gaps" in requirements.md and design.md are not part of the built scope and have no tasks.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.3", "1.4", "1.5", "1.6", "2.2", "5.5", "6.4", "6.5", "6.6", "7.2", "8.2", "11.4", "14.2", "15.4", "15.5", "15.6", "15.7", "15.8"]
    }
  ]
}
```
