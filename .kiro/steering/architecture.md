# Architectural Steering Rules
1. **Strict Separation of Concerns:** The `/frontend` uses Vanilla HTML5, CSS3, and modular ES6 JavaScript (`type="module"`). Do not introduce heavy frontend frameworks.
2. **State-Driven & Event-Driven UI:** All hardware and OS transitions (`OFF`, `BOOTING`, `RUNNING`, `SHUTTING_DOWN`) must flow through `frontend/js/core/store.js` and `eventBus.js`. UI components must never mutate each other's DOM directly.
3. **Plugin Window Architecture:** Desktop applications (`notepadApp.js`, `paintApp.js`) must be decoupled modules managed via `windowManager.js` so new apps can be added without modifying existing app code.
4. **Trademark Compliance:** Do not use Microsoft trademarks ("Windows 95", "MS Paint", "Clippy"). Use "Chronos 95", "PixelPaint.exe", "NotePad.exe", and "Chippy".
5. **Backend Standards:** The `/backend` uses Python 3.11+ with FastAPI, Pydantic for strict schema validation, Hypothesis for Property-Based Testing (PBT), and Docker containerization.