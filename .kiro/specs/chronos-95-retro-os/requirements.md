# Requirements Document

## Introduction

Chronos 95 is a retro 1995-style CRT desktop hardware rig and operating system, built for the Resurrection track. The Frontend uses Vanilla HTML5, CSS3, and modular ES6 JavaScript. The Backend is a Python FastAPI service, containerized with Docker, that stores Documents and provides AI features. The system follows a State-Driven Event Bus architecture: every hardware and OS transition (OFF, BOOTING, RUNNING, SHUTTING_DOWN) flows through the Store and the Event_Bus, and desktop applications are decoupled plugin modules managed by the Window_Manager.

The Backend AI features use a dual-engine Brain_Service. When an LLM_Provider is configured through environment variables, the External_Engine answers first. When no LLM_Provider is configured, or the provider call fails, the built-in Local_Engine answers within the same request, so every AI endpoint works without API keys. `POST /api/brain` serves Chronos_Explorer (`browser` mode), NotePad.exe (`notepad` mode), Chippy (`assistant` mode), and PixelPaint.exe (`paint` mode). `POST /api/paint-vision` turns a canvas image into HTML and CSS wireframe code. In this revision, `POST /api/brain` replaces the former chat endpoint, the health check moves to `GET /health`, and the Document endpoints are kept for NotePad.exe and PixelPaint.exe Save and Open.

This document covers requirements only. It defines the scope of the first release: the CRT hardware rig, the power and boot lifecycle, the desktop shell, the plugin window system, two bundled applications (NotePad.exe and PixelPaint.exe), the Chippy AI assistant, the backend API including the AI endpoints, containerization and configuration, and the project structure and compliance constraints. Chronos_Explorer consumes `browser` mode replies; its user interface requirements are out of scope.

Assumptions recorded in this revision:

- The feature request did not specify the `paint` mode of `POST /api/brain`. Requirement 19 assumes that `paint` mode returns text-only pixel-art tips and a palette suggestion drawn from the PixelPaint_Palette, and that image analysis stays with Paint_Vision (Requirement 20).
- Paint_Vision accepts PNG images only, matching the `image` Document kind.
- The `notepad` mode checks text as Python only when the text is Python_Like_Text, so that short prose that happens to parse as Python, such as a single word, receives a summary instead of a "valid Python" report.
- The PixelPaint_Palette pins the 16 colors referenced by Requirement 9.2 to the classic 16-color palette, so that `paint` mode suggestions match the colors offered by the PixelPaint_App.

## Glossary

- **Chronos_95**: The complete retro operating system and hardware rig, comprising the Frontend and the Backend.
- **Frontend**: The browser application located in `/frontend`, written in Vanilla HTML5, CSS3, and ES6 modules loaded with `type="module"`.
- **Backend**: The Python 3.11+ FastAPI service located in `/backend`.
- **Hardware_Rig**: The on-screen visual representation of the CRT monitor, computer case, power button, and power indicator LED.
- **CRT_Display**: The screen area of the Hardware_Rig on which the OS_Shell and boot output are rendered.
- **Power_State**: One of four values, `OFF`, `BOOTING`, `RUNNING`, or `SHUTTING_DOWN`, describing the current hardware and OS lifecycle phase.
- **Store**: The module `frontend/js/core/store.js`, the single source of truth for application state, including the Power_State.
- **Event_Bus**: The module `frontend/js/core/eventBus.js`, the publish/subscribe channel through which Frontend components communicate.
- **Boot_Sequencer**: The Frontend component that drives the BOOTING phase and renders boot output on the CRT_Display.
- **Shutdown_Sequencer**: The Frontend component that drives the SHUTTING_DOWN phase.
- **OS_Shell**: The Frontend desktop environment shown while the Power_State is `RUNNING`, consisting of the Desktop, the Taskbar, the Start_Menu, and desktop icons.
- **Desktop**: The OS_Shell background surface holding desktop icons.
- **Taskbar**: The OS_Shell bar at the bottom of the CRT_Display showing the Start_Button, one button per open window, and the Clock.
- **Start_Menu**: The menu opened from the Start_Button, listing installed applications and the shutdown command.
- **Clock**: The Taskbar element that displays the current local time.
- **Window_Manager**: The module `frontend/js/core/windowManager.js` that creates, focuses, moves, resizes, minimizes, maximizes, and closes application windows.
- **App_Module**: A decoupled ES6 module that implements the App_Contract and registers itself with the Window_Manager.
- **App_Contract**: The interface every App_Module implements, comprising an application identifier, a display title, an icon, default window dimensions, and mount and unmount functions.
- **NotePad_App**: The App_Module `notepadApp.js`, displayed to the user as "NotePad.exe", a plain-text editor.
- **PixelPaint_App**: The App_Module `paintApp.js`, displayed to the user as "PixelPaint.exe", a bitmap drawing application.
- **PixelPaint_Palette**: The 16 colors of the PixelPaint_App color palette in Requirement 9.2: `#000000`, `#800000`, `#008000`, `#808000`, `#000080`, `#800080`, `#008080`, `#c0c0c0`, `#808080`, `#ff0000`, `#00ff00`, `#ffff00`, `#0000ff`, `#ff00ff`, `#00ffff`, and `#ffffff`.
- **Chronos_Explorer**: The Frontend web browser application that sends `browser` mode Brain_Requests and displays the returned HTML. Its user interface requirements are out of scope for this document.
- **Chippy**: The animated AI assistant character of Chronos_95.
- **API_Client**: The Frontend module that sends HTTP requests to the Backend.
- **Document_Store**: The Backend component that persists user documents (NotePad_App text files and PixelPaint_App images).
- **Document**: A named item stored in the Document_Store, having an identifier, a name, a kind of `text` or `image`, content, and timestamps.
- **Schema_Validator**: The Pydantic models in the Backend that validate every request and response payload.
- **Error_Body**: A JSON object containing a `detail` field. For HTTP status 422, `detail` is a list of entries that each name one invalid field and the reason. For other statuses, `detail` is a human-readable message.
- **Body_Size_Limit**: 2,097,152 bytes, the largest request body the Backend accepts on any endpoint.
- **Allowed_Origins**: The list of exact Frontend origins (scheme, host, and port) that the Backend reads from the `ALLOWED_ORIGINS` environment variable as comma-separated items, with surrounding whitespace and a trailing slash removed from each item and empty items ignored.
- **Default_Data_Directory**: The directory `data/documents` relative to the Backend working directory.
- **Compose_File**: The file `docker-compose.yml` at the repository root.
- **Brain_Service**: The Backend component in `backend/app/services/brain_service.py` that answers `POST /api/brain` and `POST /api/paint-vision` requests with the External_Engine or the Local_Engine.
- **Brain_Mode**: One of the four values `browser`, `notepad`, `assistant`, or `paint`.
- **Brain_Request**: The JSON object body of `POST /api/brain`, containing exactly two fields: `prompt`, a string, and `mode`, a Brain_Mode.
- **Brain_Response**: The JSON object that `POST /api/brain` returns with HTTP status 200, containing exactly three fields: `reply`, a string of at most 100,000 characters with at least one non-whitespace character; `mode`, the Brain_Mode of the request; and `engine`, the value `external` or `local`, naming the engine that produced the reply.
- **Max_Prompt_Length**: 20,000 characters.
- **Processed_Prompt**: The `prompt` of a Brain_Request or Paint_Vision_Request after each unpaired surrogate code point is replaced with U+FFFD and the result is truncated to its first Max_Prompt_Length characters.
- **Prompt_Topic**: The Processed_Prompt with each control character replaced by a space, leading and trailing whitespace removed, and the result truncated to its first 80 characters, or the text "Chronos 95 Web" when that result is empty.
- **LLM_Provider**: An external large language model service supported by the External_Engine, named by one of the values `openai_compatible` (any OpenAI-compatible endpoint), `openai`, `groq`, `gemini`, or `bedrock` (AWS Bedrock).
- **Provider_Configuration**: The environment variables that must all hold non-empty values for an LLM_Provider to be configured: `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` for `openai_compatible`; `OPENAI_API_KEY` for `openai`; `GROQ_API_KEY` for `groq`; `GEMINI_API_KEY` for `gemini`; and `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `BEDROCK_MODEL_ID` for `bedrock`.
- **Credential_Variables**: The environment variables `LLM_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN`.
- **Active_Provider**: The one LLM_Provider that the Backend selects at startup under Requirement 16, if any.
- **External_Engine**: The part of the Brain_Service that sends the Processed_Prompt, and for Paint_Vision the decoded image, to the Active_Provider and returns the provider's result.
- **Local_Engine**: The built-in part of the Brain_Service, written in Python, that produces replies from deterministic rules without network access.
- **Usable_Reply**: An External_Engine result that the Active_Provider returned with a success status in the provider's documented response format, and whose reply text, after the processing in Requirement 21, contains at least one non-whitespace character outside HTML tags. For Paint_Vision, a Usable_Reply also contains non-empty `html` and `css` strings.
- **Retro_Article**: An HTML fragment whose root is one `article` element containing an `h1` heading, at least two `p` paragraphs, and at least one `table` with a header row of `th` cells and at least two rows of `td` cells, built only from the HTML_Allowlist.
- **Python_Like_Text**: Text with at least one line that, after leading whitespace is removed, begins with `def `, `async def `, `import `, or `print(`; begins with `from ` and contains ` import `; or begins with `class `, `if `, `elif `, `else`, `for `, `while `, `try`, `except`, `finally`, or `with ` and ends with a colon after trailing whitespace is removed.
- **Python_Formatter**: The Local_Engine function that rewrites Python source text into a consistently formatted equivalent.
- **Bullet_Summary**: A plain-text list of 1 to 5 lines, each starting with "- ", in which every word after the marker, excluding a trailing "...", appears as a substring of the source text, and the lines follow the order in which their source sentences appear in the source text.
- **Assistant_Rule_Set**: The fixed, ordered set of topics that the Local_Engine uses for `assistant` replies, each topic having trigger keywords matched case-insensitively as whole words and a fixed answer.
- **Paint_Vision**: The Backend feature behind `POST /api/paint-vision` that analyzes a canvas image, after compositing the image onto a white background, and generates matching HTML and CSS wireframe code.
- **Paint_Vision_Request**: The JSON object body of `POST /api/paint-vision`, containing exactly two fields: `image_base64`, a string, and `prompt`, a string.
- **Base64_Text**: Text consisting only of characters from the standard base64 alphabet of RFC 4648 section 4, with correct padding.
- **Valid_Canvas_Image**: An `image_base64` value that is Base64_Text, or the prefix `data:image/png;base64,` (matched case-insensitively) followed by Base64_Text, whose decoded bytes form a complete PNG image of at most 1,048,576 bytes with a width and a height of 1 to 2048 pixels each.
- **Paint_Vision_Response**: The JSON object that `POST /api/paint-vision` returns with HTTP status 200, containing `width` and `height`, the image size in pixels; `palette`, the Dominant_Palette; `html` and `css`, the generated wireframe code as strings; `reply`, a string with at least one non-whitespace character; and `engine`, the value `external` or `local`.
- **Dominant_Palette**: A list of 1 to 16 entries, each containing `hex`, a color written as `#` followed by six lowercase hexadecimal digits, and `proportion`, the fraction of image pixels having that color, greater than 0 and at most 1. Entries are sorted by descending proportion and then by ascending `hex`.
- **Background_Color**: The first entry of the Dominant_Palette.
- **Wireframe_Block**: The bounding box of a 4-connected region of pixels that share one color other than the Background_Color, where the bounding box covers at least 16 pixels.
- **Trademark_List**: The set of prohibited names: "Windows 95", "MS Paint", "Clippy", and any other Microsoft trademark.
- **Trademark_Replacements**: The fixed mapping from prohibited names to compliant names used by the Trademark_Filter: "Windows 95" to "Chronos 95", "MS Paint" and "Microsoft Paint" to "PixelPaint.exe", and "Clippy" to "Chippy".
- **Trademark_Filter**: The Backend component that replaces every occurrence of a Trademark_Replacements name with its compliant name, matching case-insensitively and treating any run of spaces or hyphens between the words of a name, or no separator, as a match.
- **HTML_Sanitizer**: The Backend component that reduces HTML to the HTML_Allowlist.
- **HTML_Allowlist**: The elements `article`, `section`, `header`, `footer`, `h1`, `h2`, `h3`, `h4`, `p`, `br`, `hr`, `ul`, `ol`, `li`, `table`, `caption`, `thead`, `tbody`, `tr`, `th`, `td`, `a`, `b`, `strong`, `i`, `em`, `u`, `small`, `code`, `pre`, `blockquote`, `font`, and `center`; the attributes `class`, `title`, `align`, `colspan`, `rowspan`, `border`, `cellpadding`, `cellspacing`, `width`, `bgcolor`, `color`, `face`, and `size` on these elements; and the `href` attribute on `a` elements.
- **Reduced_Motion_Preference**: The user's operating system setting that requests minimal animation.

## Requirements

### Requirement 1: State Store and Event Bus Foundation

**User Story:** As a developer, I want all hardware and OS transitions to flow through a central Store and Event_Bus, so that UI components stay decoupled and the system behaves predictably.

#### Acceptance Criteria

1. THE Store SHALL hold exactly one Power_State value at any time, and that value SHALL be one of `OFF`, `BOOTING`, `RUNNING`, or `SHUTTING_DOWN`.
2. WHEN the Frontend loads, THE Store SHALL initialize the Power_State to `OFF` before any Event_Bus subscriber receives an event.
3. WHEN a component requests a Power_State transition, THE Store SHALL accept the request only for the transitions `OFF` to `BOOTING`, `BOOTING` to `RUNNING`, `RUNNING` to `SHUTTING_DOWN`, and `SHUTTING_DOWN` to `OFF`.
4. IF a component requests a Power_State transition that is not in the accepted set, including a transition to the current Power_State or to a value outside the four defined Power_State values, THEN THE Store SHALL reject the request, retain the current Power_State, return a rejection result to the requesting component, and publish exactly one `error:invalid-transition` event on the Event_Bus containing the current Power_State and the requested value.
5. WHEN the Store accepts a Power_State transition, THE Store SHALL publish exactly one `power:changed` event on the Event_Bus containing the previous Power_State and the new Power_State.
6. THE Event_Bus SHALL deliver each published event to every subscriber registered for that event name at the time of publication, in subscription order, and SHALL deliver the event to no subscriber registered for a different event name.
7. WHEN a subscriber unsubscribes, THE Event_Bus SHALL deliver no further events to that subscriber, including events published after the unsubscribe call returns.
8. IF a subscriber throws an error while handling an event, THEN THE Event_Bus SHALL log the error identifying the event name, and SHALL continue delivering the event to the remaining subscribers in subscription order without altering the Power_State.
9. THE Frontend SHALL route every Power_State change through the Store and every cross-component notification through the Event_Bus.
10. WHEN the Store accepts a Power_State transition, THE Store SHALL complete the state update before the Event_Bus delivers the `power:changed` event, so that a subscriber reading the Power_State during delivery receives the new Power_State.
11. IF an event is published on the Event_Bus with no registered subscribers, THEN THE Event_Bus SHALL complete the publish without throwing an error.

### Requirement 2: CRT Hardware Rig

**User Story:** As a user, I want to see a CRT monitor and computer case with a power button, so that the experience feels like operating a 1995 desktop machine.

#### Acceptance Criteria

1. THE Hardware_Rig SHALL render a CRT monitor bezel, a CRT_Display, a computer case, a power button, and a power indicator LED, all visible simultaneously in every Power_State.
2. WHILE the Power_State is `OFF`, THE Hardware_Rig SHALL render the CRT_Display as a uniformly black screen with no text or images and the power indicator LED as unlit.
3. WHILE the Power_State is `BOOTING` or `RUNNING`, THE Hardware_Rig SHALL render the power indicator LED as lit green.
4. WHILE the Power_State is `SHUTTING_DOWN`, THE Hardware_Rig SHALL render the power indicator LED as lit amber.
5. WHILE the Power_State is `BOOTING`, `RUNNING`, or `SHUTTING_DOWN`, THE Hardware_Rig SHALL apply a CRT visual effect to the CRT_Display consisting of scanlines, screen curvature, and a phosphor glow.
6. WHEN the Power_State changes to `BOOTING`, THE Hardware_Rig SHALL play a CRT turn-on animation lasting between 400 milliseconds and 1000 milliseconds.
7. WHEN the Power_State changes to `OFF` from `SHUTTING_DOWN`, THE Hardware_Rig SHALL play a CRT turn-off animation in which the image collapses to a horizontal line and then to a dot, lasting between 400 milliseconds and 1000 milliseconds, and SHALL then render the CRT_Display as defined for the `OFF` state.
8. WHERE the user has set the Reduced_Motion_Preference, THE Hardware_Rig SHALL replace the turn-on animation, the turn-off animation, and the flicker effect with an instant state change completing within 100 milliseconds.
9. WHEN the Hardware_Rig receives a `power:changed` event, THE Hardware_Rig SHALL update the power indicator LED and the CRT_Display to the rendering defined for the new Power_State within 100 milliseconds, excluding the duration of the turn-on and turn-off animations.
10. THE Hardware_Rig SHALL change its rendering only in response to `power:changed` events received from the Event_Bus.
11. IF a `power:changed` event contains a Power_State value other than `OFF`, `BOOTING`, `RUNNING`, or `SHUTTING_DOWN`, THEN THE Hardware_Rig SHALL ignore the event and retain its current rendering.

### Requirement 3: Power Button and Power Lifecycle

**User Story:** As a user, I want to turn the machine on and off with the power button, so that I control the machine's lifecycle like real hardware.

#### Acceptance Criteria

1. WHEN the user activates the power button by pointer click or by keyboard while the Power_State is `OFF` or `RUNNING`, THE Hardware_Rig SHALL publish exactly one `power:button-pressed` event on the Event_Bus for each activation.
2. WHEN a `power:button-pressed` event is received while the Power_State is `OFF`, THE Store SHALL request the Power_State transition to `BOOTING`.
3. WHEN a `power:button-pressed` event is received while the Power_State is `RUNNING`, THE Store SHALL request the Power_State transition to `SHUTTING_DOWN`.
4. WHILE the Power_State is `BOOTING` or `SHUTTING_DOWN`, THE Hardware_Rig SHALL ignore activations of the power button, publish no `power:button-pressed` event, and leave the Power_State unchanged.
5. IF a `power:button-pressed` event is received while the Power_State is `BOOTING` or `SHUTTING_DOWN`, THEN THE Store SHALL ignore the event and leave the Power_State unchanged.
6. WHEN the power button has keyboard focus and the user presses the Enter key or the Space key, THE Hardware_Rig SHALL treat the key press as one activation of the power button.
7. THE Hardware_Rig SHALL include the power button in the Tab key focus order and SHALL display a visible focus indicator while the power button has keyboard focus.
8. THE Hardware_Rig SHALL expose the power button to assistive technology with a non-empty accessible name and a pressed-state attribute set to true while the Power_State is not `OFF` and set to false while the Power_State is `OFF`.
9. WHEN the Power_State changes, THE Hardware_Rig SHALL update the pressed-state attribute of the power button within 100 milliseconds of receiving the `power:changed` event.

### Requirement 4: Boot Sequence

**User Story:** As a user, I want to watch a boot sequence when I power on, so that the machine feels authentic.

#### Acceptance Criteria

1. WHEN the Power_State changes to `BOOTING`, THE Boot_Sequencer SHALL display on the CRT_Display, in this order, a memory test screen, a hardware detection list, and a Chronos 95 splash screen, with each screen visible for at least 500 milliseconds before the next screen replaces it.
2. WHEN the Power_State changes to `BOOTING`, THE Boot_Sequencer SHALL publish a `boot:complete` event on the Event_Bus no later than 6000 milliseconds after the change.
3. WHEN the Boot_Sequencer finishes displaying the splash screen, THE Boot_Sequencer SHALL publish exactly one `boot:complete` event on the Event_Bus per boot.
4. WHEN a `boot:complete` event is received while the Power_State is `BOOTING`, THE Store SHALL transition the Power_State to `RUNNING`.
5. WHEN the Power_State changes to `RUNNING`, THE OS_Shell SHALL render the Desktop, the Taskbar, and one desktop icon for each registered App_Module within 1000 milliseconds.
6. WHEN the Power_State changes to `BOOTING`, THE Boot_Sequencer SHALL send one `GET /health` request to the Backend through the API_Client and SHALL treat a response that is not a success within 2000 milliseconds as a failure.
7. IF the Backend health check fails during the BOOTING phase, THEN THE Boot_Sequencer SHALL display a "Chippy offline" notice on the CRT_Display for at least 1000 milliseconds, continue the boot sequence without changing its order, and keep the boot within the 6000 millisecond limit.
8. WHEN the user presses the Escape key while the Power_State is `BOOTING`, THE Boot_Sequencer SHALL stop displaying the remaining boot output and publish exactly one `boot:complete` event within 200 milliseconds.
9. IF a `boot:complete` event has already been published during the current boot, THEN THE Boot_Sequencer SHALL ignore further Escape key presses and SHALL NOT publish another `boot:complete` event.
10. IF the Power_State changes from `BOOTING` to any other value before the Boot_Sequencer publishes `boot:complete`, THEN THE Boot_Sequencer SHALL stop all boot output and SHALL NOT publish `boot:complete`.

### Requirement 5: Shutdown Sequence

**User Story:** As a user, I want an orderly shutdown, so that open work is closed cleanly before the machine powers off.

#### Acceptance Criteria

1. WHEN the user selects Shut Down from the Start_Menu while the Power_State is `RUNNING`, THE OS_Shell SHALL publish a `power:button-pressed` event on the Event_Bus.
2. WHEN the Power_State changes to `SHUTTING_DOWN`, THE Window_Manager SHALL close every open window, including minimized windows, by invoking the unmount function of each App_Module once per open window and publishing a `window:closed` event for each window.
3. WHEN the Power_State changes to `SHUTTING_DOWN`, THE Shutdown_Sequencer SHALL display the text "It is now safe to turn off your computer" on the CRT_Display after all windows are closed.
4. THE Shutdown_Sequencer SHALL complete the shutdown sequence within 3000 milliseconds of the Power_State changing to `SHUTTING_DOWN`.
5. WHEN the Shutdown_Sequencer finishes, THE Shutdown_Sequencer SHALL publish a `shutdown:complete` event on the Event_Bus.
6. WHEN a `shutdown:complete` event is received while the Power_State is `SHUTTING_DOWN`, THE Store SHALL transition the Power_State to `OFF`.
7. WHEN the Power_State changes to `OFF`, THE Store SHALL reset all window state (open windows, stacking order, focus, and Taskbar window buttons) and OS_Shell state (Start_Menu closed, Chippy visibility) to the values defined for a fresh boot.
8. IF an App_Module unmount function throws an error during shutdown, THEN THE Window_Manager SHALL log the error, remove that window regardless, and continue closing the remaining windows.
9. IF a window has unsaved content when the Power_State changes to `SHUTTING_DOWN`, THEN THE Window_Manager SHALL close the window without displaying a confirmation dialog and discard the unsaved content.
10. WHILE the Power_State is `SHUTTING_DOWN`, THE OS_Shell SHALL ignore `app:launch-requested` events and user input directed at the Desktop, Taskbar, and Start_Menu.

### Requirement 6: Desktop Shell

**User Story:** As a user, I want a desktop with icons, a taskbar, and a start menu, so that I can launch and switch between applications.

#### Acceptance Criteria

1. WHILE the Power_State is `RUNNING`, THE OS_Shell SHALL display exactly one desktop icon, labeled with the App_Contract display title, for each App_Module registered with the Window_Manager.
2. WHEN the user double-clicks a desktop icon with two clicks no more than 500 milliseconds apart, THE OS_Shell SHALL publish an `app:launch-requested` event on the Event_Bus containing the application identifier.
3. WHEN the user activates the Start_Button, THE Taskbar SHALL show the Start_Menu if it is hidden and hide the Start_Menu if it is visible.
4. WHEN the user selects an application in the Start_Menu, THE OS_Shell SHALL publish an `app:launch-requested` event on the Event_Bus containing the application identifier and close the Start_Menu.
5. WHEN the user clicks outside the Start_Menu while the Start_Menu is visible, THE Taskbar SHALL close the Start_Menu.
6. WHILE the Power_State is `RUNNING`, THE Clock SHALL display the current local time in `h:mm AM/PM` format, with the hour shown as 1 to 12 without a leading zero and the minutes shown as 00 to 59, and SHALL refresh the displayed time within 1 second of each minute boundary.
7. WHEN a window opens, THE Taskbar SHALL add exactly one button labeled with the window title, truncated with an ellipsis if the title exceeds 20 characters.
8. WHEN a window closes, THE Taskbar SHALL remove the button for that window.
9. WHEN the user activates a Taskbar window button for a minimized window, THE Taskbar SHALL publish a `window:restore-requested` event on the Event_Bus containing the window identifier.
10. WHEN the user activates a Taskbar window button for the focused window, THE Taskbar SHALL publish a `window:minimize-requested` event on the Event_Bus containing the window identifier.
11. WHEN the user activates a Taskbar window button for a non-minimized window that is not focused, THE Taskbar SHALL publish a `window:focus-requested` event on the Event_Bus containing the window identifier.
12. THE OS_Shell SHALL support keyboard navigation as follows: the Tab key moves focus between desktop icons, the Start_Button, and Taskbar window buttons in visual order; the Up Arrow and Down Arrow keys move focus between Start_Menu items; the Enter key activates the focused element; and the Escape key closes the Start_Menu and returns focus to the Start_Button.
13. IF an `app:launch-requested` event cannot be fulfilled because the application identifier is not registered with the Window_Manager, THEN THE OS_Shell SHALL keep the Desktop, Taskbar, and open windows unchanged and display an error dialog indicating that the application could not be launched.
14. WHEN the Power_State changes from `RUNNING` to `SHUTTING_DOWN`, THE OS_Shell SHALL close the Start_Menu if it is visible.

### Requirement 7: Plugin Window Manager

**User Story:** As a developer, I want applications to be decoupled plugin modules managed by the Window_Manager, so that new applications can be added without modifying existing application code.

#### Acceptance Criteria

1. WHEN an App_Module that implements every member of the App_Contract is registered, THE Window_Manager SHALL accept the registration and make the App_Module available for launch.
2. IF an App_Module is registered without every member of the App_Contract, THEN THE Window_Manager SHALL reject the registration, retain the existing set of registered App_Modules, and publish an `error:invalid-app` event on the Event_Bus identifying the missing members.
3. IF an App_Module is registered with an application identifier that is already registered, THEN THE Window_Manager SHALL reject the registration, retain the originally registered App_Module, and publish an `error:invalid-app` event on the Event_Bus identifying the duplicate application identifier.
4. WHEN an `app:launch-requested` event is received while the Power_State is `RUNNING` and the application identifier matches a registered App_Module, THE Window_Manager SHALL create a window for the App_Module using the default window dimensions from the App_Contract, invoke the mount function of the App_Module with the window content element, and give the new window focus.
5. IF an `app:launch-requested` event is received with an application identifier that is not registered, THEN THE Window_Manager SHALL create no window and publish an `error:invalid-app` event on the Event_Bus identifying the unknown application identifier.
6. WHEN an `app:launch-requested` event is received while the Power_State is not `RUNNING`, THE Window_Manager SHALL ignore the event and create no window.
7. IF the mount function of an App_Module throws an error while a window is being created, THEN THE Window_Manager SHALL remove the partially created window, publish an `error:invalid-app` event on the Event_Bus identifying the application identifier, and leave the focus and stacking order of the other windows unchanged.
8. THE Window_Manager SHALL render each window with a title bar showing the display title from the App_Contract, a minimize button, a maximize button, a close button, and a content area.
9. WHEN the user presses a window title bar and moves the pointer, THE Window_Manager SHALL move the window by the pointer displacement while keeping at least 40 pixels of the title bar inside the CRT_Display.
10. WHEN the user drags a window edge or corner, THE Window_Manager SHALL resize the window, constrained to a minimum size of 200 pixels by 120 pixels and a maximum size equal to the Desktop area above the Taskbar.
11. WHEN the user presses any part of a window, THE Window_Manager SHALL bring the window to the front of the stacking order and publish a `window:focused` event on the Event_Bus containing the window identifier.
12. THE Window_Manager SHALL keep exactly one window in the focused state while at least one non-minimized window is open, and zero windows in the focused state otherwise.
13. WHEN the user activates the close button of a window, THE Window_Manager SHALL invoke the unmount function of the App_Module, remove the window, and publish a `window:closed` event on the Event_Bus containing the window identifier.
14. IF the unmount function of an App_Module throws an error while a window is being closed, THEN THE Window_Manager SHALL log the error, still remove the window, and publish the `window:closed` event on the Event_Bus.
15. WHEN the user activates the minimize button of a window, THE Window_Manager SHALL hide the window and publish a `window:minimized` event on the Event_Bus containing the window identifier.
16. WHEN a `window:restore-requested` event is received for a minimized window, THE Window_Manager SHALL show the window at its previous position and size, bring it to the front of the stacking order, and publish a `window:focused` event on the Event_Bus.
17. WHEN a `window:minimize-requested` event is received for a non-minimized window, THE Window_Manager SHALL minimize the window in the same way as activation of its minimize button.
18. WHEN the focused window is closed or minimized, THE Window_Manager SHALL focus the next non-minimized window in descending stacking order.
19. WHEN the user activates the maximize button of a non-maximized window, THE Window_Manager SHALL resize the window to fill the Desktop area above the Taskbar.
20. WHEN the user activates the maximize button of a maximized window, THE Window_Manager SHALL restore the window to its position and size from before maximizing.
21. THE App_Module SHALL communicate with other components only through the Event_Bus and the content element supplied by the Window_Manager.
22. THE Window_Manager SHALL permit adding a new App_Module without any change to the source of an existing App_Module.

### Requirement 8: NotePad.exe Application

**User Story:** As a user, I want a simple text editor, so that I can write and save notes inside Chronos 95.

#### Acceptance Criteria

1. THE NotePad_App SHALL display the title "NotePad.exe" in its window title bar.
2. WHEN the NotePad_App is mounted, THE NotePad_App SHALL display an empty multi-line text area, a menu bar containing File and Edit menus, and the document name "Untitled".
3. WHEN the user selects File then New, THE NotePad_App SHALL clear the text area, reset the document name to "Untitled", clear the stored document identifier, and record the empty text as the last saved content.
4. WHEN the user selects File then Save and the document has no stored identifier, THE NotePad_App SHALL prompt for a document name of 1 to 100 characters and, after the user confirms the name, send a create request for a Document of kind `text` to the Backend through the API_Client.
5. IF the user cancels the name prompt or confirms a name that is empty or longer than 100 characters, THEN THE NotePad_App SHALL not send a request, SHALL retain the text area content, and SHALL indicate that the name is invalid when the name was confirmed but invalid.
6. IF the text area content exceeds 100000 characters when the user selects File then Save, THEN THE NotePad_App SHALL not send a request, SHALL display an error dialog indicating the content is too long, and SHALL retain the text area content.
7. WHEN the user selects File then Save and the document has a stored identifier, THE NotePad_App SHALL send an update request to the Backend through the API_Client.
8. WHEN the Backend confirms a successful create or update, THE NotePad_App SHALL store the returned Document identifier, record the saved text as the last saved content, and remove the asterisk from the window title.
9. WHEN the user selects File then Open, THE NotePad_App SHALL display the list of stored `text` Documents showing each Document name, and load the content of the Document the user selects into the text area, set the document name and stored identifier to those of the selected Document, and record the loaded text as the last saved content.
10. IF the list of stored `text` Documents is empty when the user selects File then Open, THEN THE NotePad_App SHALL display a message indicating that no documents are stored and SHALL retain the text area content.
11. WHEN the user selects Edit then Select All, THE NotePad_App SHALL select all text in the text area.
12. IF the Backend returns an error, is unreachable, or does not respond within 10 seconds during Save or Open, THEN THE NotePad_App SHALL display an error dialog containing the failure reason, retain the current text area content, retain the stored document identifier, and retain the last saved content.
13. WHILE the text area content differs from the last saved content, THE NotePad_App SHALL show an asterisk immediately after the document name in the window title.
14. WHEN the user closes a NotePad_App window whose content differs from the last saved content, THE NotePad_App SHALL display a confirmation dialog offering Save, Discard, and Cancel.
15. WHEN the user selects Save in the close confirmation dialog and the save succeeds, THE NotePad_App SHALL close the window; WHEN the user selects Discard, THE NotePad_App SHALL close the window without saving; WHEN the user selects Cancel, THE NotePad_App SHALL keep the window open with the text area content unchanged.
16. IF the save initiated from the close confirmation dialog fails, THEN THE NotePad_App SHALL display an error dialog containing the failure reason and keep the window open with the text area content unchanged.
17. FOR ALL Documents of kind `text` with content of 0 to 100000 characters, saving then opening the Document SHALL produce text identical to the text that was saved (round-trip property).

### Requirement 9: PixelPaint.exe Application

**User Story:** As a user, I want a simple drawing application, so that I can create pixel images inside Chronos 95.

#### Acceptance Criteria

1. THE PixelPaint_App SHALL display the title "PixelPaint.exe" in its window title bar.
2. WHEN the PixelPaint_App is mounted, THE PixelPaint_App SHALL display a white drawing canvas of 320 by 240 pixels, a tool palette, a color palette of 16 distinct colors, a menu bar containing a File menu, and black as the initially selected color and pencil as the initially selected tool.
3. THE PixelPaint_App SHALL provide the tools pencil, line, rectangle, eraser, and flood fill, and SHALL indicate exactly one tool as selected at any time.
4. WHEN the user presses the pointer on the canvas with the pencil tool and moves the pointer, THE PixelPaint_App SHALL draw a 1-pixel-wide continuous line of the selected color along the pointer path, leaving no gaps between consecutive pointer positions.
5. WHEN the user selects a color from the color palette, THE PixelPaint_App SHALL use that color for subsequent drawing operations and SHALL indicate that color as selected.
6. WHEN the user selects the flood fill tool and clicks a canvas pixel, THE PixelPaint_App SHALL replace the 4-connected region of pixels having exactly the clicked pixel's color with the selected color.
7. WHEN the user presses the pointer on the canvas with the line tool or rectangle tool, moves the pointer, and releases it, THE PixelPaint_App SHALL draw a 1-pixel-wide straight line or rectangle outline of the selected color from the press position to the release position.
8. WHEN the user presses the pointer on the canvas with the eraser tool and moves the pointer, THE PixelPaint_App SHALL set the pixels along the pointer path to white.
9. WHILE the pointer is outside the canvas bounds during a drawing operation, THE PixelPaint_App SHALL leave pixels outside the 320 by 240 canvas unchanged and SHALL clip drawing to the canvas bounds.
10. WHEN the user selects File then New, THE PixelPaint_App SHALL reset every canvas pixel to white.
11. WHEN the user selects File then Save and the image has no stored identifier, THE PixelPaint_App SHALL encode the canvas as a PNG image and send a create request to the Backend through the API_Client.
12. WHEN the user selects File then Save and the image has a stored identifier, THE PixelPaint_App SHALL encode the canvas as a PNG image and send an update request to the Backend through the API_Client.
13. WHEN the user selects File then Open, THE PixelPaint_App SHALL display the list of stored `image` Documents and, when the user selects one, draw the selected Document onto the canvas at its original size with the top-left corner at the canvas origin.
14. IF the Backend returns an error or is unreachable during Save or Open, THEN THE PixelPaint_App SHALL display an error dialog containing the failure reason and retain the current canvas content unchanged.
15. IF the Backend returns an `image` Document that cannot be decoded as a PNG during Open, THEN THE PixelPaint_App SHALL display an error dialog indicating the image is invalid and retain the current canvas content unchanged.
16. THE PixelPaint_App SHALL render canvas pixels without anti-aliasing smoothing, such that every canvas pixel holds exactly one of the colors drawn into it.
17. FOR ALL canvases, saving then opening the Document SHALL produce pixel data identical to the saved canvas (round-trip property).

### Requirement 10: Chippy AI Assistant

**User Story:** As a user, I want an animated assistant who offers help, so that I can get AI-powered guidance while using Chronos 95.

#### Acceptance Criteria

1. WHEN the Power_State changes to `RUNNING`, THE OS_Shell SHALL display the Chippy character on the Desktop with a greeting bubble containing a non-empty greeting text that includes the name "Chippy".
2. WHEN the user submits a question of 1 to 2000 characters in the Chippy input field, THE API_Client SHALL send a Brain_Request to `POST /api/brain` with the question as the `prompt` and `assistant` as the `mode`.
3. IF the user submits an empty question or a question longer than 2000 characters in the Chippy input field, THEN THE OS_Shell SHALL not send a request to the Backend, SHALL display in the Chippy speech bubble a message indicating the permitted length of 1 to 2000 characters, and SHALL retain the text in the input field.
4. WHEN the Backend returns a Brain_Response within 10 seconds of the request being sent, THE OS_Shell SHALL replace the Chippy speech bubble content with the `reply` of the Brain_Response and clear the Chippy input field.
5. WHILE a Chippy request is pending, THE OS_Shell SHALL display a "Chippy is thinking" indicator in the Chippy speech bubble and SHALL disable submission of further questions.
6. IF the Backend returns an error or does not respond within 10 seconds of the request being sent, THEN THE OS_Shell SHALL remove the thinking indicator, display a fixed offline message in the Chippy speech bubble, re-enable submission, and retain the user's question in the Chippy input field.
7. WHEN the user activates the Chippy dismiss control, THE OS_Shell SHALL hide Chippy until the next transition of the Power_State to `RUNNING`.
8. WHILE a NotePad_App window is focused and its text area contains at least 1 character, THE OS_Shell SHALL offer an "Ask Chippy about this text" command.
9. WHEN the user activates the "Ask Chippy about this text" command, THE API_Client SHALL send a Brain_Request to `POST /api/brain` with `notepad` as the `mode` and the NotePad_App text, truncated to its first 20,000 characters, as the `prompt`.
10. WHEN the Brain_Service answers a Brain_Request with the mode `assistant`, THE Brain_Service SHALL answer in the persona of Chippy, the assistant of Chronos 95.

### Requirement 11: Backend API

**User Story:** As a developer, I want a FastAPI backend with validated schemas, so that the Frontend can persist documents and request AI responses reliably.

#### Acceptance Criteria

1. WHEN a client sends `GET /health`, THE Backend SHALL respond within 2 seconds with HTTP status 200 and a body containing a status of `ok` and the Backend version.
2. THE Backend SHALL expose `POST /api/brain`, defined in Requirement 15, and `POST /api/paint-vision`, defined in Requirement 20, as its only AI endpoints.
3. THE Backend SHALL expose `POST /api/documents`, `GET /api/documents`, `GET /api/documents/{id}`, `PUT /api/documents/{id}`, and `DELETE /api/documents/{id}` for managing Documents.
4. WHEN a client creates a Document with a name of 1 to 100 characters, a kind of `text` or `image`, and valid content, THE Backend SHALL store the Document, assign a unique identifier and creation and update timestamps, and return the stored Document.
5. WHEN a client updates an existing Document with valid fields, THE Backend SHALL replace the name and content, advance the update timestamp, retain the identifier, kind, and creation timestamp, and return the updated Document.
6. WHEN a client sends `GET /api/documents`, THE Backend SHALL return the list of stored Documents, optionally filtered by kind, and return an empty list if no Documents match.
7. WHEN a client deletes an existing Document, THE Backend SHALL remove the Document from the Document_Store so that a subsequent read of its identifier results in a not-found response.
8. THE Schema_Validator SHALL validate every request body and response body against a Pydantic model.
9. IF a request fails schema validation, THEN THE Backend SHALL respond with HTTP status 422 and a JSON body listing each invalid field and the reason, and SHALL leave the Document_Store unchanged.
10. IF a requested Document identifier does not exist, THEN THE Backend SHALL respond with HTTP status 404 and a JSON error body, and SHALL leave the Document_Store unchanged.
11. IF the Document_Store cannot complete a read or write because of a storage error, THEN THE Backend SHALL respond with HTTP status 503 and an Error_Body, and SHALL leave every stored Document as it was before the request.
12. WHEN a Document of kind `image` is submitted, THE Backend SHALL accept content only as a base64-encoded PNG of at most 1 megabyte (1,048,576 bytes) after decoding.
13. IF a submitted `image` Document content is not valid base64, is not a PNG, or exceeds 1,048,576 bytes after decoding, THEN THE Backend SHALL respond with HTTP status 422 identifying the content field and SHALL leave the Document_Store unchanged.
14. WHEN a Document of kind `text` is submitted, THE Backend SHALL accept content of 0 to 100000 characters.
15. IF a submitted `text` Document content exceeds 100000 characters, THEN THE Backend SHALL respond with HTTP status 422 identifying the content field and SHALL leave the Document_Store unchanged.
16. WHEN a request carries an `Origin` header that exactly matches an entry of the Allowed_Origins, THE Backend SHALL return an `Access-Control-Allow-Origin` header with that origin, including on responses to CORS preflight requests.
17. THE Document_Store SHALL return from a read exactly the content that was written in the most recent successful create or update (round-trip property).
18. FOR ALL valid Document models, serializing to JSON then parsing the JSON SHALL produce an equivalent Document model (round-trip property).
19. IF a request body exceeds the Body_Size_Limit, THEN THE Backend SHALL respond with HTTP status 413 and an Error_Body, and SHALL leave the Document_Store unchanged.
20. IF a request carries an `Origin` header that matches no entry of the Allowed_Origins, THEN THE Backend SHALL omit the `Access-Control-Allow-Origin` header from the response.

### Requirement 12: Containerization and Configuration

**User Story:** As a developer, I want the Backend and Frontend to run from Docker, so that the project starts the same way on any machine.

#### Acceptance Criteria

1. THE Backend SHALL include a Dockerfile that builds an image running on Python 3.11 or later.
2. THE Chronos_95 repository SHALL include the Compose_File, which starts with the single command `docker compose up` the Backend published on host port 8000 and a static web server serving `/frontend` published on host port 8080.
3. WHEN the single Docker Compose start command completes, THE Chronos_95 repository SHALL have both the Backend container and the static web server container in the running state, and the Frontend index page SHALL be retrievable from the static web server within 60 seconds.
4. THE Backend SHALL read `LLM_PROVIDER`, every Provider_Configuration variable, `AWS_SESSION_TOKEN`, `ALLOWED_ORIGINS`, and `DOCUMENT_STORE_DIR` from environment variables.
5. IF the Allowed_Origins list is empty, including when `ALLOWED_ORIGINS` is unset, THEN THE Backend SHALL reject all cross-origin requests by omitting the `Access-Control-Allow-Origin` header from every response.
6. IF no LLM_Provider has a complete Provider_Configuration, THEN THE Backend SHALL start successfully and serve every endpoint.
7. IF the Document_Store directory cannot be created or is not writable at startup, THEN THE Backend SHALL exit within 10 seconds with a non-zero exit status and write a message to standard error identifying the Document_Store directory as the cause.
8. THE Chronos_95 repository SHALL provide the file `backend/.env.example`, listing every environment variable read by the Backend with a placeholder value and a one-line description, and containing no real credential.
9. WHEN the Backend container is running, THE Backend SHALL respond to `GET /health` within 2 seconds.
10. THE Backend container SHALL run its application process as a non-root user.
11. WHEN the Backend container is restarted, THE Document_Store SHALL retain every Document written before the restart, provided the Document_Store location is on a persistent volume.
12. IF `DOCUMENT_STORE_DIR` is unset or empty, THEN THE Backend SHALL use the Default_Data_Directory as the Document_Store location and create the directory when it does not exist.
13. THE Backend Dockerfile SHALL declare a container health check that sends `GET /health` to the Backend at an interval of at most 30 seconds and marks the container unhealthy after 3 consecutive failed checks.
14. THE Compose_File SHALL mount a named volume at the Document_Store location of the Backend container.
15. WHERE the file `backend/.env` exists, THE Compose_File SHALL load its variables into the Backend container, with values from `backend/.env` taking precedence over the defaults set in the Compose_File.
16. IF the file `backend/.env` does not exist, THEN THE Compose_File SHALL start the Backend with the defaults set in the Compose_File when `docker compose up` runs.
17. WHERE `backend/.env` does not define `ALLOWED_ORIGINS`, THE Compose_File SHALL set `ALLOWED_ORIGINS` for the Backend to `http://localhost:8080,http://127.0.0.1:8080`.
18. IF an `ALLOWED_ORIGINS` item is `*` or contains the character `*`, THEN THE Backend SHALL exclude the item from the Allowed_Origins and log a warning naming the item.
19. WHERE a `.env` file exists in the Backend working directory at startup, THE Backend SHALL read its variables, with variables already set in the process environment taking precedence.
20. THE Backend Docker image SHALL contain no `.env` file.
21. THE Backend SHALL list every third-party Python package used by the Backend and its test suite in `backend/requirements.txt`, each pinned to an exact version.
22. THE Chronos_95 repository SHALL exclude `backend/.env` and the Default_Data_Directory from source control.

### Requirement 13: Project Structure and Architectural Compliance

**User Story:** As a developer, I want a prescribed project layout and enforced architecture rules, so that contributors can extend the system consistently.

#### Acceptance Criteria

1. THE Chronos_95 repository SHALL organize Frontend sources under `/frontend` with `js/core`, `js/apps`, `js/ui`, `css`, and `assets` subdirectories.
2. THE Chronos_95 repository SHALL organize Backend sources under `/backend` with the application entry module `app/main.py`, the Brain_Service module `app/services/brain_service.py`, and the Backend test suite under `app/tests`, including `app/tests/test_brain_pbt.py`.
3. THE Frontend SHALL load every JavaScript file referenced from its HTML entry page using a script element with `type="module"`, and SHALL contain zero script elements without `type="module"` that reference JavaScript.
4. THE Frontend SHALL contain zero imports or script references to a third-party UI framework or library, including React, Vue, Angular, Svelte, and jQuery.
5. THE Frontend SHALL restrict each UI component to modifying only the DOM subtree it owns, and SHALL restrict cross-component communication to the Event_Bus and the Store.
6. THE Chronos_95 repository SHALL contain zero case-insensitive occurrences of any name in the Trademark_List in user-visible text, file names, identifiers, or comments.
7. THE Chronos_95 repository SHALL use the name "Chronos 95" for the system, "PixelPaint.exe" for the drawing application, "NotePad.exe" for the text editor, and "Chippy" for the assistant in all user-visible text.
8. THE Chronos_95 repository SHALL contain zero Microsoft logos, icons, fonts, or sound assets.
9. THE Backend SHALL run on Python 3.11 or later, use FastAPI, and use Pydantic models for request and response validation.
10. IF the repository contains a name from the Trademark_List, a non-module script reference, or a third-party UI framework reference, THEN THE automated compliance check defined in Requirement 14 SHALL fail and report each offending file path and line number.

### Requirement 14: Automated Testing

**User Story:** As a developer, I want automated tests including property-based tests, so that correctness of core logic is verified continuously.

#### Acceptance Criteria

1. THE Backend test suite, located in `backend/app/tests`, SHALL use pytest and Hypothesis, run every property with at least 100 generated examples, and verify the Document round-trip, the schema validation boundaries, and the Document_Store read-after-write properties.
2. THE Backend test suite SHALL verify the validation boundaries by testing, for each of the following limits, one value at the limit and one value just beyond it: a prompt of Max_Prompt_Length characters, where both values receive HTTP status 200 and produce a Processed_Prompt of 20,000 characters; a request body of the Body_Size_Limit; `text` Document content of 100000 characters; decoded image size of 1,048,576 bytes for `image` Documents and for Paint_Vision; and a Paint_Vision image width and height of 2048 pixels.
3. IF a request body is invalid, THEN THE Backend test suite SHALL verify that the Backend responds with HTTP status 422 and that the Document_Store contents are identical before and after the request.
4. THE Frontend test suite SHALL verify, for generated sequences of 0 to 50 requested transitions, that the Store holds a Power_State from the set `OFF`, `BOOTING`, `RUNNING`, `SHUTTING_DOWN` after every request.
5. THE Frontend test suite SHALL verify, for generated sequences of 0 to 50 requested transitions, that the Power_State changes only for the transitions `OFF` to `BOOTING`, `BOOTING` to `RUNNING`, `RUNNING` to `SHUTTING_DOWN`, and `SHUTTING_DOWN` to `OFF`, and that every rejected request leaves the Power_State unchanged and publishes an `error:invalid-transition` event.
6. THE Frontend test suite SHALL verify that the Event_Bus delivers each event to all subscribers in subscription order, and that when a subscriber throws an error, the remaining subscribers still receive the event.
7. THE Frontend test suite SHALL verify, for generated sequences of 0 to 100 open, focus, minimize, and close operations, that the Window_Manager keeps at most one focused window and assigns every open window a unique stacking order after each operation.
8. WHEN the Trademark_List scan is run, THE Chronos_95 repository SHALL provide an automated check that scans all tracked files for each name in the Trademark_List, case-insensitively, and exits with a non-zero status identifying each file and name found.
9. THE Frontend test suite SHALL verify that the flood fill operation is idempotent: filling a region with a color and then filling the same point with the same color produces a canvas pixel-for-pixel identical to the result of the first fill.
10. IF any automated test fails, THEN THE test runner SHALL report the failing test name and the failure reason, and exit with a non-zero status.
11. THE Backend test suite SHALL include `backend/app/tests/test_brain_pbt.py`, which SHALL verify with Hypothesis `@given(st.text())` prompts, for each Brain_Mode, that `POST /api/brain` responds with HTTP status 200 and a schema-valid Brain_Response whose `reply` contains at least one non-whitespace character.
12. THE Backend test suite SHALL verify, for generated `mode` strings outside the Brain_Mode values and for generated non-string JSON values of `prompt` or `mode`, that `POST /api/brain` responds with HTTP status 422 and never with HTTP status 500.
13. THE Backend test suite SHALL verify the `notepad` totality property of Requirement 18 for generated text that includes null characters, deeply nested brackets, and text of Max_Prompt_Length characters.
14. THE Backend test suite SHALL verify the Python_Formatter round-trip and idempotence properties of Requirement 18.
15. THE Backend test suite SHALL verify the HTML safety and HTML_Sanitizer idempotence properties of Requirement 21 for generated prompts and for generated External_Engine outputs containing `script` elements, event-handler attributes, and `javascript:` URLs.
16. THE Backend test suite SHALL verify the robustness, dimension, palette, and layout properties of Requirement 20.
17. THE Backend test suite SHALL verify the Trademark_Filter properties of Requirement 21 for generated text containing Trademark_Replacements names in any letter case and with any separator allowed by the Trademark_Filter.
18. THE Backend test suite SHALL verify the Local_Engine determinism property of Requirement 16.
19. THE Backend test suite SHALL replace every LLM_Provider client with a test double and SHALL fail any test that opens a network connection.
20. THE Backend test suite SHALL verify with test doubles that an External_Engine error, error status, timeout, and result that is not a Usable_Reply each produce HTTP status 200 with `engine` set to `local`, and that a Usable_Reply produces `engine` set to `external`.
21. THE Backend test suite SHALL verify the Active_Provider selection of Requirement 16 for a complete configuration of each LLM_Provider, for two or more complete configurations at once, for each incomplete configuration, and for `LLM_PROVIDER` set to `local` and to an unrecognized value.
22. THE Backend test suite SHALL verify, using a sentinel value for every Credential_Variable, that no log output, response body, or response header contains a sentinel value, including during External_Engine failures.

### Requirement 15: Brain Endpoint

**User Story:** As a Frontend developer, I want one AI endpoint that accepts a prompt and a mode and always returns a valid reply, so that Chronos_Explorer, NotePad.exe, Chippy, and PixelPaint.exe never break on unexpected input.

#### Acceptance Criteria

1. WHEN the Backend receives a `POST /api/brain` request whose body is a Brain_Request within the Body_Size_Limit, THE Backend SHALL respond with HTTP status 200 and a Brain_Response for every string `prompt`, including the empty string.
2. THE Backend SHALL accept as a Brain_Request `prompt` every JSON string, including strings that contain null characters and unpaired surrogate escape sequences such as `\ud800`.
3. IF a `POST /api/brain` body is not a Brain_Request, including a body with a `mode` outside the four Brain_Mode values, a missing `prompt` or `mode` field, a `prompt` or `mode` of a non-string JSON type, or an additional field, THEN THE Backend SHALL respond with HTTP status 422 and an Error_Body naming each invalid field.
4. THE Brain_Service SHALL pass only the Processed_Prompt of a Brain_Request to the External_Engine and the Local_Engine.
5. IF a Brain_Request `prompt` is longer than Max_Prompt_Length, THEN THE Backend SHALL process the Processed_Prompt instead of rejecting the request.

### Requirement 16: Dual-Engine Selection and LLM Providers

**User Story:** As a developer, I want the Backend to use an external LLM when one is configured and fall back to the Local_Engine otherwise, so that AI features never fail because a key is missing or a provider is down.

#### Acceptance Criteria

1. WHEN the Backend starts with `LLM_PROVIDER` unset or empty, THE Backend SHALL select as the Active_Provider the first LLM_Provider with a complete Provider_Configuration in the order `openai_compatible`, `openai`, `groq`, `gemini`, `bedrock`, and SHALL select no Active_Provider when no Provider_Configuration is complete.
2. WHEN the Backend starts with `LLM_PROVIDER` naming an LLM_Provider, compared case-insensitively, whose Provider_Configuration is complete, THE Backend SHALL select that LLM_Provider as the Active_Provider.
3. WHEN the Backend starts with `LLM_PROVIDER` set to `local`, THE Backend SHALL select no Active_Provider.
4. IF `LLM_PROVIDER` names an LLM_Provider whose Provider_Configuration is incomplete, or holds a value other than an LLM_Provider name or `local`, THEN THE Backend SHALL start with no Active_Provider and log a warning naming `LLM_PROVIDER` and each missing variable, without logging the value of any Credential_Variable.
5. WHEN the Backend starts, THE Backend SHALL log the name of the Active_Provider, or `local` when there is no Active_Provider.
6. WHILE no Active_Provider is selected, THE Brain_Service SHALL produce every Brain_Response and Paint_Vision_Response with the Local_Engine and set `engine` to `local`.
7. WHILE an Active_Provider is selected, WHEN a `POST /api/brain` or `POST /api/paint-vision` request passes validation, THE Brain_Service SHALL request the result from the External_Engine before using the Local_Engine.
8. WHEN the External_Engine returns a Usable_Reply within 8 seconds of sending its request, THE Brain_Service SHALL respond with that result and set `engine` to `external`.
9. IF the External_Engine call raises an error, receives an error status, has not returned within 8 seconds of sending its request, or returns a result that is not a Usable_Reply, THEN THE Brain_Service SHALL produce the response with the Local_Engine within the same request, respond with HTTP status 200, and set `engine` to `local`.
10. WHEN the Brain_Service falls back to the Local_Engine after an External_Engine failure, THE Backend SHALL log one warning naming the Active_Provider and the failure category (error, error status, timeout, or unusable result), without the prompt text or the value of any Credential_Variable.
11. IF the Local_Engine raises an error while producing a response to a request that passed validation, THEN THE Brain_Service SHALL respond with HTTP status 200 using the fixed fallback value defined for each affected response field, and log the error.
12. THE Backend SHALL send the complete response to every `POST /api/brain` and `POST /api/paint-vision` request within 9 seconds of receiving the complete request body.
13. WHILE no Active_Provider is selected, THE Backend SHALL send the complete response to every `POST /api/brain` and `POST /api/paint-vision` request within 2 seconds of receiving the complete request body.
14. WHEN the External_Engine sends a request to the Active_Provider, THE External_Engine SHALL include a system instruction for the Brain_Mode, or for Paint_Vision, that names the assistant "Chippy" and the host system "Chronos 95".
15. THE Backend SHALL exclude the value of every Credential_Variable from log output, response bodies, and response headers.
16. FOR ALL Brain_Requests and Paint_Vision_Requests answered by the Local_Engine, sending the same request twice SHALL produce identical response bodies (determinism property).

### Requirement 17: Local Engine Browser Articles

**User Story:** As a Chronos_Explorer user, I want every search to return a 1995-style web page, so that browsing works without an external AI provider.

#### Acceptance Criteria

1. WHEN the Local_Engine handles a `browser` Brain_Request, THE Local_Engine SHALL return a Retro_Article whose `h1` heading contains the Prompt_Topic.
2. THE Local_Engine SHALL HTML-escape the characters `&`, `<`, `>`, `"`, and `'` in all text derived from the Processed_Prompt before inserting the text into a `browser` reply.
3. THE Local_Engine SHALL build every `browser` reply only from elements and attributes in the HTML_Allowlist.
4. FOR ALL prompts, parsing the Local_Engine `browser` reply as HTML and reading the text content of the `h1` heading SHALL yield the Prompt_Topic after the Trademark_Filter is applied to the Prompt_Topic (escaping round-trip property).

### Requirement 18: Local Engine NotePad Analysis

**User Story:** As a NotePad.exe user, I want Chippy to check, format, or summarize my note without an API key, so that I get useful feedback on code and prose offline.

#### Acceptance Criteria

1. WHEN the Local_Engine handles a `notepad` Brain_Request whose Processed_Prompt is empty or contains only whitespace, THE Local_Engine SHALL return a fixed reply stating that the note is empty.
2. WHEN the Local_Engine handles a `notepad` Brain_Request whose Processed_Prompt is Python_Like_Text that the Python parser accepts, THE Local_Engine SHALL return a reply that states the code is valid Python and contains the Python_Formatter output for the Processed_Prompt.
3. IF the Python_Formatter raises an error for a Processed_Prompt that the Python parser accepts, THEN THE Local_Engine SHALL return a reply that states the code is valid Python and contains the Processed_Prompt unchanged.
4. IF the Processed_Prompt of a `notepad` Brain_Request is Python_Like_Text and the Python parser rejects it with a syntax error that reports a line number, THEN THE Local_Engine SHALL return a reply that states the code is invalid Python and contains the parser's error message, line number, and column number.
5. IF the Processed_Prompt of a `notepad` Brain_Request is Python_Like_Text and the Python parser raises any other error, including errors caused by null characters, deeply nested brackets, the recursion limit, or memory exhaustion, THEN THE Local_Engine SHALL return a reply that states the Python check could not be completed and contains the Bullet_Summary of the Processed_Prompt.
6. WHEN the Processed_Prompt of a `notepad` Brain_Request contains a non-whitespace character and is not Python_Like_Text, THE Local_Engine SHALL return a reply containing the Bullet_Summary of the Processed_Prompt.
7. FOR ALL strings, the Local_Engine SHALL return a `notepad` reply with at least one non-whitespace character without raising an exception (totality property).
8. FOR ALL Python source texts that the Python parser accepts and the Python_Formatter formats without error, parsing the Python_Formatter output SHALL produce an abstract syntax tree equal to the abstract syntax tree of the input (round-trip property).
9. FOR ALL Python source texts that the Python parser accepts and the Python_Formatter formats without error, applying the Python_Formatter to its own output SHALL return that output unchanged (idempotence property).

### Requirement 19: Local Engine Assistant and Paint Replies

**User Story:** As a Chronos 95 user, I want Chippy to answer OS and coding questions and give drawing tips without an API key, so that the assistant is always available.

#### Acceptance Criteria

1. THE Assistant_Rule_Set SHALL contain topics for the Chronos 95 features power and boot, shutdown, Desktop and Start_Menu, windows and the Taskbar, NotePad.exe, PixelPaint.exe, Chronos_Explorer, and Chippy, and for the coding subjects Python, JavaScript, HTML, and CSS.
2. WHEN the Processed_Prompt of an `assistant` Brain_Request contains a trigger keyword of one or more Assistant_Rule_Set topics, THE Local_Engine SHALL return the answer of the matching topic that comes first in the Assistant_Rule_Set order.
3. WHEN the Processed_Prompt of an `assistant` Brain_Request matches no Assistant_Rule_Set topic, THE Local_Engine SHALL return a fixed reply that introduces Chippy and lists the covered topics.
4. THE Local_Engine SHALL include the name "Chippy" in every `assistant` reply.
5. WHEN the Local_Engine handles a `paint` Brain_Request, THE Local_Engine SHALL return a reply containing at least three pixel-art tips, a suggested palette of 3 to 6 PixelPaint_Palette colors written as hex codes, and a note that Paint_Vision converts a canvas image into HTML and CSS code (assumed behavior, see Introduction).

### Requirement 20: Paint Vision Endpoint

**User Story:** As a PixelPaint.exe user, I want to turn my canvas into HTML and CSS wireframe code, so that I can reuse a drawn layout as a web page.

#### Acceptance Criteria

1. WHEN the Backend receives a `POST /api/paint-vision` request whose body is a Paint_Vision_Request within the Body_Size_Limit and whose `image_base64` is a Valid_Canvas_Image, THE Backend SHALL respond with HTTP status 200 and a Paint_Vision_Response.
2. IF a `POST /api/paint-vision` body is not a Paint_Vision_Request, including a body with a missing field, a field of a non-string JSON type, or an additional field, THEN THE Backend SHALL respond with HTTP status 422 and an Error_Body naming each invalid field.
3. IF `image_base64` carries a data URL prefix other than `data:image/png;base64,`, or is not Base64_Text after removal of an accepted prefix, THEN THE Backend SHALL respond with HTTP status 422 and an Error_Body naming the `image_base64` field.
4. IF the decoded `image_base64` bytes exceed 1,048,576 bytes or do not form a complete, decodable PNG image, THEN THE Backend SHALL respond with HTTP status 422 and an Error_Body naming the `image_base64` field.
5. IF the PNG header declares a width or height greater than 2048 pixels, THEN THE Backend SHALL respond with HTTP status 422 and an Error_Body naming the `image_base64` field, determined from the header before the pixel data is decoded.
6. THE Paint_Vision SHALL compute `width`, `height`, and `palette` with the Local_Engine from the decoded image for every Paint_Vision_Response, including responses whose `engine` is `external`.
7. WHEN the decoded image contains at most 16 distinct colors, THE Paint_Vision SHALL report one Dominant_Palette entry per distinct color, with each proportion equal to the color's pixel count divided by the image's pixel count within 0.001.
8. WHEN the decoded image contains more than 16 distinct colors, THE Paint_Vision SHALL report the Dominant_Palette of the image reduced to at most 16 colors, with proportions summing to 1 within 0.01.
9. WHEN the Local_Engine generates wireframe code, THE Local_Engine SHALL return `html` with one root element containing one child element per Wireframe_Block, and `css` with a rule that sets the root element's width and height in pixels to the image width and height and its background color to the Background_Color.
10. WHEN the Local_Engine generates wireframe code, THE Local_Engine SHALL add for each Wireframe_Block a CSS rule that places the block's element at the block's left and top offsets in pixels with the block's width and height, filled with the block's color when the block's region covers at least half of its bounding box, and drawn as a 1-pixel border in the block's color otherwise.
11. IF the image has more than 32 Wireframe_Blocks, THEN THE Local_Engine SHALL include in the wireframe code only the 32 Wireframe_Blocks with the largest bounding-box areas.
12. WHEN the Local_Engine produces a Paint_Vision reply, THE Local_Engine SHALL state in `reply` the image width and height, the number of Wireframe_Blocks in the wireframe code, and the `hex` value of the Background_Color.
13. WHEN the External_Engine returns a Usable_Reply for a Paint_Vision_Request, THE Brain_Service SHALL take `reply`, `html`, and `css` from the External_Engine result.
14. FOR ALL generated PNG images of at most 320 by 240 pixels that consist of a uniform background covering more than half of the image and 1 to 8 non-overlapping axis-aligned rectangles, each at least 8 by 8 pixels, at least 2 pixels apart from every other rectangle, and filled or drawn as a 1-pixel outline in a color other than the background color, the Local_Engine wireframe code SHALL contain exactly one Wireframe_Block per rectangle with the rectangle's position, size, and color, filled for filled rectangles and bordered for outlined rectangles (layout model property).
15. FOR ALL strings supplied as `image_base64` and `prompt` in a body within the Body_Size_Limit, THE Backend SHALL respond to `POST /api/paint-vision` with HTTP status 200 or 422 (robustness property).
16. FOR ALL generated PNG images with a width and height of 1 to 2048 pixels and an encoded size of at most 1,048,576 bytes, the Paint_Vision_Response `width` and `height` SHALL equal the width and height of the image (dimension property).

### Requirement 21: Output Safety

**User Story:** As a Chronos 95 user, I want every AI reply to be safe to display and trademark-compliant, so that untrusted model output cannot run scripts or show prohibited names.

#### Acceptance Criteria

1. THE Brain_Service SHALL apply the Trademark_Filter to every `reply` and to every Paint_Vision `html` and `css` value from both engines as the last processing step before the response is sent.
2. FOR ALL strings, the Trademark_Filter output SHALL contain no Trademark_Replacements name under the matching rule of the Trademark_Filter (trademark property).
3. FOR ALL strings, applying the Trademark_Filter to its own output SHALL return that output unchanged (idempotence property).
4. THE Brain_Service SHALL pass every `browser` reply from either engine through the HTML_Sanitizer before the Trademark_Filter.
5. THE HTML_Sanitizer SHALL remove every element and attribute outside the HTML_Allowlist and keep the text content of removed elements as escaped text.
6. THE HTML_Sanitizer SHALL remove `script` and `style` elements together with their content.
7. THE HTML_Sanitizer SHALL remove every `href` attribute whose value, after HTML character references are decoded and leading whitespace and control characters are removed, does not begin with `http://`, `https://`, or `#`, compared case-insensitively.
8. FOR ALL prompts and for all External_Engine `browser` outputs, the `browser` reply SHALL contain no `script` element, no attribute whose name begins with `on`, and no attribute value that begins with `javascript:` after HTML character references are decoded, leading whitespace and control characters are removed, and letters are compared case-insensitively (HTML safety property).
9. FOR ALL strings, applying the HTML_Sanitizer to its own output SHALL return that output unchanged (idempotence property).
10. THE Brain_Service SHALL return `notepad`, `assistant`, and `paint` replies as plain text, adding no HTML markup to the engine output.
11. THE Brain_Service SHALL return Paint_Vision `html` and `css` as source-code strings, after removing `script` elements, attributes whose names begin with `on`, and `javascript:` attribute values from every `html` value.

### Requirement 22: Backend Error Handling

**User Story:** As a developer, I want every Backend failure to produce a predictable JSON error without internal details, so that clients can handle errors and no stack trace leaks.

#### Acceptance Criteria

1. IF an unexpected exception reaches the global exception handler while the Backend handles a request, THEN THE Backend SHALL respond with HTTP status 500 and an Error_Body whose `detail` is a fixed generic message.
2. THE Backend SHALL exclude stack traces, exception type names, file system paths, and the messages of unexpected exceptions from every response body.
3. WHEN an unexpected exception reaches the global exception handler, THE Backend SHALL log the exception with its stack trace, the request method, and the request path, without the request body or the value of any Credential_Variable.
4. THE Backend SHALL respond to every `POST /api/brain` and `POST /api/paint-vision` request with HTTP status 200, 413, or 422.
5. IF a request body is not valid JSON, is not valid UTF-8, or is nested too deeply for the JSON parser, THEN THE Backend SHALL respond with HTTP status 422 and an Error_Body identifying the request body.
6. THE Backend SHALL exclude submitted field values from the entries of every 422 Error_Body.
7. THE Backend SHALL return an Error_Body with every response of HTTP status 404, 405, 413, 422, 500, or 503.
