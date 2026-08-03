// Hidaya AI mosque display — standalone static page, no backend.
// Setup data (parsed timetable + mosque details) is kept in this browser's
// localStorage, since a mosque TV is expected to run one browser tab
// continuously rather than needing multi-device sync.

const STORAGE_KEY = 'hidaya_display_config_v1';
const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const COUNTDOWN_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Clean line-style icons (matching the phone app's Material-style icon set)
// instead of colorful emoji — single-color, inherits currentColor so they
// pick up the muted/highlighted text color automatically per row.
const SVG_TWILIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v3"/><path d="M5.6 8.6l1.4 1.4"/><path d="M18.4 8.6l-1.4 1.4"/><path d="M3 13h1"/><path d="M20 13h1"/><path d="M6 13a6 6 0 0 1 12 0"/><path d="M3 17h18"/><path d="M8 21l-2-2"/><path d="M16 21l2-2"/></svg>';
const SVG_SUNRISE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="4"/><path d="M12 2v4"/><path d="M9 5l3-3 3 3"/><path d="M3 21h18"/></svg>';
const SVG_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.2 4.2l2.1 2.1"/><path d="M17.7 17.7l2.1 2.1"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M4.2 19.8l2.1-2.1"/><path d="M17.7 6.3l2.1-2.1"/></svg>';
const SVG_CLOUD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 19a4 4 0 1 1 .9-7.9 5 5 0 0 1 9.5 1.9A3.6 3.6 0 0 1 16.5 19H6.5Z"/></svg>';
const SVG_MOON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 1 0 10.5 10.5Z"/></svg>';
const SVG_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.3 2.3 4.7-5.1"/></svg>';

const PRAYER_ICONS = { Fajr: SVG_TWILIGHT, Sunrise: SVG_SUNRISE, Dhuhr: SVG_SUN, Asr: SVG_CLOUD, Maghrib: SVG_TWILIGHT, Isha: SVG_MOON };

const setupView = document.getElementById('setupView');
const displayView = document.getElementById('displayView');
const fileInput = document.getElementById('fileInput');
const fileStatus = document.getElementById('fileStatus');
const mosqueNameInput = document.getElementById('mosqueNameInput');
const swishInput = document.getElementById('swishInput');
const accountInput = document.getElementById('accountInput');
const announcementInput = document.getElementById('announcementInput');
const startBtn = document.getElementById('startBtn');
const setupError = document.getElementById('setupError');
const settingsBtn = document.getElementById('settingsBtn');
const logoInput = document.getElementById('logoInput');
const logoPreviewWrap = document.getElementById('logoPreviewWrap');
const logoPreview = document.getElementById('logoPreview');
const logoRemoveBtn = document.getElementById('logoRemoveBtn');
const useLocationBtn = document.getElementById('useLocationBtn');
const locationStatus = document.getElementById('locationStatus');
const autoMethodWrap = document.getElementById('autoMethodWrap');
const calcMethodSelect = document.getElementById('calcMethodSelect');
const languageSelect = document.getElementById('languageSelect');

let parsedTimetable = null; // { months: { '1': { '1': {Fajr:..,...}, ... }, ... } }
let logoDataUrl = null; // small resized data: URL, or null for the default mosque icon
let autoLocation = null; // { lat, lng } for mosques without a timetable file
let sourceMode = null; // 'file' | 'auto' — whichever the admin used most recently

// ── Automatic location-based prayer times ───────────────────────────────
// For mosques that haven't shared a printed timetable — calculates times
// from this screen's own GPS location instead of reading an uploaded file.

useLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'This browser does not support location detection.';
    locationStatus.className = 'file-status err';
    return;
  }
  locationStatus.textContent = 'Detecting location…';
  locationStatus.className = 'file-status';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      autoLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      sourceMode = 'auto';
      locationStatus.textContent = `Location detected (±${Math.round(pos.coords.accuracy)}m). Prayer times will be calculated automatically.`;
      locationStatus.className = 'file-status ok';
      autoMethodWrap.classList.remove('hidden');
      updateStartButton();
    },
    (err) => {
      autoLocation = null;
      locationStatus.textContent = 'Could not get location — check the browser has location permission for this page.';
      locationStatus.className = 'file-status err';
      updateStartButton();
    },
    { enableHighAccuracy: false, timeout: 15000 }
  );
});

// Resizes/re-encodes the uploaded image down to a small square so it fits
// comfortably in localStorage (a raw phone photo can be several MB, which
// risks hitting the ~5-10MB localStorage quota) and loads instantly on the
// TV regardless of the original file size.
function resizeImageToDataUrl(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showLogoPreview(dataUrl) {
  if (dataUrl) {
    logoPreview.src = dataUrl;
    logoPreviewWrap.classList.remove('hidden');
  } else {
    logoPreviewWrap.classList.add('hidden');
  }
}

logoInput.addEventListener('change', async () => {
  const file = logoInput.files[0];
  if (!file) return;
  try {
    logoDataUrl = await resizeImageToDataUrl(file, 200);
    showLogoPreview(logoDataUrl);
  } catch (e) {
    logoDataUrl = null;
    showLogoPreview(null);
  }
});

logoRemoveBtn.addEventListener('click', () => {
  logoDataUrl = null;
  logoInput.value = '';
  showLogoPreview(null);
});

// ── Setup view wiring ───────────────────────────────────────────────────

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result);
      if (json.type !== 'fullYear' || !json.months) {
        throw new Error('not a full-year timetable file');
      }
      parsedTimetable = json;
      sourceMode = 'file';
      const monthCount = Object.keys(json.months).length;
      fileStatus.textContent = `Loaded ${monthCount} month(s) of prayer times.`;
      fileStatus.className = 'file-status ok';
      if (json.mosque && !mosqueNameInput.value.trim()) {
        mosqueNameInput.value = json.mosque;
      }
      updateStartButton();
    } catch (e) {
      parsedTimetable = null;
      fileStatus.textContent = 'Could not read that file — make sure it is a "Share Full Year Timetable" export from the Hidaya AI app.';
      fileStatus.className = 'file-status err';
      updateStartButton();
    }
  };
  reader.readAsText(file);
});

function updateStartButton() {
  const hasSource = (sourceMode === 'file' && parsedTimetable) || (sourceMode === 'auto' && autoLocation);
  startBtn.disabled = !(hasSource && mosqueNameInput.value.trim());
}
mosqueNameInput.addEventListener('input', updateStartButton);

startBtn.addEventListener('click', () => {
  const hasSource = (sourceMode === 'file' && parsedTimetable) || (sourceMode === 'auto' && autoLocation);
  if (!hasSource) return;
  const config = {
    mode: sourceMode,
    timetable: sourceMode === 'file' ? parsedTimetable : null,
    autoLocation: sourceMode === 'auto' ? autoLocation : null,
    calcMethod: calcMethodSelect.value,
    language: languageSelect.value,
    mosqueName: mosqueNameInput.value.trim(),
    swish: swishInput.value.trim(),
    account: accountInput.value.trim(),
    announcement: announcementInput.value.trim(),
    logo: logoDataUrl,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    // Quota exceeded (rare, only with an unusually large logo after resize)
    // — fall back to starting without the logo rather than failing silently.
    config.logo = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setupError.textContent = 'Logo was too large to save — display started without it.';
  }
  if (!setupError.textContent) setupError.textContent = '';
  startDisplay(config);
});

settingsBtn.addEventListener('click', () => {
  stopClocks();
  displayView.classList.add('hidden');
  setupView.classList.remove('hidden');
  document.body.classList.remove('mode-display');
  const saved = loadConfig();
  if (saved) {
    mosqueNameInput.value = saved.mosqueName || '';
    swishInput.value = saved.swish || '';
    accountInput.value = saved.account || '';
    announcementInput.value = saved.announcement || '';
    logoDataUrl = saved.logo || null;
    showLogoPreview(logoDataUrl);
    calcMethodSelect.value = saved.calcMethod || 'mwl';
    languageSelect.value = saved.language || 'en';
    sourceMode = saved.mode || (saved.timetable ? 'file' : null);

    if (sourceMode === 'auto' && saved.autoLocation) {
      autoLocation = saved.autoLocation;
      autoMethodWrap.classList.remove('hidden');
      locationStatus.textContent = 'Using previously detected location — click the button again to refresh it.';
      locationStatus.className = 'file-status ok';
    } else if (saved.timetable) {
      parsedTimetable = saved.timetable;
      sourceMode = 'file';
      fileStatus.textContent = 'Using previously loaded timetable — choose a new file to replace it.';
      fileStatus.className = 'file-status ok';
    }
    updateStartButton();
  }
});

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

// ── Display view ─────────────────────────────────────────────────────────

let clockTimer = null;
let verseTimer = null;
let tickerTimer = null;

function stopClocks() {
  if (clockTimer) clearInterval(clockTimer);
  if (verseTimer) clearInterval(verseTimer);
  if (tickerTimer) clearInterval(tickerTimer);
  clockTimer = null;
  verseTimer = null;
  tickerTimer = null;
}

function timesForDate(config, date) {
  if (config.mode === 'auto' && config.autoLocation) {
    const tzOffsetHours = -date.getTimezoneOffset() / 60;
    return calculatePrayerTimes(date, config.autoLocation.lat, config.autoLocation.lng, tzOffsetHours, config.calcMethod);
  }
  const month = String(date.getMonth() + 1);
  const day = String(date.getDate());
  const monthData = config.timetable && config.timetable.months[month];
  return monthData ? monthData[day] : null;
}

function startDisplay(config) {
  setupView.classList.add('hidden');
  displayView.classList.remove('hidden');
  document.body.classList.add('mode-display');

  document.getElementById('mosqueNameOut').textContent = config.mosqueName || 'Hidaya AI';

  const logoImg = document.getElementById('mosqueLogoOut');
  const iconSpan = document.getElementById('mosqueIconOut');
  if (config.logo) {
    logoImg.src = config.logo;
    logoImg.classList.remove('hidden');
    iconSpan.classList.add('hidden');
  } else {
    logoImg.classList.add('hidden');
    iconSpan.classList.remove('hidden');
  }

  const lang = config.language || 'en';
  document.getElementById('verseLabelOut').textContent = t(lang, 'ayahOfDay');

  // Build the rotating ticker messages — one full sentence shown at a time
  // (fades in, holds, fades out, then the next one appears) rather than a
  // single long line scrolling continuously, so each message is easy to
  // read in one glance. The Hidaya AI branding line always plays last.
  const tickerParts = [];
  if (config.announcement) tickerParts.push(config.announcement);
  if (config.swish) tickerParts.push(`${t(lang, 'support')} ${config.mosqueName || ''} — Swish: ${config.swish}`);
  if (config.account) tickerParts.push(`${t(lang, 'bankAccount')}: ${config.account}`);
  tickerParts.push(`BRAND:${t(lang, 'poweredBy')}`);
  startTicker(tickerParts);

  renderPrayerRow(config);
  tickClock(config);
  clockTimer = setInterval(() => tickClock(config), 1000);

  showVerse(0);
  let verseIndex = 0;
  verseTimer = setInterval(() => {
    verseIndex = (verseIndex + 1) % DISPLAY_VERSES.length;
    showVerse(verseIndex);
  }, 25000);
}

// Shows the ticker messages one at a time — fades in, holds for a few
// seconds, fades out, then the next message takes its place — instead of
// one long line scrolling continuously, so each sentence is easy to read
// at a glance from across the room.
function startTicker(messages) {
  const tickerEl = document.getElementById('tickerOut');
  let index = 0;
  const HOLD_MS = 6000;
  const FADE_MS = 500;

  function showNext() {
    tickerEl.style.opacity = 0;
    setTimeout(() => {
      const msg = messages[index];
      if (msg.startsWith('BRAND:')) {
        tickerEl.innerHTML = `<span class="brand-line">${msg.slice(6)} <span class="brand-logo-text"><span class="brand-hidaya">HIDAYA</span> <span class="brand-ai">AI</span></span></span>`;
      } else {
        tickerEl.textContent = msg;
      }
      tickerEl.style.opacity = 1;
      index = (index + 1) % messages.length;
    }, FADE_MS);
  }

  showNext();
  tickerTimer = setInterval(showNext, HOLD_MS);
}

function showVerse(index) {
  const v = DISPLAY_VERSES[index];
  const panel = document.getElementById('versePanel');
  panel.style.opacity = 0;
  setTimeout(() => {
    document.getElementById('verseArabic').textContent = v.arabic;
    document.getElementById('verseTranslation').textContent = v.translation;
    panel.style.opacity = 1;
  }, 400);
}

function renderPrayerRow(config) {
  const now = new Date();
  const todayTimes = timesForDate(config, now);
  const listCard = document.getElementById('listCard');
  const nextCard = document.getElementById('nextCard');
  listCard.innerHTML = '';

  if (!todayTimes) {
    listCard.innerHTML = `<div class="list-row">${t(config.language || 'en', 'noTimesToday')}</div>`;
    nextCard.innerHTML = '';
    return;
  }

  for (const name of PRAYER_ORDER) {
    const time = todayTimes[name];
    if (!time) continue;
    const passed = timeHasPassed(time, now);
    const row = document.createElement('div');
    row.className = 'list-row';
    row.id = `lrow-${name}`;
    row.innerHTML = `
      <div class="row-left"><span class="row-icon">${PRAYER_ICONS[name] || ''}</span><span>${name}</span></div>
      <div class="row-time">${passed ? `<span class="row-check">${SVG_CHECK}</span>` : ''}${time}</div>
    `;
    listCard.appendChild(row);
  }
}

function timeHasPassed(hhmm, now) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  return t <= now;
}

// Builds {name, date} entries for every countdown-eligible prayer today
// AND tomorrow (handles month/year rollover), so a countdown always has a
// next target even right after Isha.
function upcomingPrayerTargets(config, now) {
  const targets = [];
  for (const offset of [0, 1]) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const times = timesForDate(config, d);
    if (!times) continue;
    for (const name of COUNTDOWN_PRAYERS) {
      const t = times[name];
      if (!t) continue;
      const [h, m] = t.split(':').map(Number);
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0);
      targets.push({ name, target });
    }
  }
  return targets.sort((a, b) => a.target - b.target);
}

function formatCountdown(ms, lang) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const inWord = t(lang, 'inPrefix');
  const prefix = inWord ? `${inWord} ` : '';
  if (h > 0) return `${prefix}${h}${t(lang, 'hours')} ${m}${t(lang, 'minutes')}`;
  return `${prefix}${m}${t(lang, 'minutes')}`;
}

function tickClock(config) {
  const now = new Date();

  document.getElementById('clockOut').textContent = now.toLocaleTimeString([], { hour12: false });
  document.getElementById('gregorianOut').textContent = now.toLocaleDateString([], {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  document.getElementById('hijriOut').textContent = toHijri(now);

  // Re-render the row once per minute (covers day rollover + passed-prayer
  // checkmarks) rather than every second — the countdown is what needs to
  // update every tick.
  if (now.getSeconds() === 0 || !document.getElementById('listCard').children.length) {
    renderPrayerRow(config);
  }

  document.querySelectorAll('.list-row').forEach((r) => r.classList.remove('current'));
  const targets = upcomingPrayerTargets(config, now);
  const next = targets.find((t) => t.target > now);
  if (next) {
    const row = document.getElementById(`lrow-${next.name}`);
    if (row) row.classList.add('current');

    const lang = config.language || 'en';
    const nextCard = document.getElementById('nextCard');
    nextCard.innerHTML = `
      <div>
        <div class="next-label">${t(lang, 'nextPrayer')}</div>
        <div class="next-name">${next.name}</div>
        <div class="next-countdown">${formatCountdown(next.target - now, lang)}</div>
      </div>
      <div class="next-right">
        <div class="next-icon">${PRAYER_ICONS[next.name] || ''}</div>
        <div class="next-time">${next.target.toTimeString().slice(0, 5)}</div>
      </div>
    `;
  }
}

// ── Boot ────────────────────────────────────────────────────────────────

(function boot() {
  const saved = loadConfig();
  if (saved && (saved.timetable || (saved.mode === 'auto' && saved.autoLocation))) {
    startDisplay(saved);
  }
})();
