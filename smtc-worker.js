const { parentPort } = require('worker_threads');
const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor');
const si = require('systeminformation');

let monitor = null;
let cachedCpuName = null;

const getCpuName = async () => {
  if (cachedCpuName) return cachedCpuName;
  try {
    const cpu = await si.cpu();
    cachedCpuName = cpu.brand || 'Processor';
    return cachedCpuName;
  } catch {
    return 'Processor';
  }
};

try {
  monitor = new SMTCMonitor();

  const getMediaInfo = () => {
    const session = SMTCMonitor.getCurrentMediaSession();
    if (session) {
      let thumbnail = null;
      if (session.media.thumbnail && session.media.thumbnail.length > 0) {
        thumbnail = `data:image/png;base64,${session.media.thumbnail.toString('base64')}`;
      }

      return {
        title: session.media.title,
        artist: session.media.artist,
        playbackStatus: session.playback.playbackStatus === 4 ? 'Playing' : 'Paused',
        sourceApp: session.sourceAppId,
        position: session.timeline ? session.timeline.position : 0,
        duration: session.timeline ? session.timeline.duration : 0,
        thumbnail: thumbnail
      };
    }
    return null;
  };

  const getSystemInfo = async () => {
    try {
      const [cpuLoad, mem, temp, cpuName] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature(),
        getCpuName()
      ]);
      
      let currentTemp = temp.main || temp.max || (temp.cores && temp.cores.length > 0 ? Math.max(...temp.cores) : 0);

      return {
        cpu: Math.round(cpuLoad.currentLoad),
        cpuName: cpuName,
        ram: Math.round((mem.active / mem.total) * 100),
        ramUsed: (mem.active / (1024*1024*1024)).toFixed(1),
        ramTotal: (mem.total / (1024*1024*1024)).toFixed(0),
        temp: currentTemp > 0 ? Math.round(currentTemp) : '--'
      };
    } catch (e) {
      return { cpu: 0, ram: 0, temp: '--' };
    }
  };

  const sendFullUpdate = async () => {
    const media = getMediaInfo();
    const system = await getSystemInfo();
    parentPort.postMessage({ type: 'update', media, system });
  };

  setInterval(async () => {
    await sendFullUpdate();
  }, 3000);

  monitor.on('session-media-changed', () => sendFullUpdate());
  monitor.on('session-playback-changed', () => sendFullUpdate());
  monitor.on('current-session-changed', () => sendFullUpdate());

} catch (err) {
  parentPort.postMessage({ type: 'error', message: err.message });
}

process.on('exit', () => {
  if (monitor) monitor.destroy();
});
