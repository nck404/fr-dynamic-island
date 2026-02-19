const island = document.getElementById('dynamic-island');
const body = document.body;

const mainStatus = document.getElementById('main-status');
const miniCpu = document.getElementById('mini-cpu');
const miniRam = document.getElementById('mini-ram');

const albumImg = document.getElementById('album-img');
const albumPlaceholder = document.getElementById('album-placeholder');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const progressFill = document.getElementById('progress-fill');
const sourceName = document.getElementById('source-name');

const cpuLoadDetail = document.getElementById('cpu-load-detail');
const cpuNameDetail = document.getElementById('cpu-name-detail');
const ramUsageDetail = document.getElementById('ram-usage-detail');
const ramInfoDetail = document.getElementById('ram-info-detail');
const tempDetail = document.getElementById('temp-detail');

const colorDots = document.querySelectorAll('.color-dot');
const customColorPicker = document.getElementById('custom-color-picker');
const glowSlider = document.getElementById('glow-slider');
const contactLink = document.getElementById('contact-link');

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function setAccentColor(color) {
  document.documentElement.style.setProperty('--accent-color', color);
  document.documentElement.style.setProperty('--accent-rgb', hexToRgb(color));
  localStorage.setItem('island-accent', color);
}

colorDots.forEach(dot => {
  dot.addEventListener('click', (e) => {
    e.stopPropagation();
    colorDots.forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    setAccentColor(dot.getAttribute('data-color'));
  });
});

if (customColorPicker) {
  customColorPicker.addEventListener('input', (e) => {
    colorDots.forEach(d => d.classList.remove('active'));
    setAccentColor(e.target.value);
  });
}

let isExpanded = false;
let currentMedia = null;
let updateThrottle = null;

function updateUI(data) {
  if (updateThrottle) return;
  updateThrottle = setTimeout(() => {
    updateThrottle = null;
  }, 500);

  const { media, system } = data;
  currentMedia = media;

  if (system) {
    if (miniCpu) miniCpu.textContent = `${system.cpu}%`;
    if (miniRam) miniRam.textContent = `${system.ram}%`;
    
    if (cpuLoadDetail) cpuLoadDetail.textContent = `${system.cpu}%`;
    if (cpuNameDetail) cpuNameDetail.textContent = system.cpuName || 'PROCESSOR';
    
    if (ramUsageDetail) ramUsageDetail.textContent = `${system.ram}%`;
    if (ramInfoDetail) ramInfoDetail.textContent = `${system.ramUsed} / ${system.ramTotal} GB`;
    
    if (tempDetail) tempDetail.textContent = `${system.temp}°C`;
  }

  if (media) {
    const isPlaying = media.playbackStatus === 'Playing';
    
    if (isPlaying) {
      body.classList.add('playing');
    } else {
      body.classList.remove('playing');
    }

    mainStatus.textContent = `${media.title} • ${media.artist}`;
    
    trackTitle.textContent = media.title;
    trackArtist.textContent = media.artist;
    sourceName.textContent = media.sourceApp || 'System Media';

    if (media.thumbnail) {
      albumImg.src = media.thumbnail;
      albumImg.style.display = 'block';
      albumPlaceholder.style.display = 'none';
    } else {
      albumImg.style.display = 'none';
      albumPlaceholder.style.display = 'flex';
    }

    if (media.duration > 0) {
      const per = (media.position / media.duration) * 100;
      progressFill.style.width = `${Math.min(per, 100)}%`;
    }
  } else {
    body.classList.remove('playing');
    mainStatus.textContent = 'Ready';
    trackTitle.textContent = 'Not Playing';
    trackArtist.textContent = '—';
    albumImg.style.display = 'none';
    albumPlaceholder.style.display = 'flex';
    progressFill.style.width = '0%';
  }
}

island.addEventListener('mousedown', (e) => {
  if (isExpanded) return;
  isExpanded = true;
  island.classList.remove('collapsed');
  island.classList.add('expanded');
  body.classList.add('expanded');
  window.api.toggleExpand(true);
});

document.getElementById('close-btn').addEventListener('mousedown', (e) => {
  e.stopPropagation();
  collapse();
});

function collapse() {
  isExpanded = false;
  island.classList.remove('expanded');
  island.classList.add('collapsed');
  body.classList.remove('expanded');
  window.api.toggleExpand(false);
}

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    const tabId = btn.getAttribute('data-tab');
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
  });
});

glowSlider.addEventListener('input', (e) => {
    const val = e.target.value / 100;
    document.documentElement.style.setProperty('--glow-intensity', val);
    localStorage.setItem('island-glow', val);
});

window.addEventListener('DOMContentLoaded', async () => {
    const savedColor = localStorage.getItem('island-accent');
    if (savedColor) {
        setAccentColor(savedColor);
        const savedDot = document.querySelector(`.color-dot[data-color="${savedColor}"]`);
        if (savedDot) savedDot.classList.add('active');
    }
    
    const savedGlow = localStorage.getItem('island-glow');
    if (savedGlow) {
        glowSlider.value = savedGlow * 100;
        document.documentElement.style.setProperty('--glow-intensity', savedGlow);
    }

    const gradientBtn = document.getElementById('toggle-gradient');
    const savedGradient = localStorage.getItem('island-gradient') !== 'false';
    
    function updateGradientUI(enabled) {
        gradientBtn.textContent = enabled ? 'Enabled' : 'Disabled';
        if (enabled) {
            gradientBtn.classList.add('active');
            island.classList.remove('no-gradient');
        } else {
            gradientBtn.classList.remove('active');
            island.classList.add('no-gradient');
        }
    }

    updateGradientUI(savedGradient);

    gradientBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const current = gradientBtn.textContent === 'Enabled';
        const next = !current;
        localStorage.setItem('island-gradient', next);
        updateGradientUI(next);
    });

    const startupBtn = document.getElementById('toggle-startup');
    const isStartup = await window.api.getStartup();
    startupBtn.textContent = isStartup ? 'Enabled' : 'Disabled';
    if (isStartup) startupBtn.classList.add('active');

    startupBtn.addEventListener('mousedown', async (e) => {
        e.stopPropagation();
        const current = startupBtn.textContent === 'Enabled';
        const next = !current;
        window.api.setStartup(next);
        startupBtn.textContent = next ? 'Enabled' : 'Disabled';
        if (next) startupBtn.classList.add('active');
        else startupBtn.classList.remove('active');
    });

    if (contactLink) {
        contactLink.addEventListener('click', (e) => {
            window.api.openExternal('https://e-z.bio/necakco');
        });
    }
});

window.api.onMediaUpdate((data) => {
  updateUI(data);
});

window.api.onCollapse(() => {
  collapse();
});

const expandedBody = document.getElementById('expanded-body');
const scrollUp = document.getElementById('scroll-up');
const scrollDown = document.getElementById('scroll-down');


function updateScrollIndicators() {
    if (!expandedBody) return;
    
    const musicTab = document.getElementById('music-tab');
    if (musicTab && musicTab.classList.contains('active')) {
        scrollUp.classList.remove('visible');
        scrollDown.classList.remove('visible');
        return;
    }
    
    const scrollTop = expandedBody.scrollTop;
    const scrollHeight = expandedBody.scrollHeight;
    const clientHeight = expandedBody.clientHeight;
    
    if (scrollHeight <= clientHeight) {
        scrollUp.classList.remove('visible');
        scrollDown.classList.remove('visible');
        return;
    }

    const threshold = 5;

    if (scrollTop > threshold) {
        scrollUp.classList.add('visible');
    } else {
        scrollUp.classList.remove('visible');
    }

    if (scrollTop + clientHeight < scrollHeight - threshold) {
        scrollDown.classList.add('visible');
    } else {
        scrollDown.classList.remove('visible');
    }
}

if (expandedBody) {
    expandedBody.addEventListener('scroll', updateScrollIndicators);
    window.addEventListener('resize', updateScrollIndicators);
}

if (scrollUp) {
    scrollUp.addEventListener('click', () => {
        expandedBody.scrollBy({ top: -100, behavior: 'smooth' });
    });
}

if (scrollDown) {
    scrollDown.addEventListener('click', () => {
        expandedBody.scrollBy({ top: 100, behavior: 'smooth' });
    });
}

tabBtns.forEach(btn => {
    btn.addEventListener('mouseup', () => {
        setTimeout(updateScrollIndicators, 50);
    });
});

setTimeout(updateScrollIndicators, 200);
