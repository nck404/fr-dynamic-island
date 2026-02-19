# Changelog

All notable changes to Frenda Dynamic Island are documented in this file.

---

## [1.0.0] - 2025-02-19

### Added

- Initial release of Frenda Dynamic Island for Windows.
- Floating overlay widget anchored to the top center of the primary display.
- Real-time media playback display via Windows SMTC (System Media Transport Controls).
  - Track title and artist name.
  - Album artwork thumbnail.
  - Playback progress bar.
  - Source application name.
- Real-time system statistics dashboard.
  - CPU load percentage and processor name.
  - RAM usage percentage and used/total GB.
  - CPU temperature in Celsius.
- Expand on click to reveal full media details and system stats.
- Collapse on close button click or window blur.
- Tab navigation: Now Playing, Settings, Contact.
- Customizable accent color with five preset swatches and a custom color picker.
- Adjustable glow intensity via slider.
- Toggle animated gradient line.
- Toggle launch at Windows startup.
- System tray icon with Show and Quit options.
- Worker thread architecture for non-blocking SMTC and system info polling.
- Hardware acceleration disabled by default for improved transparency on Windows.
