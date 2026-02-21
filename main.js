const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  shell,
} = require("electron");
const path = require("path");
const { exec, spawn } = require("child_process");

app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("enable-fast-unload");

let mainWindow;
let tray;
let isExpanded = false;
let currentMediaInfo = null;

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const collapsedWidth = 300;
  const collapsedHeight = 100;

  console.log("Creating window...");
  mainWindow = new BrowserWindow({
    width: collapsedWidth,
    height: collapsedHeight,
    x: Math.round((screenWidth - collapsedWidth) / 2),
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    paintWhenInitiallyHidden: false,
    icon: path.join(__dirname, "icon.png"),
    show: false, // Don't show initially
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: true, // Enable throttling when hidden
      enablePreferredSizeMode: true,
      offscreen: false,
    },
  });

  mainWindow.loadFile("index.html");

  // Limit frame rate to reduce GPU/CPU usage
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.executeJavaScript(`
      // Limit FPS to 30 to reduce resource usage
      let lastTime = performance.now();
      let fpsLimit = 30;
      let frameInterval = 1000 / fpsLimit;

      function throttleFPS() {
        requestAnimationFrame((currentTime) => {
          const elapsed = currentTime - lastTime;

          if (elapsed > frameInterval) {
            lastTime = currentTime - (elapsed % frameInterval);
          }
          throttleFPS();
        });
      }
      throttleFPS();
    `);
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setMenu(null);

  mainWindow.on("blur", () => {
    if (isExpanded) {
      isExpanded = false;
      mainWindow.webContents.send("collapse");
      resizeWindow(false);
    }
  });
}

function resizeWindow(expanded) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const targetWidth = expanded ? 480 : 300;
  const targetHeight = expanded ? 260 : 80;
  const targetX = Math.round((screenWidth - targetWidth) / 2);
  const targetY = 0;

  mainWindow.setBounds(
    {
      x: targetX,
      y: targetY,
      width: targetWidth,
      height: targetHeight,
    },
    false,
  );
}

const { Worker } = require("worker_threads");

let smtcWorker = null;

function startMediaMonitoring() {
  if (smtcWorker) smtcWorker.terminate();

  smtcWorker = new Worker(path.join(__dirname, "smtc-worker.js"));

  smtcWorker.on("message", (msg) => {
    if (msg.type === "update") {
      currentMediaInfo = msg.media || null;
      updateTray(currentMediaInfo);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("media-update", msg);
      }
    } else if (msg.type === "error") {
      console.error("SMTC Worker Error:", msg.message);
    }
  });

  smtcWorker.on("error", (err) => {
    console.error("SMTC Worker Thread Error:", err);
  });
}

function controlMedia(action) {
  const commands = {
    play: `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$manager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]::RequestAsync().GetAwaiter().GetResult()
$session = $manager.GetCurrentSession()
if ($session) { $null = $session.TryPlayAsync().GetAwaiter().GetResult() }`,
    pause: `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$manager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]::RequestAsync().GetAwaiter().GetResult()
$session = $manager.GetCurrentSession()
if ($session) { $null = $session.TryPauseAsync().GetAwaiter().GetResult() }`,
    next: `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$manager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]::RequestAsync().GetAwaiter().GetResult()
$session = $manager.GetCurrentSession()
if ($session) { $null = $session.TrySkipNextAsync().GetAwaiter().GetResult() }`,
    previous: `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$manager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]::RequestAsync().GetAwaiter().GetResult()
$session = $manager.GetCurrentSession()
if ($session) { $null = $session.TrySkipPreviousAsync().GetAwaiter().GetResult() }`,
  };

  return new Promise((resolve) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        commands[action] || "",
      ],
      { windowsHide: true },
    );

    child.on("close", () => resolve(true));
    child.on("error", () => resolve(false));
    setTimeout(() => {
      if (!child.killed) child.kill();
      resolve(false);
    }, 2000);
  });
}

function buildTrayMenu(mediaInfo) {
  const nowPlaying = mediaInfo
    ? `${mediaInfo.title} - ${mediaInfo.artist}`
    : "Nothing playing";

  return Menu.buildFromTemplate([
    { label: nowPlaying, enabled: false },
    { type: "separator" },
    { label: "Previous", click: () => controlMedia("previous") },
    {
      label: "Play / Pause",
      click: () =>
        controlMedia(
          mediaInfo && mediaInfo.playbackStatus === "Playing"
            ? "pause"
            : "play",
        ),
    },
    { label: "Next", click: () => controlMedia("next") },
    { type: "separator" },
    {
      label: "Show",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "icon.ico"));
  tray = new Tray(icon);
  tray.setToolTip("Frenda Dynamic Island");
  tray.setContextMenu(buildTrayMenu(null));

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function updateTray(mediaInfo) {
  if (tray) {
    const tooltip = mediaInfo
      ? `${mediaInfo.title} - ${mediaInfo.artist}`
      : "Frenda Dynamic Island";
    tray.setToolTip(tooltip);
    tray.setContextMenu(buildTrayMenu(mediaInfo));
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startMediaMonitoring();
});

ipcMain.on("toggle-expand", (event, expanded) => {
  isExpanded = expanded;
  resizeWindow(expanded);
});

ipcMain.on("media-control", async (event, action) => {
  await controlMedia(action);
});

ipcMain.handle("get-startup", () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.on("toggle-startup", (event, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath("exe"),
  });
});

ipcMain.on("close-app", () => {
  app.quit();
});

ipcMain.on("open-external", (event, url) => {
  shell.openExternal(url);
});

app.on("window-all-closed", () => {
  if (smtcWorker) smtcWorker.terminate();
  app.quit();
});
