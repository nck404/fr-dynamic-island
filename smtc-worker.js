const { parentPort } = require("worker_threads");
const { SMTCMonitor } = require("@coooookies/windows-smtc-monitor");
const si = require("systeminformation");

let monitor = null;
let cachedCpuName = null;
let lastSystemInfo = { cpu: 0, ram: 0, temp: "--" };
let systemStatsTimeout = null;
let isPlaying = false;

const getCpuName = async () => {
  if (cachedCpuName) return cachedCpuName;
  try {
    const cpu = await si.cpu();
    cachedCpuName = cpu.brand || "Processor";
    return cachedCpuName;
  } catch {
    return "Processor";
  }
};

// Disable temperature check to reduce CPU usage
const getTemperatureViaPowershell = () => {
  return Promise.resolve("--");
};

try {
  monitor = new SMTCMonitor();

  const getMediaInfo = () => {
    const session = SMTCMonitor.getCurrentMediaSession();
    if (session) {
      let thumbnail = null;
      if (session.media.thumbnail && session.media.thumbnail.length > 0) {
        thumbnail = `data:image/png;base64,${session.media.thumbnail.toString("base64")}`;
      }

      return {
        title: session.media.title,
        artist: session.media.artist,
        playbackStatus:
          session.playback.playbackStatus === 4 ? "Playing" : "Paused",
        sourceApp: session.sourceAppId,
        position: session.timeline ? session.timeline.position : 0,
        duration: session.timeline ? session.timeline.duration : 0,
        thumbnail: thumbnail,
      };
    }
    return null;
  };

  const getSystemInfo = async () => {
    try {
      const [cpuLoad, mem, cpuName] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        getCpuName(),
      ]);

      return {
        cpu: Math.round(cpuLoad.currentLoad),
        cpuName: cpuName,
        ram: Math.round((mem.active / mem.total) * 100),
        ramUsed: (mem.active / (1024 * 1024 * 1024)).toFixed(1),
        ramTotal: (mem.total / (1024 * 1024 * 1024)).toFixed(0),
        temp: "--",
      };
    } catch (e) {
      console.error("System info error:", e);
      return { cpu: 0, ram: 0, temp: "--" };
    }
  };

  const sendMediaUpdate = () => {
    const media = getMediaInfo();
    parentPort.postMessage({ type: "update", media, system: lastSystemInfo });
  };

  const updateSystemStats = async () => {
    try {
      lastSystemInfo = await getSystemInfo();
      sendMediaUpdate();
    } catch (e) {
      console.error("Error updating system stats:", e);
    }
  };

  // Initial update
  updateSystemStats();

  // Start with longer interval when idle
  let currentInterval = 10000; // 10 seconds default

  const scheduleNextUpdate = () => {
    if (systemStatsTimeout) clearTimeout(systemStatsTimeout);

    const media = getMediaInfo();
    const hasMedia = media !== null;
    const isPlaying = media && media.playbackStatus === "Playing";

    if (isPlaying) {
      // Fast update when actively playing music
      currentInterval = 2000;
    } else if (hasMedia) {
      // Medium update when paused
      currentInterval = 5000;
    } else {
      // Very slow update when idle/no media
      currentInterval = 30000;
    }

    isIdle = !isPlaying;

    systemStatsTimeout = setTimeout(() => {
      updateSystemStats();
      scheduleNextUpdate();
    }, currentInterval);
  };

  scheduleNextUpdate();

  // Debounce media updates to avoid spamming the main thread during rapid transitions
  let mediaUpdateTimeout = null;
  const debouncedMediaUpdate = () => {
    if (mediaUpdateTimeout) clearTimeout(mediaUpdateTimeout);
    mediaUpdateTimeout = setTimeout(() => {
      sendMediaUpdate();
      mediaUpdateTimeout = null;
    }, 150);
  };

  // Media events only trigger media info refresh, using cached system stats
  monitor.on("session-media-changed", debouncedMediaUpdate);
  monitor.on("session-playback-changed", debouncedMediaUpdate);
  monitor.on("current-session-changed", debouncedMediaUpdate);
} catch (err) {
  parentPort.postMessage({ type: "error", message: err.message });
}

process.on("exit", () => {
  if (monitor) monitor.destroy();
});
