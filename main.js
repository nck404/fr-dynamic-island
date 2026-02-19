const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');

app.disableHardwareAcceleration();

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

let mainWindow;
let tray;
let isExpanded = false;
let currentMediaInfo = null;

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const collapsedWidth = 300;
  const collapsedHeight = 100;

  console.log('Creating window...');
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
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  await mainWindow.webContents.session.clearCache();
  
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setMenu(null);

  mainWindow.loadFile('index.html');

  mainWindow.on('blur', () => {
    if (isExpanded) {
      isExpanded = false;
      mainWindow.webContents.send('collapse');
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

  mainWindow.setBounds({
    x: targetX,
    y: targetY,
    width: targetWidth,
    height: targetHeight
  }, true);
}

const { Worker } = require('worker_threads');

let smtcWorker = null;

function startMediaMonitoring() {
  if (smtcWorker) smtcWorker.terminate();

  smtcWorker = new Worker(path.join(__dirname, 'smtc-worker.js'));

  smtcWorker.on('message', (msg) => {
    if (msg.type === 'update') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-update', msg);
      }
    } else if (msg.type === 'error') {
      console.error('SMTC Worker Error:', msg.message);
    }
  });

  smtcWorker.on('error', (err) => {
    console.error('SMTC Worker Thread Error:', err);
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
if ($session) { $null = $session.TrySkipPreviousAsync().GetAwaiter().GetResult() }`
  };

  return new Promise((resolve) => {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', commands[action] || ''
    ], { windowsHide: true });

    child.on('close', () => resolve(true));
    child.on('error', () => resolve(false));
    setTimeout(() => { child.kill(); resolve(false); }, 5000);
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
  tray = new Tray(icon);
  tray.setToolTip('Dynamic Island Music');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startMediaMonitoring();
});

ipcMain.on('toggle-expand', (event, expanded) => {
  isExpanded = expanded;
  resizeWindow(expanded);
});

ipcMain.on('media-control', async (event, action) => {
  await controlMedia(action);
});

ipcMain.handle('get-startup', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.on('toggle-startup', (event, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath('exe')
  });
});

ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

app.on('window-all-closed', () => {
  if (smtcWorker) smtcWorker.terminate();
  app.quit();
});
