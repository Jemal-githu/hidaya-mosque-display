// Gregorian → Hijri conversion using the standard tabular Islamic calendar
// (astronomical Julian Day round-trip). This is a fixed-arithmetic
// approximation, not moon-sighting based, so it can be off by a day from
// what a given mosque announces — good enough for a display screen's date
// line, not for religious rulings.

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

// Returns the integer Julian Day Number (not the astronomical Julian Date,
// which is offset by 0.5) — the calendrical formula below expects an
// integer day count, and mixing the two in produced a fractional Hijri day.
function gregorianToJulianDay(year, month, day) {
  if (month < 3) { year -= 1; month += 12; }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524;
}

function julianDayToHijri(jd) {
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719)
      + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
      - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

function toHijri(date) {
  const jd = gregorianToJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const h = julianDayToHijri(jd);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}
