# Requirements Document

## Introduction

Chronos 95 is a retro 1995-style CRT desktop hardware rig and operating system, built for the Resurrection track. The Frontend uses Vanilla HTML5, CSS3, and modular ES6 JavaScript. The Backend is a Python FastAPI service, containerized with Docker, that provides AI features. The system follows a State-Driven Event Bus architecture: every hardware and OS transition (OFF, BOOTING, RUNNING, SHUTTING_DOWN) flows through the Store and the Event_Bus, and desktop applications are decoupled plugin modules managed by the Window_Manager.

This document covers requirements only. It defines the scope of the first release: the CRT hardware rig, the power and boot lifecycle, the desktop shell, the plugin window system, two bundled applications (NotePad.exe and PixelPaint.exe), the Chippy AI assistant, the backend API, and the project structure and compliance constraints.

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
- **Chippy**: The animated AI assistant character of Chronos_95.
- **Chippy_Service**: The Backend component that produces Chippy responses.
- **API_Client**: The Frontend module that sends HTTP requests to the Backend.
- **Document_Store**: The Backend component that persists user documents (NotePad_App text files and PixelPaint_App images).
- **Document**: A named item stored in the Document_Store, having an identifier, a name, a kind of `text` or `image`, content, and timestamps.
- **Schema_Validator**: The Pydantic models in the Backend that validate every request and response payload.
- **Trademark_List**: The set of prohibited names: "Windows 95", "MS Paint", "Clippy", and any other Microsoft trademark.
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
6. WHEN the Power_State changes to `BOOTING`, THE Boot_Sequencer SHALL send one Backend health check request through the API_Client and SHALL treat a response that is not a success within 2000 milliseconds as a failure.
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
2. WHEN the user submits a question of 1 to 2000 characters in the Chippy input field, THE API_Client SHALL send the question and the identifier of the focused application, or no application identifier if no window is focused, to the Backend chat endpoint.
3. IF the user submits an empty question or a question longer than 2000 characters in the Chippy input field, THEN THE OS_Shell SHALL not send a request to the Backend, SHALL display in the Chippy speech bubble a message indicating the permitted length of 1 to 2000 characters, and SHALL retain the text in the input field.
4. WHEN the Backend returns a response within 10 seconds of the request being sent, THE OS_Shell SHALL replace the Chippy speech bubble content with the response text and clear the Chippy input field.
5. WHILE a Chippy request is pending, THE OS_Shell SHALL display a "Chippy is thinking" indicator in the Chippy speech bubble and SHALL disable submission of further questions.
6. IF the Backend returns an error or does not respond within 10 seconds of the request being sent, THEN THE OS_Shell SHALL remove the thinking indicator, display a fixed offline message in the Chippy speech bubble, re-enable submission, and retain the user's question in the Chippy input field.
7. WHEN the user activates the Chippy dismiss control, THE OS_Shell SHALL hide Chippy until the next transition of the Power_State to `RUNNING`.
8. WHILE a NotePad_App window is focused and its text area contains at least 1 character, THE OS_Shell SHALL offer an "Ask Chippy about this text" command.
9. WHEN the user activates the "Ask Chippy about this text" command, THE API_Client SHALL send the NotePad_App text, truncated to its first 10000 characters, as context to the Backend chat endpoint together with a message of 1 to 2000 characters.
10. THE Chippy_Service SHALL identify itself as "Chippy" in every response persona and SHALL refer to the host system as "Chronos 95".

### Requirement 11: Backend API

**User Story:** As a developer, I want a FastAPI backend with validated schemas, so that the Frontend can persist documents and request AI responses reliably.

#### Acceptance Criteria

1. WHEN a client sends `GET /api/health`, THE Backend SHALL respond within 2 seconds with a body containing a status of `ok` and the Backend version.
2. WHEN a client sends `POST /api/chat` with a message of 1 to 2000 characters, an optional application identifier, and an optional context string of 0 to 10000 characters, THE Backend SHALL return a Chippy reply of 1 to 4000 characters.
3. THE Backend SHALL expose `POST /api/documents`, `GET /api/documents`, `GET /api/documents/{id}`, `PUT /api/documents/{id}`, and `DELETE /api/documents/{id}` for managing Documents.
4. WHEN a client creates a Document with a name of 1 to 100 characters, a kind of `text` or `image`, and valid content, THE Backend SHALL store the Document, assign a unique identifier and creation and update timestamps, and return the stored Document.
5. WHEN a client updates an existing Document with valid fields, THE Backend SHALL replace the name and content, advance the update timestamp, retain the identifier, kind, and creation timestamp, and return the updated Document.
6. WHEN a client sends `GET /api/documents`, THE Backend SHALL return the list of stored Documents, optionally filtered by kind, and return an empty list if no Documents match.
7. WHEN a client deletes an existing Document, THE Backend SHALL remove the Document from the Document_Store so that a subsequent read of its identifier results in a not-found response.
8. THE Schema_Validator SHALL validate every request body and response body against a Pydantic model.
9. IF a request fails schema validation, THEN THE Backend SHALL respond with HTTP status 422 and a JSON body listing each invalid field and the reason, and SHALL leave the Document_Store unchanged.
10. IF a requested Document identifier does not exist, THEN THE Backend SHALL respond with HTTP status 404 and a JSON error body, and SHALL leave the Document_Store unchanged.
11. IF the Chippy_Service fails to produce a reply within 8 seconds or raises an error, THEN THE Backend SHALL respond with HTTP status 503 and a JSON error body.
12. WHEN a Document of kind `image` is submitted, THE Backend SHALL accept content only as a base64-encoded PNG of at most 1 megabyte (1,048,576 bytes) after decoding.
13. IF a submitted `image` Document content is not valid base64, is not a PNG, or exceeds 1,048,576 bytes after decoding, THEN THE Backend SHALL respond with HTTP status 422 identifying the content field and SHALL leave the Document_Store unchanged.
14. WHEN a Document of kind `text` is submitted, THE Backend SHALL accept content of 0 to 100000 characters.
15. IF a submitted `text` Document content exceeds 100000 characters, THEN THE Backend SHALL respond with HTTP status 422 identifying the content field and SHALL leave the Document_Store unchanged.
16. THE Backend SHALL permit cross-origin requests only from the configured Frontend origin.
17. THE Document_Store SHALL return from a read exactly the content that was written in the most recent successful create or update (round-trip property).
18. FOR ALL valid Document models, serializing to JSON then parsing the JSON SHALL produce an equivalent Document model (round-trip property).
19. WHERE no AI provider credential is configured, THE Chippy_Service SHALL produce replies from a deterministic built-in rule set, returning the same reply for the same message, application identifier, and context.

### Requirement 12: Containerization and Configuration

**User Story:** As a developer, I want the Backend and Frontend to run from Docker, so that the project starts the same way on any machine.

#### Acceptance Criteria

1. THE Backend SHALL include a Dockerfile that builds an image running on Python 3.11 or later.
2. THE Chronos_95 repository SHALL include a Docker Compose file that starts the Backend and a static web server serving the Frontend with a single command.
3. WHEN the single Docker Compose start command completes, THE Chronos_95 repository SHALL have both the Backend container and the static web server container in the running state, and the Frontend index page SHALL be retrievable from the static web server within 60 seconds.
4. THE Backend SHALL read the AI provider credential, the allowed Frontend origin, and the Document_Store location from environment variables.
5. IF the environment variable for the allowed Frontend origin is not set, THEN THE Backend SHALL reject all cross-origin requests.
6. IF the environment variable for the AI provider credential is not set, THEN THE Backend SHALL start successfully and THE Chippy_Service SHALL use the deterministic built-in rule set.
7. IF the Document_Store location is not set or is not writable at startup, THEN THE Backend SHALL exit within 10 seconds with a non-zero exit status and write a message to standard error identifying the Document_Store location as the cause.
8. THE Chronos_95 repository SHALL keep secret values out of source control and provide an example environment file listing each variable read by the Backend with a placeholder value.
9. WHEN the Backend container is running, THE Backend SHALL respond to `GET /api/health` within 2 seconds.
10. THE Backend container SHALL run its application process as a non-root user.
11. WHEN the Backend container is restarted, THE Document_Store SHALL retain every Document written before the restart, provided the Document_Store location is on a persistent volume.

### Requirement 13: Project Structure and Architectural Compliance

**User Story:** As a developer, I want a prescribed project layout and enforced architecture rules, so that contributors can extend the system consistently.

#### Acceptance Criteria

1. THE Chronos_95 repository SHALL organize Frontend sources under `/frontend` with `js/core`, `js/apps`, `js/ui`, `css`, and `assets` subdirectories.
2. THE Chronos_95 repository SHALL organize Backend sources under `/backend` with `app` and `tests` subdirectories.
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

1. THE Backend test suite SHALL use Hypothesis to verify, with at least 100 generated examples per property, the Document round-trip, the schema validation boundaries, and the Document_Store read-after-write properties.
2. THE Backend test suite SHALL verify the schema validation boundaries by generating, for each of the following limits, one value at the limit and one value just beyond it: chat message length of 1 and 2000 characters, chat context length of 10000 characters, `text` Document content length of 100000 characters, and decoded `image` Document content size of 1 megabyte.
3. IF a request body is invalid, THEN THE Backend test suite SHALL verify that the Backend responds with HTTP status 422 and that the Document_Store contents are identical before and after the request.
4. THE Frontend test suite SHALL verify, for generated sequences of 0 to 50 requested transitions, that the Store holds a Power_State from the set `OFF`, `BOOTING`, `RUNNING`, `SHUTTING_DOWN` after every request.
5. THE Frontend test suite SHALL verify, for generated sequences of 0 to 50 requested transitions, that the Power_State changes only for the transitions `OFF` to `BOOTING`, `BOOTING` to `RUNNING`, `RUNNING` to `SHUTTING_DOWN`, and `SHUTTING_DOWN` to `OFF`, and that every rejected request leaves the Power_State unchanged and publishes an `error:invalid-transition` event.
6. THE Frontend test suite SHALL verify that the Event_Bus delivers each event to all subscribers in subscription order, and that when a subscriber throws an error, the remaining subscribers still receive the event.
7. THE Frontend test suite SHALL verify, for generated sequences of 0 to 100 open, focus, minimize, and close operations, that the Window_Manager keeps at most one focused window and assigns every open window a unique stacking order after each operation.
8. WHEN the Trademark_List scan is run, THE Chronos_95 repository SHALL provide an automated check that scans all tracked files for each name in the Trademark_List, case-insensitively, and exits with a non-zero status identifying each file and name found.
9. THE Frontend test suite SHALL verify that the flood fill operation is idempotent: filling a region with a color and then filling the same point with the same color produces a canvas pixel-for-pixel identical to the result of the first fill.
10. IF any automated test fails, THEN THE test runner SHALL report the failing test name and the failure reason, and exit with a non-zero status.
