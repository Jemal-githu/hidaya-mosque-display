// Hidaya AI mosque display — standalone static page, no backend.
// Setup data (parsed timetable + mosque details) is kept in this browser's
// localStorage, since a mosque TV is expected to run one browser tab
// continuously rather than needing multi-device sync.

const STORAGE_KEY = 'hidaya_display_config_v1';
const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const COUNTDOWN_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = { Fajr: '🌅', Sunrise: '🌄', Dhuhr: '☀️', Asr: '⛅', Maghrib: '🌇', Isha: '🌙' };

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

let parsedTimetable = null; // { months: { '1': { '1': {Fajr:..,...}, ... }, ... } }

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
  startBtn.disabled = !(parsedTimetable && mosqueNameInput.value.trim());
}
mosqueNameInput.addEventListener('input', updateStartButton);

startBtn.addEventListener('click', () => {
  if (!parsedTimetable) return;
  const config = {
    timetable: parsedTimetable,
    mosqueName: mosqueNameInput.value.trim(),
    swish: swishInput.value.trim(),
    account: accountInput.value.trim(),
    announcement: announcementInput.value.trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  setupError.textContent = '';
  startDisplay(config);
});

settingsBtn.addEventListener('click', () => {
  stopClocks();
  displayView.classList.add('hidden');
  setupView.classList.remove('hidden');
  const saved = loadConfig();
  if (saved) {
    mosqueNameInput.value = saved.mosqueName || '';
    swishInput.value = saved.swish || '';
    accountInput.value = saved.account || '';
    announcementInput.value = saved.announcement || '';
    parsedTimetable = saved.timetable;
    fileStatus.textContent = 'Using previously loaded timetable — choose a new file to replace it.';
    fileStatus.className = 'file-status ok';
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

function stopClocks() {
  if (clockTimer) clearInterval(clockTimer);
  if (verseTimer) clearInterval(verseTimer);
  clockTimer = null;
  verseTimer = null;
}

function timesForDate(config, date) {
  const month = String(date.getMonth() + 1);
  const day = String(date.getDate());
  const monthData = config.timetable.months[month];
  return monthData ? monthData[day] : null;
}

function startDisplay(config) {
  setupView.classList.add('hidden');
  displayView.classList.remove('hidden');

  document.getElementById('mosqueNameOut').textContent = config.mosqueName || 'Hidaya AI';

  const tickerParts = [];
  if (config.announcement) tickerParts.push(`📢 ${config.announcement}`);
  if (config.swish) tickerParts.push(`💚 Support ${config.mosqueName || 'the mosque'} — Swish: ${config.swish}`);
  if (config.account) tickerParts.push(`🏦 Bank account: ${config.account}`);
  document.getElementById('tickerOut').textContent = tickerParts.length
      ? tickerParts.join('     •     ')
      : `🕌 ${config.mosqueName || 'Hidaya AI'} — powered by Hidaya AI`;

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
    listCard.innerHTML = '<div class="list-row">No prayer times found for today — check the imported file covers this month.</div>';
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
      <div class="row-time">${passed ? '<span class="row-check">✓</span>' : ''}${time}</div>
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

function formatCountdown(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
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

    const nextCard = document.getElementById('nextCard');
    nextCard.innerHTML = `
      <div>
        <div class="next-label">Next Prayer</div>
        <div class="next-name">${next.name}</div>
        <div class="next-countdown">${formatCountdown(next.target - now)}</div>
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
  if (saved && saved.timetable) {
    startDisplay(saved);
  }
})();
