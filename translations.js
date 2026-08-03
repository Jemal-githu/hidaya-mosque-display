// UI text shown on the display screen itself (not the setup form, which
// the mosque admin configures once and can read English for). Prayer
// names (Fajr, Dhuhr, etc.) are intentionally left untranslated — they're
// used as-is in virtually every language's Islamic apps and materials.

const LANGUAGES = {
  en: { name: 'English', rtl: false },
  sv: { name: 'Svenska', rtl: false },
  ar: { name: 'العربية', rtl: true },
  tr: { name: 'Türkçe', rtl: false },
  so: { name: 'Soomaali', rtl: false },
  ur: { name: 'اردو', rtl: true },
};

const TRANSLATIONS = {
  en: {
    nextPrayer: 'Next Prayer', ayahOfDay: 'Ayah of the Day',
    poweredBy: 'powered by Hidaya AI', support: 'Support', bankAccount: 'Bank account',
    inPrefix: 'in', hours: 'h', minutes: 'm',
    noTimesToday: 'No prayer times found for today.',
  },
  sv: {
    nextPrayer: 'Nästa bön', ayahOfDay: 'Dagens vers',
    poweredBy: 'drivs av Hidaya AI', support: 'Stöd', bankAccount: 'Bankkonto',
    inPrefix: 'om', hours: 't', minutes: 'min',
    noTimesToday: 'Inga böntider hittades för idag.',
  },
  ar: {
    nextPrayer: 'الصلاة القادمة', ayahOfDay: 'آية اليوم',
    poweredBy: 'مدعوم من Hidaya AI', support: 'ادعم', bankAccount: 'رقم الحساب البنكي',
    inPrefix: 'خلال', hours: 'س', minutes: 'د',
    noTimesToday: 'لم يتم العثور على مواقيت الصلاة لهذا اليوم.',
  },
  tr: {
    nextPrayer: 'Sıradaki Namaz', ayahOfDay: 'Günün Ayeti',
    poweredBy: 'Hidaya AI tarafından desteklenmektedir', support: 'Destek ol', bankAccount: 'Banka hesabı',
    inPrefix: '', hours: 'sa', minutes: 'dk',
    noTimesToday: 'Bugün için namaz vakti bulunamadı.',
  },
  so: {
    nextPrayer: 'Salaadda Xigta', ayahOfDay: 'Aayadda Maanta',
    poweredBy: 'waxaa taageeraya Hidaya AI', support: 'Taageer', bankAccount: 'Xisaabta bangiga',
    inPrefix: 'gudaha', hours: 'sac', minutes: 'daq',
    noTimesToday: 'Wakhtiyada salaadda maanta lama helin.',
  },
  ur: {
    nextPrayer: 'اگلی نماز', ayahOfDay: 'آج کی آیت',
    poweredBy: 'Hidaya AI کی طرف سے', support: 'مدد کریں', bankAccount: 'بینک اکاؤنٹ',
    inPrefix: '', hours: 'گھنٹے', minutes: 'منٹ',
    noTimesToday: 'آج کے لیے نماز کے اوقات نہیں ملے۔',
  },
};

function t(lang, key) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] !== undefined ? dict[key] : TRANSLATIONS.en[key];
}
