# Requirements Document

## Introduction

Chronos 95 is a browser-based retro desktop operating system simulation. The frontend is built with Vanilla HTML5, CSS3 and ES modules. It renders a CRT monitor, a PC tower, an on-screen keyboard and a mouse, and runs a desktop with windowed applications. The backend is a FastAPI service named "Chronos 95 Neural Backend" that supplies AI replies to the assistant "Byte" and to the applications. This document describes the system as built.

## Glossary

- **Chronos_OS**: The complete frontend system loaded from `index.html` through `js/core/main.js`.
- **Store**: The state module `store.js` that holds power state, audio state and keyboard lock state.
- **Event_Bus**: The singleton in `eventBus.js` with `on(name, cb)` and `emit(name, data)`.
- **Power_State**: One of OFF, BOOTING, RUNNING or SHUTTING_DOWN.
- **Sound_Engine**: The Web Audio module `soundEngine.js`.
- **Hardware_Rig**: The CRT monitor, PC tower, on-screen keyboard and mousepad with mouse.
- **Power_Controller**: The power flow logic in `main.js`.
- **Window_Manager**: The `OSWindowManager` class in `osApps.js`.
- **Desktop**: The screen shown while Power_State is RUNNING, with icons, taskbar and Start menu.
- **Taskbar**: The bar containing the Start button, one tab per open window and the system tray.
- **System_Tray**: The Wi-Fi icon, volume icon and clock in the Taskbar.
- **Explorer**: The application "Chronos Explorer", a multi-tab browser.
- **NotePad**: The application "NotePad.exe", a text editor.
- **PixelPaint**: The application "PixelPaint.exe", a drawing program.
- **Settings**: The application "Personalize/Settings" that selects the theme.
- **Byte**: The assistant widget with avatar, chat history and input.
- **Workflow_Engine**: The function `executeSmartOSWorkflow` that handles Byte commands before any AI call.
- **API_Client**: The frontend functions `askNeuralBrain` and `askPaintVision`.
- **Backend**: The FastAPI application in `backend/app/main.py`.
- **Brain_Service**: The `BrainService` singleton in `brain_service.py`.
- **LLM**: The external OpenAI-compatible chat completion service configured through `LLM_API_KEY`, `LLM_API_URL` and `LLM_MODEL`.
- **Theme**: One of theme-teal, theme-matrix, theme-sunset or theme-space.

## Requirements

### Requirement 1: Event-driven state store

**User Story:** As a developer, I want a central store and event bus, so that modules react to state changes without calling each other.

#### Acceptance Criteria

1. THE Event_Bus SHALL invoke the callbacks subscribed to an event name in subscription order WHEN `emit` is called with that name.
2. THE Store SHALL initialize with Power_State OFF, volume 0.8, muted false, and locks num true, caps false, scroll false.
3. WHEN `setPowerState` is called, THE Store SHALL set the power state to the given value and emit POWER_STATE_CHANGED with the new state.
4. WHEN `setVolume` is called, THE Store SHALL clamp the value to the range 0 to 1 and emit AUDIO_STATE_CHANGED with volume, muted and effectiveVolume.
5. WHEN `setLocks` is called, THE Store SHALL merge the given locks into the current locks and emit LOCKS_CHANGED.

### Requirement 2: Sound engine

**User Story:** As a user, I want period-style sounds, so that the machine feels like real hardware.

#### Acceptance Criteria

1. WHEN `playBiosBeep` is called, THE Sound_Engine SHALL play a 950 Hz square wave for 0.18 seconds.
2. WHEN `playStartupChime` is called, THE Sound_Engine SHALL play five sine notes over about 2.9 seconds.
3. WHEN `playKeyClick` is called, THE Sound_Engine SHALL play a 25 millisecond triangle wave.
4. THE Sound_Engine SHALL scale every sound by the Store volume.
5. WHILE the Store is muted, THE Sound_Engine SHALL produce no sound.

### Requirement 3: Hardware rig

**User Story:** As a user, I want a visible computer setup, so that the experience resembles using a 1990s PC.

#### Acceptance Criteria

1. THE Hardware_Rig SHALL display a CRT monitor with a bezel, a screen and the brand "CHRONOS SYNCMASTER 15\"".
2. THE Hardware_Rig SHALL display a PC tower with a CD bay, a floppy bay, a PWR LED, a power button marked ⏻ and vents.
3. THE Hardware_Rig SHALL display a 104-key on-screen keyboard with a function row, a navigation cluster, arrow keys and a numpad.
4. THE Hardware_Rig SHALL display a mousepad with a retro mouse.
5. WHEN a physical key is pressed, THE Hardware_Rig SHALL highlight the on-screen key whose data-code matches the pressed key.
6. WHEN a physical key is released, THE Hardware_Rig SHALL remove the highlight from the matching on-screen key.
7. WHEN a physical key is pressed without auto-repeat, THE Hardware_Rig SHALL play a key click through the Sound_Engine.
8. WHEN a physical key event occurs, THE Hardware_Rig SHALL read the modifier state, update the Store locks through `setLocks`, and update the NUM, CAPS and SCR keyboard LEDs from LOCKS_CHANGED.
9. WHEN the pointer moves, THE Hardware_Rig SHALL translate the on-screen mouse by up to 42.5 px horizontally and up to 22.5 px vertically in proportion to the pointer position.
10. WHEN a mouse button is pressed, THE Hardware_Rig SHALL show the clicked state on the matching left or right button of the on-screen mouse.

### Requirement 4: Boot sequence

**User Story:** As a user, I want to power the computer on, so that I can see a boot sequence before the desktop.

#### Acceptance Criteria

1. WHEN the power button is pressed WHILE Power_State is OFF, THE Power_Controller SHALL play the BIOS beep and set Power_State to BOOTING.
2. WHILE Power_State is BOOTING, THE Power_Controller SHALL display BIOS POST text that names Chronos BIOS, a Pentium-S 133 MHz processor with a neural co-processor, and a 65536K memory test.
3. WHEN 1.5 seconds have elapsed since BOOTING began, THE Power_Controller SHALL display the splash screen.
4. WHEN 3.4 seconds have elapsed since BOOTING began, THE Power_Controller SHALL play the startup chime and set Power_State to RUNNING.
5. WHEN POWER_STATE_CHANGED is emitted, THE Power_Controller SHALL reset the screen classes, hide all stages and popups, and turn the PWR LED off for OFF and on for every other state.
6. WHEN Power_State becomes OFF, THE Chronos_OS SHALL apply the class state-off to the CRT.
7. WHEN Power_State becomes BOOTING, THE Chronos_OS SHALL apply the classes state-booting and crt-boot-flash to the CRT.
8. WHEN Power_State becomes RUNNING, THE Chronos_OS SHALL apply the class state-running to the CRT, show the Desktop and show the Byte boot greeting.

### Requirement 5: Shutdown

**User Story:** As a user, I want to shut the computer down in an orderly way, so that the simulation ends in a clean off state.

#### Acceptance Criteria

1. WHEN the power button is pressed WHILE Power_State is not OFF, THE Power_Controller SHALL start a graceful shutdown.
2. WHEN the user chooses Start > Shut Down, THE Power_Controller SHALL start a graceful shutdown.
3. WHEN the Byte command "shutdown", "shut down" or "turn off" is received, THE Power_Controller SHALL start a graceful shutdown.
4. WHEN a graceful shutdown starts, THE Power_Controller SHALL clear its timers, call `closeAll` on the Window_Manager, and set Power_State to SHUTTING_DOWN.
5. WHILE Power_State is SHUTTING_DOWN, THE Chronos_OS SHALL display "It's now safe to turn off your computer".
6. WHEN 2.2 seconds have elapsed since SHUTTING_DOWN began, THE Power_Controller SHALL set Power_State to OFF.

### Requirement 6: Sign out

**User Story:** As a user, I want to sign out, so that I can return to a login dialog without powering off.

#### Acceptance Criteria

1. WHEN the user chooses Start > Sign Out, THE Chronos_OS SHALL close all windows and show the login dialog with the user name "Admin".
2. WHEN the user confirms the login dialog with OK, THE Chronos_OS SHALL play the startup chime and show the Desktop.

### Requirement 7: Desktop, Start menu and Taskbar

**User Story:** As a user, I want a desktop with icons, a Start menu and a taskbar, so that I can launch and switch between applications.

#### Acceptance Criteria

1. THE Desktop SHALL display four icons that open applications.
2. WHEN the user clicks a Desktop icon once, THE Window_Manager SHALL open the associated application.
3. WHEN the user clicks the Start button, THE Desktop SHALL toggle the Start menu.
4. WHEN the user clicks a Start menu item that has a data-open attribute, THE Window_Manager SHALL open the application named by that attribute.
5. THE Taskbar SHALL display one tab for each open window.
6. WHEN the user clicks the tab of a minimized window, THE Window_Manager SHALL restore that window.
7. WHEN the user clicks the tab of the top window, THE Window_Manager SHALL minimize that window.
8. WHEN the user clicks the tab of a window that is neither minimized nor on top, THE Window_Manager SHALL focus that window.
9. WHEN the user opens a System_Tray popup, THE Desktop SHALL hide the other popups.
10. WHEN the user clicks the empty Desktop, THE Desktop SHALL hide the popups and close Byte.

### Requirement 8: System tray

**User Story:** As a user, I want tray controls for network, volume and time, so that I can adjust the simulated system settings.

#### Acceptance Criteria

1. WHEN the user toggles the Wi-Fi popup switch, THE System_Tray SHALL alternate the status between "Connected (56k Neural Link)" and "Disconnected" and alternate the icon between 📶 and ❌.
2. THE System_Tray SHALL provide a volume slider from 0 to 100 with a default of 80 and a mute checkbox.
3. WHEN the volume slider or mute checkbox changes, THE System_Tray SHALL update the Store volume and mute state.
4. THE System_Tray SHALL show the volume label as the percentage, or as "MUTED" WHILE muted.
5. THE System_Tray SHALL show the volume icon 🔇 WHILE muted or at zero volume, 🔉 WHILE volume is under 50, and 🔊 otherwise.
6. THE System_Tray SHALL update the clock every second in the format hh:mm:ss AM/PM.
7. WHEN the user clicks the clock, THE System_Tray SHALL open a calendar popup with the month grid, today highlighted and the full date.

### Requirement 9: Themes

**User Story:** As a user, I want to change the desktop theme, so that I can personalize the system.

#### Acceptance Criteria

1. THE Chronos_OS SHALL provide the Themes theme-teal, theme-matrix, theme-sunset and theme-space, with theme-teal as the default.
2. WHEN the user selects a theme button in Settings, THE Chronos_OS SHALL apply that Theme.
3. WHEN a Byte command selects a Theme, THE Chronos_OS SHALL apply that Theme.
4. WHEN a Theme is applied, THE Chronos_OS SHALL store the Theme name in localStorage under the key chronos_theme.
5. WHEN the Chronos_OS starts, THE Chronos_OS SHALL apply the Theme stored under chronos_theme.

### Requirement 10: Window manager

**User Story:** As a user, I want draggable, resizable windows, so that I can arrange applications as in a desktop OS.

#### Acceptance Criteria

1. WHEN `openApp` is called with an app identifier that has no open window, THE Window_Manager SHALL create a window from the app configuration containing title, width, height, left, top, html and onMount.
2. WHEN `openApp` is called with an app identifier that already has an open window, THE Window_Manager SHALL focus that existing window and create no second window.
3. THE Window_Manager SHALL give each window a title bar with minimize, maximize and close buttons.
4. WHEN the user double-clicks a title bar, THE Window_Manager SHALL toggle the maximized state of that window.
5. WHEN the user drags a title bar, THE Window_Manager SHALL move the window and keep its left and top positions at 0 or greater.
6. WHILE a window is maximized, THE Window_Manager SHALL ignore title bar dragging.
7. THE Window_Manager SHALL provide resize handles in eight directions and enforce a minimum window size of 260 by 170 pixels.
8. WHEN a window is focused, THE Window_Manager SHALL give that window a z-index higher than all other windows.
9. WHEN `closeApp` is called, THE Window_Manager SHALL close the window and return a boolean result.
10. WHEN `closeAll` is called, THE Window_Manager SHALL close every open window.
11. THE Window_Manager SHALL expose `minimizeApp`, `toggleMaximize`, `getBrowserText`, `writeToNotepad(text, append)`, `getCanvasDataUrl` and `renderTaskbarTabs`.

### Requirement 11: Chronos Explorer

**User Story:** As a user, I want a tabbed browser, so that I can search and read AI-generated pages.

#### Acceptance Criteria

1. THE Explorer SHALL provide a tab bar with a new tab button (+), a close button (×) on each tab, and tab titles truncated to 12 characters.
2. THE Explorer SHALL provide a Home button, a URL and search input, a Go button and a "📝 +NotePad" button.
3. WHEN the user presses the Go button or the Enter key in the input, THE Explorer SHALL load the entered query in the active tab.
4. WHEN the query is welcome.com, THE Explorer SHALL show the built-in portal page with suggested links.
5. WHEN the query is any other value, THE Explorer SHALL call `askNeuralBrain` with the query and mode 'browser' and render the returned HTML in the active tab.
6. WHEN the user clicks a link in a rendered page, THE Explorer SHALL search the link's data-search value, or the link's text WHEN no data-search value exists.
7. WHEN a page is loaded, THE Explorer SHALL display the address in the form http://chronos.net/ followed by a slug of the query.
8. WHEN the user presses the "📝 +NotePad" button, THE Window_Manager SHALL append the text of the current page to NotePad.

### Requirement 12: NotePad.exe

**User Story:** As a user, I want a text editor with AI assistance, so that I can write and enhance notes.

#### Acceptance Criteria

1. WHEN the user edits the NotePad text area, THE NotePad SHALL save the text to localStorage under the key chronos_notepad on every input event.
2. WHEN NotePad opens, THE NotePad SHALL load the text stored under chronos_notepad.
3. THE NotePad SHALL display a status label that shows the save state.
4. WHEN the user presses Clear, THE NotePad SHALL empty the text area.
5. WHEN the user presses Undo, THE NotePad SHALL restore the text that existed before the last Clear or AI action.
6. WHEN the user presses "✨ Write / Enhance with Byte", THE NotePad SHALL call `askNeuralBrain` with mode 'notepad' and the selected text, or the last line WHEN nothing is selected.
7. WHEN the AI reply arrives, THE NotePad SHALL replace the selection with the reply, or append the reply after a blank line WHEN nothing was selected.

### Requirement 13: PixelPaint.exe

**User Story:** As a user, I want a simple paint program, so that I can draw and ask Byte about my drawing.

#### Acceptance Criteria

1. THE PixelPaint SHALL provide a white canvas of 405 by 255 pixels.
2. THE PixelPaint SHALL provide the tools brush, eraser, line, rectangle, circle and fill.
3. WHILE the user drags with the line, rectangle or circle tool, THE PixelPaint SHALL show a preview using a snapshot of the canvas.
4. WHEN the user applies the fill tool, THE PixelPaint SHALL paint the whole canvas with the current color.
5. THE PixelPaint SHALL provide a brush size from 1 to 28.
6. THE PixelPaint SHALL provide a color picker and a hex input that accepts #RRGGBB, and keep the two values in sync.
7. THE PixelPaint SHALL provide 8 color swatches and a Clear button.
8. WHEN the user presses "👁️ Ask Byte", THE PixelPaint SHALL call `askPaintVision` with `canvas.toDataURL` output and a prompt that includes the current color.
9. WHEN the vision reply arrives, THE PixelPaint SHALL show a thumbnail of the canvas and the reply in the Byte chat.

### Requirement 14: Settings

**User Story:** As a user, I want a settings window, so that I can change the theme.

#### Acceptance Criteria

1. THE Settings SHALL provide four theme buttons, one for each Theme.

### Requirement 15: Byte assistant widget

**User Story:** As a user, I want a chat assistant, so that I can control the OS and ask questions in natural language.

#### Acceptance Criteria

1. THE Byte SHALL provide an avatar toggle, a close button ✕, a chat history and an input with a Send button.
2. WHEN the user presses Send or the Enter key, THE Byte SHALL submit the input text.
3. WHEN Power_State becomes RUNNING, THE Byte SHALL show a greeting that depends on the time of day (morning, afternoon or evening).
4. WHEN 5 seconds have elapsed after the boot greeting, THE Byte SHALL hide the greeting unless the user has focused the input or expanded the chat.
5. WHEN a chat line is added, THE Byte SHALL store the chat HTML under chronos_byte_html and the last 20 context lines under chronos_byte_context in localStorage.
6. WHEN the user submits "clear chat" or "clear history", THE Byte SHALL remove the stored chat HTML and context.
7. WHEN the user submits text, THE Byte SHALL pass the text to the Workflow_Engine before any AI call.
8. WHEN the Workflow_Engine does not handle the text, THE Byte SHALL call `askNeuralBrain` with the last 10 context lines and mode 'assistant'.
9. WHEN a Byte reply is shown, THE Byte SHALL convert **bold** to bold text, `code` to code text, and newlines to line breaks.

### Requirement 16: Byte command workflow

**User Story:** As a user, I want Byte to execute OS commands, so that I can operate the desktop by typing.

#### Acceptance Criteria

1. WHEN the text is "close all" or "reset desktop", THE Workflow_Engine SHALL close all windows.
2. WHEN the text names an application with an open, close, minimize or maximize keyword, THE Workflow_Engine SHALL perform that action on the named application through the Window_Manager.
3. WHEN the text contains a NotePad keyword together with a write verb or a format word, THE Workflow_Engine SHALL remove "to notepad" phrasing from the request, call `askNeuralBrain` with mode 'notepad', and append the reply to NotePad.
4. WHEN the NotePad request mentions browser, page, website or this, THE Workflow_Engine SHALL include the browser page text, limited to 2500 characters, in the request.
5. WHILE PixelPaint is open, WHEN the text contains draw, canvas, color or sketch wording in a question, THE Workflow_Engine SHALL send the request to `askPaintVision`.
6. WHEN the text starts with "search" or "browse" followed by a query, THE Workflow_Engine SHALL open Explorer and search that query.
7. WHEN the text contains the keyword matrix, sunset, space or teal as a theme request, THE Workflow_Engine SHALL apply the matching Theme.
8. WHEN the text requests mute or unmute, THE Workflow_Engine SHALL set the muted state in the Store accordingly.
9. WHEN the text is "shutdown", "shut down" or "turn off", THE Workflow_Engine SHALL start a graceful shutdown.

### Requirement 17: Frontend API client

**User Story:** As a developer, I want a single API client, so that the frontend reaches the backend from any hosting setup.

#### Acceptance Criteria

1. WHEN the page is served from port 8000 or from a host other than localhost, THE API_Client SHALL use an empty API base.
2. WHEN the page is served from any other origin, THE API_Client SHALL use http://localhost:8000 as the API base.
3. WHEN `askNeuralBrain` is called, THE API_Client SHALL POST `{prompt, mode}` to /api/brain and return the `reply` field of the response.
4. IF the `askNeuralBrain` request fails, THEN THE API_Client SHALL return "[FastAPI Offline] Make sure uvicorn is running on port 8000!".
5. WHEN `askPaintVision` is called, THE API_Client SHALL POST `{image_base64, prompt}` to /api/paint-vision and return the reply.
6. IF the `askPaintVision` request fails, THEN THE API_Client SHALL call `askNeuralBrain` with the same prompt and mode 'assistant'.

### Requirement 18: Backend HTTP API

**User Story:** As a developer, I want a validated HTTP API, so that the frontend can obtain AI replies reliably.

#### Acceptance Criteria

1. THE Backend SHALL be a FastAPI application titled "Chronos 95 Neural Backend" with version 1.95.0.
2. THE Backend SHALL allow all origins, methods and headers through CORS.
3. WHEN GET /health is requested, THE Backend SHALL return `{"status":"online","os":"Chronos 95","engine":"FastAPI Neural Bridge"}`.
4. WHEN POST /api/brain receives a valid BrainRequest, THE Backend SHALL return `{reply, mode}`.
5. THE Backend SHALL accept a BrainRequest with a `prompt` string of at most 8000 characters and a `mode` string that defaults to "assistant".
6. WHEN POST /api/paint-vision receives a valid PaintVisionRequest, THE Backend SHALL return `{reply}`.
7. THE Backend SHALL accept a PaintVisionRequest with an `image_base64` string of at most 2,500,000 characters and a `prompt` string of at most 2000 characters that defaults to "Analyze this drawing".
8. IF a request body fails schema validation, THEN THE Backend SHALL respond with the FastAPI default status 422.
9. WHERE the directory ../frontend exists, THE Backend SHALL serve it with static files at "/" with `html=True`.

### Requirement 19: Brain service text generation

**User Story:** As a user, I want AI replies tuned to each application, with a local fallback, so that the system answers even when the LLM is unavailable.

#### Acceptance Criteria

1. WHEN `process_prompt` is called, THE Brain_Service SHALL load `backend/.env` or the root .env with override and read LLM_API_KEY with quotes stripped, LLM_API_URL (default https://api.groq.com/openai/v1/chat/completions) and LLM_MODEL (default llama-3.3-70b-versatile).
2. IF the prompt is empty or contains only whitespace, THEN THE Brain_Service SHALL return "Hey! Tell me what you'd like to open, write, draw, or search."
3. WHERE LLM_API_KEY is set, THE Brain_Service SHALL send an OpenAI-compatible chat completion request with a system prompt chosen by mode.
4. THE Brain_Service SHALL use a system prompt for mode 'browser' that requests Chronos Explorer HTML with the classes web-article, web-hero, web-grid and web-card and links carrying data-search.
5. THE Brain_Service SHALL use a system prompt for mode 'notepad' that requests direct text only.
6. THE Brain_Service SHALL use the system prompt for Byte inside Chronos 95 for mode 'assistant' and for every unknown mode.
7. THE Brain_Service SHALL try the models llama-3.3-70b-versatile, llama-3.1-8b-instant, the LLM_MODEL value, openai/gpt-oss-120b and openai/gpt-oss-20b in that order without duplicates.
8. THE Brain_Service SHALL use an httpx timeout of 22 seconds, max_tokens 900, and temperature 0.5 for mode 'notepad' and 0.65 for other modes.
9. IF a model request fails, THEN THE Brain_Service SHALL try the next model.
10. WHEN LLM output is received, THE Brain_Service SHALL remove `<think>` blocks, remove ```html fences for mode 'browser', and remove leading fences for mode 'notepad'.
11. IF no key is set or every model yields an empty or missing result, THEN THE Brain_Service SHALL use the local fallback.
12. WHEN the local fallback runs in mode 'notepad', THE Brain_Service SHALL turn each sentence longer than 15 characters into a "•" bullet.
13. THE Brain_Service SHALL take the bullet limit from a phrase "N pointer", "N point", "N bullet", "N step", "N line" or "N item" in the prompt, and use 5 WHEN no such phrase exists.
14. WHEN the prompt contains "REFERENCE WEBPAGE CONTENT:", THE Brain_Service SHALL use the text after that marker as the bullet source in the local fallback.
15. WHEN the local fallback runs in any mode other than 'notepad', THE Brain_Service SHALL return "Processed your request!".

### Requirement 20: Brain service canvas analysis

**User Story:** As a user, I want Byte to comment on my drawing, so that I get feedback and color suggestions.

#### Acceptance Criteria

1. WHEN `analyze_canvas_image` is called, THE Brain_Service SHALL strip the data URL prefix from the image data.
2. WHERE LLM_API_KEY is set and image data is present, THE Brain_Service SHALL try the vision models meta-llama/llama-4-scout-17b-16e-instruct, llama-4-maverick-17b-128e-instruct and llama-3.2-11b-vision-preview in order.
3. THE Brain_Service SHALL send the vision request with a Byte art-companion prompt that forbids HTML and CSS, asks to identify the drawing, asks to answer the user, and asks to suggest 2 hex colors.
4. THE Brain_Service SHALL use a timeout of 20 seconds and max_tokens 350 for vision requests.
5. IF every vision model fails, THEN THE Brain_Service SHALL send a text prompt through `process_prompt` with mode 'assistant'.
6. IF no key is set or no image data is present, THEN THE Brain_Service SHALL return a fixed tip that suggests #FF6B35 and #FFD166.

### Requirement 21: Property-based test

**User Story:** As a developer, I want a property-based test of the brain service, so that every input yields a usable reply.

#### Acceptance Criteria

1. THE test_brain_pbt test SHALL generate prompts of 0 to 500 characters and modes from browser, notepad, assistant and unknown using Hypothesis.
2. FOR ALL generated prompts and modes, THE Brain_Service `process_prompt` SHALL return a non-empty string.

### Requirement 22: Deployment

**User Story:** As a developer, I want a container setup, so that I can run the backend with one command.

#### Acceptance Criteria

1. THE Dockerfile SHALL use the base image python:3.11-slim, install requirements.txt, copy the app directory, expose port 8000 and run `uvicorn app.main:app` on host 0.0.0.0 and port 8000.
2. THE docker-compose.yml SHALL define the service chronos-backend built from ./backend, publish port 8000:8000, read environment from ./backend/.env and use the restart policy unless-stopped.
3. THE .gitignore SHALL exclude backend/.env and *.pyc files.
4. THE backend requirements SHALL include FastAPI 0.115, Pydantic 2.9, httpx, python-dotenv, pytest and hypothesis.

## Known gaps

These notes are not requirements. They list differences between the code as built and `.kiro/steering/architecture.md` or good practice.

- The assistant is named Byte, but the steering file names it Chippy.
- Window and app logic sits in `osApps.js` and `main.js` and touches the DOM directly. It is not split into separate `notepadApp.js` and `paintApp.js` plugin modules.
- The Explorer welcome portal has a link label that contains a prohibited trademark string ("Linux vs ... 95 Architecture").
- CORS allows all origins.
- There is no `.env.example`.
- The container runs as root, has no health check and does not include the frontend.
- The property-based test can make network calls when a key is set in `.env`.
- The Store does not validate power state transitions.
- Byte replies are inserted with `innerHTML`.
- The Event_Bus has no unsubscribe and no error handling around callbacks.
