# Main-process file paths must resolve relative to __dirname, not the source tree

In production, electron-vite bundles the main process into `out/main/` and packages it inside an asar archive. `__dirname` resolves to `out/main/` — the source tree (`src/main/`) does not exist. Any `readFileSync` or `join(__dirname, '../../src/...')` pattern will crash with ENOENT at launch.

The rule: static assets read by the main process must be copied into `out/main/` at build time (via the `copyPrompts` Rollup plugin in `electron.vite.config.ts`) and resolved with `join(__dirname, 'relative')`. For paths that differ between dev and production (e.g. app icon), guard with `app.isPackaged` and use `process.resourcesPath` for bundled resources.

## Rules

1. **Text/data assets** read by the main process: copy into `out/main/` at build time (via the `copyPrompts` Rollup plugin in `electron.vite.config.ts`) and resolve with `join(__dirname, 'relative')`.
2. **Native binaries and .node addons** (`ffmpeg-static`, `onnxruntime-node`, `better-sqlite3`): list in `asarUnpack` in `electron-builder.yml`. Electron rewrites `fs` calls transparently but NOT `child_process.spawn`. For spawned binaries, apply `path.replace('app.asar', 'app.asar.unpacked')` when `app.isPackaged` (see `resolveFFmpegBin()` in `audio-preprocessor.ts`).
3. **Dev-vs-production paths** (app icon, etc.): guard with `app.isPackaged` and use `process.resourcesPath` for bundled resources.
4. **Shell PATH**: when launched from Finder, `process.env.PATH` lacks `/opt/homebrew/bin`. Append common paths at startup when `app.isPackaged`.

## Considered Options

- **Inline assets at build time** — import text files as strings via Vite's `?raw` suffix. Works for small text but not for binary assets, and obscures the file structure.
- **Ship assets outside the asar** — add paths to electron-builder's `asarUnpack`. Necessary for native binaries that must be spawned or dlopen'd.
- **Copy to `out/main/` via build plugin and resolve from `__dirname`** — chosen for text assets. Explicit, auditable, and the asar remains self-contained.
