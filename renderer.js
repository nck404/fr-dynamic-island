const island = document.getElementById('dynamic-island');
const body = document.body;

// Collapsed elements
const mainStatus = document.getElementById('main-status');
const miniCpu = document.getElementById('mini-cpu');
const miniRam = document.getElementById('mini-ram');

// Expanded elements
const albumImg = document.getElementById('album-img');
const albumPlaceholder = document.getElementById('album-placeholder');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const progressFill = document.getElementById('progress-fill');
const sourceName = document.getElementById('source-name');

// Detailed Stats Elements
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

  // Update System Stats
  if (system) {
    if (miniCpu) miniCpu.textContent = `${system.cpu}%`;
    if (miniRam) miniRam.textContent = `${system.ram}%`;
    
    // Detailed Expanded Stats
    if (cpuLoadDetail) cpuLoadDetail.textContent = `${system.cpu}%`;
    if (cpuNameDetail) cpuNameDetail.textContent = system.cpuName || 'PROCESSOR';
    
    if (ramUsageDetail) ramUsageDetail.textContent = `${system.ram}%`;
    if (ramInfoDetail) ramInfoDetail.textContent = `${system.ramUsed} / ${system.ramTotal} GB`;
    
    if (tempDetail) tempDetail.textContent = `${system.temp}°C`;
  }

  // Update Media
  if (media) {
    const isPlaying = media.playbackStatus === 'Playing';
    
    // Toggle Playing class for animations
    if (isPlaying) {
      body.classList.add('playing');
    } else {
      body.classList.remove('playing');
    }

    // Collapsed Title
    mainStatus.textContent = `${media.title} • ${media.artist}`;
    
    // Expanded Metadata
    trackTitle.textContent = media.title;
    trackArtist.textContent = media.artist;
    sourceName.textContent = media.sourceApp || 'System Media';

    // Thumbnail
    if (media.thumbnail) {
      albumImg.src = media.thumbnail;
      albumImg.style.display = 'block';
      albumPlaceholder.style.display = 'none';
    } else {
      albumImg.style.display = 'none';
      albumPlaceholder.style.display = 'flex';
    }

    // Progress
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

// Expand / Collapse
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

// Tab Switching
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

// Glow Intensity
glowSlider.addEventListener('input', (e) => {
    const val = e.target.value / 100;
    document.documentElement.style.setProperty('--glow-intensity', val);
    localStorage.setItem('island-glow', val);
});

// Load Saved Preferences
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

    // Initialize Gradient toggle
    const gradientBtn = document.getElementById('toggle-gradient');
    // Default to true if not set
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

    // Initialize Startup toggle
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

    // Contact link - open in browser
    if (contactLink) {
        contactLink.addEventListener('click', (e) => {
            console.log('Contact button clicked, opening URL...');
            window.api.openExternal('https://e-z.bio/necakco');
        });
    }
});

// listeners
window.api.onMediaUpdate((data) => {
  updateUI(data);
});

window.api.onCollapse(() => {
  collapse();
});

// Scroll Indicators Logic
const expandedBody = document.getElementById('expanded-body');
const scrollUp = document.getElementById('scroll-up');
const scrollDown = document.getElementById('scroll-down');


function updateScrollIndicators() {
    if (!expandedBody) return;
    
    // Explicitly hide on Music tab (Now Playing)
    const musicTab = document.getElementById('music-tab');
    if (musicTab && musicTab.classList.contains('active')) {
        scrollUp.classList.remove('visible');
        scrollDown.classList.remove('visible');
        return;
    }
    
    // Recalculate dimensions
    const scrollTop = expandedBody.scrollTop;
    const scrollHeight = expandedBody.scrollHeight;
    const clientHeight = expandedBody.clientHeight;
    
    // Only show if content overflows
    if (scrollHeight <= clientHeight) {
        scrollUp.classList.remove('visible');
        scrollDown.classList.remove('visible');
        return;
    }

    const threshold = 5;

    // Show UP if scrolled down
    if (scrollTop > threshold) {
        scrollUp.classList.add('visible');
    } else {
        scrollUp.classList.remove('visible');
    }

    // Show DOWN if not at bottom
    // scrollHeight - clientHeight = maxScrollTop
    if (scrollTop + clientHeight < scrollHeight - threshold) {
        scrollDown.classList.add('visible');
    } else {
        scrollDown.classList.remove('visible');
    }
}

// Attach listeners
if (expandedBody) {
    expandedBody.addEventListener('scroll', updateScrollIndicators);
    
    // Check initially and on tab switch
    window.addEventListener('resize', updateScrollIndicators);
}

// Click handlers
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

// Hook into tab switching to re-check scroll state
tabBtns.forEach(btn => {
    btn.addEventListener('mouseup', () => {
        // slight delay to allow layout update
        setTimeout(updateScrollIndicators, 50);
    });
});

// Initial check
setTimeout(updateScrollIndicators, 200);
