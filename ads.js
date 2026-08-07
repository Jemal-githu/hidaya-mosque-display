// Fetches approved, currently-active local-business ads for the display's
// ticker. A separate module (rather than converting app.js itself into a
// module) so the existing classic-script globals (THEMES, translations,
// etc.) in app.js/themes.js/translations.js keep working exactly as
// before — app.js just calls window.hidayaFetchAds(region, lat, lng) and
// awaits it.
import { db } from "./firebase-config.js";
import {
  collection, query, where, getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Standard great-circle distance in km (haversine formula).
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

window.hidayaFetchAds = async function hidayaFetchAds(region, displayLat, displayLng) {
  try {
    const q = query(collection(db, 'ads'), where('status', '==', 'approved'));
    const snapshot = await getDocs(q);
    const now = new Date();
    const normalizedRegion = (region || '').trim().toLowerCase();
    const hasDisplayLocation = typeof displayLat === 'number' && typeof displayLng === 'number';
    const results = [];

    snapshot.forEach((docSnap) => {
      const ad = docSnap.data();
      const start = ad.startDate && ad.startDate.toDate ? ad.startDate.toDate() : null;
      const end = ad.endDate && ad.endDate.toDate ? ad.endDate.toDate() : null;
      if (start && now < start) return;
      if (end && now > end) return;

      // GPS + radius is the primary match, since it's precise and immune
      // to typos — but only usable when BOTH the ad and this display have
      // a location set. Otherwise fall back to the comma-separated
      // city-list text match (see advertise.js/index.html's "City/area").
      const hasAdLocation = typeof ad.lat === 'number' && typeof ad.lng === 'number'
        && typeof ad.radiusKm === 'number';
      let matched = false;
      if (hasAdLocation && hasDisplayLocation) {
        matched = distanceKm(ad.lat, ad.lng, displayLat, displayLng) <= ad.radiusKm;
      } else {
        const adRegions = (ad.region || '').split(',').map((r) => r.trim().toLowerCase());
        matched = adRegions.includes(normalizedRegion) || adRegions.includes('all');
      }
      if (!matched) return;

      results.push(`📣 ${ad.businessName}: ${ad.offerText}`);
    });
    return results;
  } catch (e) {
    return [];
  }
};
