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
const citySelect = document.getElementById('citySelect');
const weatherCitySelect = document.getElementById('weatherCitySelect');
const manualLatInput = document.getElementById('manualLatInput');
const manualLngInput = document.getElementById('manualLngInput');
const manualCoordBtn = document.getElementById('manualCoordBtn');
const themeSelect = document.getElementById('themeSelect');
const downloadOfflineBtn = document.getElementById('downloadOfflineBtn');
const offlineStatus = document.getElementById('offlineStatus');
const generateLinkBtn = document.getElementById('generateLinkBtn');
const tvLinkStatus = document.getElementById('tvLinkStatus');
const tvLinkResult = document.getElementById('tvLinkResult');
const tvLinkOut = document.getElementById('tvLinkOut');
const copyTvLinkBtn = document.getElementById('copyTvLinkBtn');
const qrImg = document.getElementById('qrImg');

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

// City picker and manual coordinates — work with zero internet/GPS on the
// display device itself, for mosques (common across Africa and other
// low-connectivity regions) where the TV/screen never has a connection.
// CITIES is defined in cities.js.
function populateCityOptions(selectEl) {
  for (const city of CITIES) {
    const opt = document.createElement('option');
    opt.value = `${city.lat},${city.lng}`;
    opt.textContent = city.name;
    selectEl.appendChild(opt);
  }
}
populateCityOptions(citySelect);
populateCityOptions(weatherCitySelect);

citySelect.addEventListener('change', () => {
  if (!citySelect.value) return;
  const [lat, lng] = citySelect.value.split(',').map(Number);
  autoLocation = { lat, lng };
  sourceMode = 'auto';
  locationStatus.textContent = `Using ${citySelect.options[citySelect.selectedIndex].text} coordinates — no GPS/internet needed on this screen.`;
  locationStatus.className = 'file-status ok';
  autoMethodWrap.classList.remove('hidden');
  updateStartButton();
});

manualCoordBtn.addEventListener('click', () => {
  const lat = parseFloat(manualLatInput.value);
  const lng = parseFloat(manualLngInput.value);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    locationStatus.textContent = 'Enter valid latitude (-90 to 90) and longitude (-180 to 180).';
    locationStatus.className = 'file-status err';
    return;
  }
  autoLocation = { lat, lng };
  sourceMode = 'auto';
  citySelect.value = '';
  locationStatus.textContent = `Using coordinates ${lat}, ${lng}.`;
  locationStatus.className = 'file-status ok';
  autoMethodWrap.classList.remove('hidden');
  updateStartButton();
});

// Live theme preview while setting up, matching whatever will actually be
// used once the display starts.
themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));

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

function hasValidSource() {
  return (sourceMode === 'file' && parsedTimetable) || (sourceMode === 'auto' && autoLocation);
}

function buildConfigFromForm() {
  return {
    mode: sourceMode,
    timetable: sourceMode === 'file' ? parsedTimetable : null,
    autoLocation: sourceMode === 'auto' ? autoLocation : null,
    calcMethod: calcMethodSelect.value,
    language: languageSelect.value,
    theme: themeSelect.value,
    weatherCity: weatherCitySelect.value
        ? { lat: parseFloat(weatherCitySelect.value.split(',')[0]), lng: parseFloat(weatherCitySelect.value.split(',')[1]) }
        : null,
    mosqueName: mosqueNameInput.value.trim(),
    swish: swishInput.value.trim(),
    account: accountInput.value.trim(),
    announcement: announcementInput.value.trim(),
    logo: logoDataUrl,
  };
}

startBtn.addEventListener('click', () => {
  if (!hasValidSource()) return;
  const config = buildConfigFromForm();
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
    themeSelect.value = saved.theme || 'teal';
    applyTheme(themeSelect.value);
    weatherCitySelect.value = saved.weatherCity ? `${saved.weatherCity.lat},${saved.weatherCity.lng}` : '';
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
let tickerCancel = null; // cancels the ticker's requestAnimationFrame loop
let weatherTimer = null;

function stopClocks() {
  if (clockTimer) clearInterval(clockTimer);
  if (verseTimer) clearInterval(verseTimer);
  if (tickerCancel) tickerCancel();
  if (weatherTimer) clearInterval(weatherTimer);
  clockTimer = null;
  verseTimer = null;
  tickerCancel = null;
  weatherTimer = null;
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

  applyTheme(config.theme || 'teal');

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

  // Build one continuously-scrolling ticker line — all sentences joined
  // with a wide gap (50 non-breaking spaces, which — unlike regular
  // spaces — don't get collapsed by the browser) so it reads as one
  // unbroken scroll rather than stopping/restarting between sentences.
  // The Hidaya AI branding is NOT part of this — it has its own small
  // static card below instead (see the brand-footer element).
  const tickerParts = [];
  if (config.announcement) tickerParts.push(config.announcement);
  if (config.swish || config.account) {
    const donateBits = [`💚 ${t(lang, 'support')} ${config.mosqueName || ''}`];
    if (config.swish) donateBits.push(`Swish: ${config.swish}`);
    if (config.account) donateBits.push(`🏦 ${t(lang, 'bankAccount')}: ${config.account}`);
    tickerParts.push(donateBits.join(' — '));
  }
  const GAP = ' '.repeat(50);
  startTicker(tickerParts.length ? tickerParts.join(GAP) : `🕌 ${config.mosqueName || 'Hidaya AI'}`);

  document.getElementById('brandPrefixOut').textContent = t(lang, 'poweredBy');

  renderPrayerRow(config);
  tickClock(config);
  clockTimer = setInterval(() => tickClock(config), 1000);

  showVerse(0);
  let verseIndex = 0;
  verseTimer = setInterval(() => {
    verseIndex = (verseIndex + 1) % DISPLAY_VERSES.length;
    showVerse(verseIndex);
  }, 25000);

  // Weather card is fully optional — only shown if a location was chosen
  // for it (falls back to the auto-calculated prayer location when that's
  // in use), and silently hidden if the fetch fails (offline display, or
  // no location configured at all) rather than showing an error.
  const weatherLoc = config.weatherCity || (config.mode === 'auto' ? config.autoLocation : null);
  if (weatherLoc) {
    fetchWeather(weatherLoc);
    weatherTimer = setInterval(() => fetchWeather(weatherLoc), 15 * 60 * 1000);
  } else {
    document.getElementById('weatherCard').classList.add('hidden');
  }
}

// WMO weather codes (used by Open-Meteo) mapped to a simple icon + label.
const WEATHER_CODES = {
  0: ['☀️', 'Clear sky'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'], 48: ['🌫️', 'Fog'],
  51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'],
  61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
  71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'],
  80: ['🌦️', 'Rain showers'], 81: ['🌧️', 'Rain showers'], 82: ['⛈️', 'Violent showers'],
  95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm'], 99: ['⛈️', 'Thunderstorm'],
};

function fetchWeather(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current_weather=true`;
  fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const cw = data.current_weather;
        if (!cw) throw new Error('no current_weather in response');
        const [icon, label] = WEATHER_CODES[cw.weathercode] || ['🌡️', ''];
        document.getElementById('weatherIconOut').textContent = icon;
        document.getElementById('weatherTempOut').textContent = `${Math.round(cw.temperature)}°C`;
        document.getElementById('weatherDescOut').textContent = label;
        document.getElementById('weatherCard').classList.remove('hidden');
      })
      .catch(() => {
        // Offline, or the weather API is unreachable — hide rather than
        // show stale/broken data.
        document.getElementById('weatherCard').classList.add('hidden');
      });
}

// One continuously-scrolling ticker line (classic marquee) that loops
// forever — `text` already has all sentences joined with a wide gap
// (see the caller in startDisplay), so this doesn't need to know about
// separate messages at all, it just scrolls the whole string right-to-
// left and restarts from the right the moment it scrolls fully off.
// Driven by requestAnimationFrame with a plain inline `transform` rather
// than a CSS @keyframes animation — a CSS animation whose keyframes
// reference custom properties (needed since the scroll distance depends
// on the text's own width) failed to actually start in testing
// (getAnimations() came back empty even though computed style reported
// it as "running"), and a manual rAF loop sidesteps that entirely while
// also being about as universally supported as anything gets across
// embedded/TV browsers.
function startTicker(text) {
  const tickerEl = document.getElementById('tickerOut');
  const barEl = tickerEl.parentElement;
  const SPEED_PX_PER_SEC = 140;
  let rafId = null;

  tickerEl.textContent = text;
  const startX = barEl.clientWidth;
  const endX = -tickerEl.scrollWidth;
  const distance = startX - endX;
  const durationMs = (distance / SPEED_PX_PER_SEC) * 1000;

  function loop(loopStartTime) {
    function step(now) {
      const elapsed = now - loopStartTime;
      const progress = (elapsed % durationMs) / durationMs;
      const x = startX - progress * distance;
      tickerEl.style.transform = `translate(${x}px, -50%)`;
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  tickerCancel = () => { if (rafId) cancelAnimationFrame(rafId); };
  loop(performance.now());
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

// ── "Generate Link for TV" ───────────────────────────────────────────────
// Filling in the setup form is easy on a phone (camera for the timetable
// file, working GPS, a real keyboard) and painful on a TV remote — Jemal
// hit repeated 404s just trying to TYPE the plain page URL on a TV. The
// fix: fill the form here, encode the whole config into the URL itself,
// shorten that URL, and only that short link ever needs to be entered on
// the TV — opening it auto-fills and starts the display immediately, no
// TV-side interaction beyond typing one short address (or scanning the QR
// with any camera-equipped device that can then relay/type it).

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// URL-safe base64 (- _ instead of + /, no padding) so it survives being
// pasted/typed as a URL query value without extra encoding headaches.
function encodeConfigForLink(config) {
  const trimmed = { ...config };
  delete trimmed.logo; // logos are per-device customization, not worth the URL bloat/risk
  const json = JSON.stringify(trimmed);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeConfigFromLink(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bytes = base64ToBytes(b64);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

async function shortenUrl(longUrl) {
  try {
    const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`);
    const text = await res.text();
    if (text.startsWith('https://is.gd/')) return text.trim();
  } catch (e) { /* offline, or the shortener is unreachable — fall back below */ }
  return null;
}

generateLinkBtn.addEventListener('click', async () => {
  if (!hasValidSource() || !mosqueNameInput.value.trim()) {
    tvLinkStatus.textContent = 'Fill in prayer times and mosque name first.';
    tvLinkStatus.className = 'file-status err';
    return;
  }
  tvLinkStatus.textContent = 'Generating link…';
  tvLinkStatus.className = 'file-status';
  tvLinkResult.classList.add('hidden');

  const config = buildConfigFromForm();
  const encoded = encodeConfigForLink(config);
  const longUrl = `${location.origin}${location.pathname}?c=${encoded}`;

  if (encoded.length > 1800) {
    tvLinkStatus.textContent = 'This setup is too large for a link (a full-year timetable file is a lot of data) — use "Download Offline Version" below instead, or switch to automatic/city-based prayer times for a link this short can carry.';
    tvLinkStatus.className = 'file-status err';
    return;
  }

  const short = await shortenUrl(longUrl);
  const finalUrl = short || longUrl;

  tvLinkOut.textContent = finalUrl;
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(finalUrl)}`;
  tvLinkResult.classList.remove('hidden');
  tvLinkStatus.textContent = short
      ? 'Type this short link on the TV\'s browser — everything above will load automatically.'
      : 'Could not shorten the link (no internet right now?) — this longer link still works the same way.';
  tvLinkStatus.className = 'file-status ok';
});

copyTvLinkBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(tvLinkOut.textContent);
  tvLinkStatus.textContent = 'Copied!';
  tvLinkStatus.className = 'file-status ok';
});

// ── Offline single-file export ───────────────────────────────────────────
// For mosques where the DISPLAY DEVICE itself never has internet (common
// across Africa and other low-connectivity regions): builds one
// self-contained .html file with all CSS/JS/fonts inlined, downloadable
// from anywhere that DOES have internet right now (a phone, a café). The
// resulting file can be copied to a USB drive and opened directly on the
// display device — no server, no network calls, ever, from that point on.

function arrayBufferToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function buildOfflineHtml() {
  const [htmlText, css, appJs, hijriJs, versesJs, prayertimesJs, translationsJs, themesJs, citiesJs, fontBuf] = await Promise.all([
    fetch('index.html').then((r) => r.text()),
    fetch('style.css').then((r) => r.text()),
    fetch('app.js').then((r) => r.text()),
    fetch('hijri.js').then((r) => r.text()),
    fetch('verses.js').then((r) => r.text()),
    fetch('prayertimes.js').then((r) => r.text()),
    fetch('translations.js').then((r) => r.text()),
    fetch('themes.js').then((r) => r.text()),
    fetch('cities.js').then((r) => r.text()),
    fetch('agressive.otf').then((r) => r.arrayBuffer()),
  ]);

  const fontBase64 = arrayBufferToBase64(fontBuf);
  const cssInlined = css.replace(
    "url('agressive.otf') format('opentype')",
    `url('data:font/otf;base64,${fontBase64}') format('opentype')`
  );

  let html = htmlText;
  // Strip the Google Fonts links — no network calls allowed in the offline
  // file; the Agressive font is embedded above, everything else already
  // has a system-font fallback in the CSS font stacks.
  html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, '');
  html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '');
  html = html.replace(/<link rel="stylesheet" href="style\.css[^"]*">/, `<style>${cssInlined}</style>`);
  html = html.replace(/<script src="hijri\.js[^"]*"><\/script>/, `<script>${hijriJs}</script>`);
  html = html.replace(/<script src="verses\.js[^"]*"><\/script>/, `<script>${versesJs}</script>`);
  html = html.replace(/<script src="prayertimes\.js[^"]*"><\/script>/, `<script>${prayertimesJs}</script>`);
  html = html.replace(/<script src="translations\.js[^"]*"><\/script>/, `<script>${translationsJs}</script>`);
  html = html.replace(/<script src="themes\.js[^"]*"><\/script>/, `<script>${themesJs}</script>`);
  html = html.replace(/<script src="cities\.js[^"]*"><\/script>/, `<script>${citiesJs}</script>`);
  html = html.replace(/<script src="app\.js[^"]*"><\/script>/, `<script>${appJs}</script>`);
  return html;
}

downloadOfflineBtn.addEventListener('click', async () => {
  offlineStatus.textContent = 'Building offline file…';
  offlineStatus.className = 'file-status';
  try {
    const html = await buildOfflineHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hidaya-mosque-display-offline.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    offlineStatus.textContent = 'Downloaded! Copy this file to a USB drive and open it on the display device — no internet needed there, ever again.';
    offlineStatus.className = 'file-status ok';
  } catch (e) {
    offlineStatus.textContent = 'Could not build the offline file — this download itself needs an internet connection right now.';
    offlineStatus.className = 'file-status err';
  }
});

// ── Boot ────────────────────────────────────────────────────────────────

const SHARED_FILE_KEY = 'hidaya_shared_file_v1';

// A .hidaya file shared from WhatsApp (or any share sheet) via the
// installed PWA's share-target (see sw.js) lands here as raw text —
// dropped into localStorage by the service worker's response script,
// picked up on the very next page load. Mirrors the phone app's
// _importFromPath fullYear handling: only overwrites the mosque name if
// one wasn't already configured, and keeps every other existing setting
// (theme, language, donation info, weather) intact when re-sharing an
// updated timetable.
function tryLoadSharedFile() {
  const raw = localStorage.getItem(SHARED_FILE_KEY);
  if (!raw) return false;
  localStorage.removeItem(SHARED_FILE_KEY);
  try {
    const json = JSON.parse(raw);
    if (json.type !== 'fullYear' || !json.months) return false;
    const existing = loadConfig() || {};
    const config = {
      ...existing,
      mode: 'file',
      timetable: json,
      mosqueName: existing.mosqueName || json.mosque || '',
      calcMethod: existing.calcMethod || 'mwl',
      language: existing.language || 'en',
      theme: existing.theme || 'teal',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    startDisplay(config);
    return true;
  } catch (e) {
    return false;
  }
}

(function boot() {
  if (tryLoadSharedFile()) return;

  // A config baked into the URL (see "Generate Link for TV") takes
  // priority — this is exactly the TV's first-ever load of its one short
  // link. Once loaded, it's saved to localStorage same as manual setup,
  // so the TV never needs the query param again after a refresh/restart.
  const urlConfig = new URLSearchParams(location.search).get('c');
  if (urlConfig) {
    try {
      const config = decodeConfigFromLink(urlConfig);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      startDisplay(config);
      return;
    } catch (e) {
      // Corrupted/truncated link — fall through to normal boot instead of
      // leaving the screen stuck on an error.
    }
  }

  const saved = loadConfig();
  if (saved && (saved.timetable || (saved.mode === 'auto' && saved.autoLocation))) {
    startDisplay(saved);
  }
})();
