// Standalone prayer-time calculator for mosques that don't have a printed
// timetable to upload — computes times from latitude/longitude using the
// same general astronomical method (sun angle at each prayer) used by
// widely-adopted open-source prayer-time libraries (e.g. praytimes.org):
// Fajr/Isha are defined by how many degrees the sun sits below the
// horizon, Asr by shadow-length ratio, Dhuhr/Maghrib/Sunrise from solar
// noon and the standard ~0.833° sunrise/sunset depression angle.
//
// This is a single-pass (non-iterative) implementation, accurate to
// roughly ±1 minute — good enough as a sensible default, but a mosque's
// own printed timetable (imported as .hidaya) should always be preferred
// over this when one is available, since local moon-sighting/committee
// conventions can differ slightly from pure calculation.

const CALC_METHODS = {
  mwl: { label: 'Muslim World League', fajr: 18, isha: 17 },
  isna: { label: 'ISNA (North America)', fajr: 15, isha: 15 },
  egypt: { label: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
  karachi: { label: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  ummalqura: { label: 'Umm al-Qura, Makkah', fajr: 18.5, ishaMinutes: 90 },
};

function fixAngle360(a) {
  a = a - 360 * Math.floor(a / 360);
  return a < 0 ? a + 360 : a;
}
function fixHour24(h) {
  h = h - 24 * Math.floor(h / 24);
  return h < 0 ? h + 24 : h;
}
const dsin = (d) => Math.sin((d * Math.PI) / 180);
const dcos = (d) => Math.cos((d * Math.PI) / 180);
const dtan = (d) => Math.tan((d * Math.PI) / 180);
const darcsin = (x) => (Math.asin(x) * 180) / Math.PI;
const darccos = (x) => (Math.acos(Math.max(-1, Math.min(1, x))) * 180) / Math.PI;
const darctan2 = (y, x) => (Math.atan2(y, x) * 180) / Math.PI;
const darccot = (x) => (Math.atan2(1, x) * 180) / Math.PI;

function julianDate(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

// Low-precision solar position (declination + equation of time), accurate
// to within about a minute — the same approximation family used by most
// lightweight open-source prayer-time calculators.
function sunPosition(jd) {
  const d = jd - 2451545.0;
  const g = fixAngle360(357.529 + 0.98560028 * d);
  const q = fixAngle360(280.459 + 0.98564736 * d);
  const l = fixAngle360(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g));
  const e = 23.439 - 0.00000036 * d;
  const ra = darctan2(dcos(e) * dsin(l), dcos(l)) / 15;
  const eqt = q / 15 - fixHour24(ra);
  const decl = darcsin(dsin(e) * dsin(l));
  return { decl, eqt };
}

// Hours between solar noon and the moment the sun is at `angleDeg` degrees
// below the horizon (positive = below horizon, e.g. Fajr/Isha twilight;
// negative = above horizon, used for Asr's shadow-based angle). Returns
// null instead of clamping when the ratio falls outside [-1, 1] — that
// happens at high latitudes in summer (e.g. Scandinavia), where the sun
// never actually reaches 15-19° below the horizon, so the plain formula
// has no real solution and needs a different rule (see the high-latitude
// fallback in calculatePrayerTimes below) rather than a silently wrong
// clamped value.
function angleHourOffset(angleDeg, lat, decl) {
  const ratio = (-dsin(angleDeg) - dsin(lat) * dsin(decl)) / (dcos(lat) * dcos(decl));
  if (ratio < -1 || ratio > 1) return null;
  return darccos(ratio) / 15;
}

function formatDecimalHours(hours) {
  let h = Math.floor(hours);
  let m = Math.round((hours - h) * 60);
  if (m === 60) { m = 0; h += 1; }
  h = ((h % 24) + 24) % 24;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * @param {Date} date - the local calendar date to compute times for
 * @param {number} lat - latitude in degrees
 * @param {number} lng - longitude in degrees (east positive)
 * @param {number} tzOffsetHours - local UTC offset in hours (e.g. 2 for CEST)
 * @param {string} methodKey - key into CALC_METHODS
 * @param {number} asrFactor - 1 = Shafi/Maliki/Hanbali (standard shadow), 2 = Hanafi
 */
function calculatePrayerTimes(date, lat, lng, tzOffsetHours, methodKey, asrFactor) {
  const method = CALC_METHODS[methodKey] || CALC_METHODS.mwl;
  asrFactor = asrFactor || 1;

  const jd = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
  const { decl, eqt } = sunPosition(jd + 0.5);

  const dhuhrDecimal = 12 + tzOffsetHours - lng / 15 - eqt;

  // twilightH (sunrise/sunset) is only ever invalid inside the Arctic/
  // Antarctic circles during permanent day/night, which this app doesn't
  // need to handle — Fajr/Isha, though, commonly go invalid at ordinary
  // populated high latitudes (e.g. all of Scandinavia) for weeks around
  // midsummer, so those two need the fallback below.
  const twilightH = angleHourOffset(0.833, lat, decl) || 6;
  const nightLength = 24 - 2 * twilightH;

  const fajrH = angleHourOffset(method.fajr, lat, decl);
  const ishaH = method.ishaMinutes ? null : angleHourOffset(method.isha, lat, decl);
  const asrAngle = -darccot(asrFactor + dtan(Math.abs(lat - decl)));
  const asrH = angleHourOffset(asrAngle, lat, decl) || 3.5;

  const maghribDecimal = dhuhrDecimal + twilightH;

  // High-latitude fallback ("angle-based method", the same rule used by
  // most mainstream prayer-time apps for this case): Fajr/Isha become a
  // fixed fraction of the night's length instead of a fixed sun angle,
  // since the angle itself has no real solution.
  const fajrDecimal = fajrH !== null
      ? dhuhrDecimal - fajrH
      : dhuhrDecimal - twilightH - (method.fajr / 60) * nightLength;
  const ishaDecimal = method.ishaMinutes
      ? maghribDecimal + method.ishaMinutes / 60
      : ishaH !== null
          ? dhuhrDecimal + ishaH
          : maghribDecimal + (method.isha / 60) * nightLength;

  return {
    Fajr: formatDecimalHours(fajrDecimal),
    Sunrise: formatDecimalHours(dhuhrDecimal - twilightH),
    Dhuhr: formatDecimalHours(dhuhrDecimal),
    Asr: formatDecimalHours(dhuhrDecimal + asrH),
    Maghrib: formatDecimalHours(maghribDecimal),
    Isha: formatDecimalHours(ishaDecimal),
  };
}
