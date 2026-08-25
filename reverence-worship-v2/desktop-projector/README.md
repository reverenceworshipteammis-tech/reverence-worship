# Reverence Worship Desktop Projector

This optional desktop shell opens the existing Reverence Worship application in an isolated Electron window and gives Projection Studio native monitor control.

## Run locally

1. Install the companion once with `npm run desktop:install`.
2. Launch the complete local application with `npm run desktop:dev`.

The launcher starts Next.js automatically when needed. If the web server is already running, you can still launch only the shell with `npm run desktop`.

The launcher also clears `ELECTRON_RUN_AS_NODE` before startup. This prevents developer tooling or inherited Windows environments from accidentally running Electron as a command-line Node process instead of opening the native shell.

The default application URL is `http://localhost:3000/admin/music`. To use a deployed installation:

```powershell
$env:REVERENCE_APP_URL = "https://your-domain.example/admin/music"
npm run desktop
```

Connect HDMI and set Windows display mode to **Extend**. In Music → Playlist → Projection, click **Detect displays**, choose the projector, then **Start projection**.

Unlike the browser fallback, the desktop projector removes the title bar and address bar automatically. The desktop shell uses context isolation, renderer sandboxing, disabled Node integration, validated IPC calls, and a dedicated persistent browser partition. The projector output is frameless, fullscreen, black-backed, and always on top.
