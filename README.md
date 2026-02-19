# Frenda Dynamic Island

A Windows desktop application built with Electron that brings a Dynamic Island-style overlay to your PC. It sits at the top center of your screen, displaying real-time media playback information and system statistics in a sleek, minimal floating widget.

## Features

- Floating overlay anchored to the top center of the primary display
- Displays currently playing media title and artist from any Windows media source via SMTC (System Media Transport Controls)
- Album artwork thumbnail support
- Playback progress bar
- Real-time system stats: CPU load, RAM usage, and CPU temperature
- Expand on click to reveal full media details and system dashboard
- Customizable accent color with preset swatches and a custom color picker
- Adjustable glow intensity
- Optional animated gradient line
- Toggle launch at Windows startup
- System tray icon for quick access and quit

## Requirements

- Windows 10 or Windows 11 (x64)
- Node.js 18 or later
- pnpm or npm

## Installation

```bash
pnpm install
```

## Running in Development

```bash
pnpm start
```

## Building

Build a portable directory:

```bash
pnpm run build:dir
```

Build with electron-packager:

```bash
pnpm run build:packager
```

## Project Structure

```
main.js          - Electron main process, window management, IPC handlers
preload.js       - Context bridge exposing safe IPC APIs to the renderer
renderer.js      - UI logic, media and system stat rendering
smtc-worker.js   - Worker thread polling SMTC and system information
index.html       - Application markup
styles.css       - Application styles
icon.ico         - Application icon
```

## Dependencies

- `@coooookies/windows-smtc-monitor` - Native Windows SMTC session monitoring
- `systeminformation` - Cross-platform system hardware statistics
- `electron` - Desktop application framework

## License

MIT
