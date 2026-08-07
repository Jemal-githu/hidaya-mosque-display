// Fetches approved, currently-active local-business ads for the display's
// ticker. A separate module (rather than converting app.js itself into a
// module) so the existing classic-script globals (THEMES, translations,
// etc.) in app.js/themes.js/translations.js keep working exactly as
// before — app.js just calls window.hidayaFetchAds(region) and awaits it.
import { db } from "./firebase-config.js";
import {
  collection, query, where, getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

window.hidayaFetchAds = async function hidayaFetchAds(region) {
  try {
    const q = query(collection(db, 'ads'), where('status', '==', 'approved'));
    const snapshot = await getDocs(q);
    const now = new Date();
    const normalizedRegion = (region || '').trim().toLowerCase();
    const results = [];
    snapshot.forEach((docSnap) => {
      const ad = docSnap.data();
      // Businesses can list several cities separated by commas (e.g.
      // "Gothenburg, Mölndal, Partille") to reach nearby areas too — match
      // if the display's own city appears anywhere in that list.
      const adRegions = (ad.region || '').split(',').map((r) => r.trim().toLowerCase());
      if (!adRegions.includes(normalizedRegion) && !adRegions.includes('all')) return;
      const start = ad.startDate && ad.startDate.toDate ? ad.startDate.toDate() : null;
      const end = ad.endDate && ad.endDate.toDate ? ad.endDate.toDate() : null;
      if (start && now < start) return;
      if (end && now > end) return;
      results.push(`📣 ${ad.businessName}: ${ad.offerText}`);
    });
    return results;
  } catch (e) {
    return [];
  }
};
