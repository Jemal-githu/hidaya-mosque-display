import { db } from "./firebase-config.js";
import {
  collection, addDoc, Timestamp, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const form = document.getElementById('advForm');
const status = document.getElementById('advStatus');
const submitBtn = document.getElementById('advSubmitBtn');
const detectLocationBtn = document.getElementById('detectLocationBtn');
const locationStatus = document.getElementById('locationStatus');
const radiusSelect = document.getElementById('radiusSelect');
const townsList = document.getElementById('townsList');
const regionInput = document.getElementById('region');

let detectedLat = null;
let detectedLng = null;

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateRegionFromChecked() {
  const checked = [...townsList.querySelectorAll('input[type="checkbox"]:checked')]
    .map((cb) => cb.dataset.name);
  if (checked.length) regionInput.value = checked.join(', ');
}

// Uses OpenStreetMap's free Overpass API to find real nearby town/city
// names within the chosen radius — no API key needed. This turns the
// radius into something a business owner can actually see and adjust
// (uncheck a town they don't want) instead of trusting an invisible
// circle. The City/area text field is auto-filled from the selection as
// a human-readable fallback for displays without GPS set up; the precise
// lat/lng + radius (below, on submit) is still what actually drives
// matching on the display side.
async function findNearbyTowns(lat, lng, radiusKm) {
  const radiusMeters = radiusKm * 1000;
  const query = `[out:json][timeout:25];node(around:${radiusMeters},${lat},${lng})["place"~"^(city|town|village|suburb)$"];out tags;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  });
  const data = await res.json();
  const seen = new Set();
  const towns = [];
  for (const el of data.elements || []) {
    const name = el.tags && el.tags.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    towns.push({ name, dist: distanceKm(lat, lng, el.lat, el.lon) });
  }
  towns.sort((a, b) => a.dist - b.dist);
  return towns.slice(0, 20); // plenty for a checklist without overwhelming
}

detectLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'This browser can\'t detect location — use the City/area field below instead.';
    locationStatus.className = 'file-status err';
    return;
  }
  locationStatus.textContent = 'Detecting your location…';
  locationStatus.className = 'file-status';
  townsList.classList.add('hidden');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      detectedLat = pos.coords.latitude;
      detectedLng = pos.coords.longitude;
      locationStatus.textContent = 'Looking up nearby towns…';
      try {
        const radiusKm = parseInt(radiusSelect.value, 10);
        const towns = await findNearbyTowns(detectedLat, detectedLng, radiusKm);
        if (!towns.length) {
          locationStatus.textContent = '✓ Location detected, but no named towns found in that radius — type your area in the field below.';
          locationStatus.className = 'file-status ok';
          return;
        }
        townsList.innerHTML = '';
        towns.forEach((town) => {
          const row = document.createElement('label');
          row.className = 'town-check-row';
          row.innerHTML = `<input type="checkbox" checked data-name="${town.name}">
            <span>${town.name}</span>
            <span class="dist">${town.dist.toFixed(1)} km</span>`;
          row.querySelector('input').addEventListener('change', updateRegionFromChecked);
          townsList.appendChild(row);
        });
        townsList.classList.remove('hidden');
        updateRegionFromChecked();
        locationStatus.textContent = `✓ Found ${towns.length} nearby town(s) — uncheck any you don't want to reach.`;
        locationStatus.className = 'file-status ok';
      } catch (e) {
        locationStatus.textContent = '✓ Location detected, but the nearby-towns lookup failed — type your area in the field below instead.';
        locationStatus.className = 'file-status ok';
      }
    },
    () => {
      locationStatus.textContent = 'Could not get your location — permission denied or unavailable. The City/area field below will be used instead.';
      locationStatus.className = 'file-status err';
    },
  );
});

// Re-running the town search when the radius changes (after a first
// detection) saves having to re-tap "Find Nearby Towns" and re-grant
// location permission just to widen/narrow the circle.
radiusSelect.addEventListener('change', () => {
  if (detectedLat !== null) detectLocationBtn.click();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  status.textContent = 'Submitting…';
  status.className = 'file-status';

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) {
    status.textContent = 'End date must be on or after the start date.';
    status.className = 'file-status err';
    submitBtn.disabled = false;
    return;
  }

  try {
    await addDoc(collection(db, 'ads'), {
      businessName: document.getElementById('businessName').value.trim(),
      category: document.getElementById('category').value,
      offerText: document.getElementById('offerText').value.trim(),
      region: document.getElementById('region').value.trim(),
      lat: detectedLat,
      lng: detectedLng,
      radiusKm: detectedLat !== null ? parseInt(radiusSelect.value, 10) : null,
      contact: document.getElementById('contact').value.trim(),
      startDate: Timestamp.fromDate(new Date(startDate + 'T00:00:00')),
      endDate: Timestamp.fromDate(new Date(endDate + 'T23:59:59')),
      status: 'pending',
      submittedAt: serverTimestamp(),
    });
    status.textContent = '✓ Submitted! We\'ll review it and it\'ll appear on displays in your area once approved.';
    status.className = 'file-status ok';
    form.reset();
    detectedLat = null;
    detectedLng = null;
    locationStatus.textContent = '';
    townsList.classList.add('hidden');
    townsList.innerHTML = '';
  } catch (err) {
    status.textContent = 'Something went wrong — please try again.';
    status.className = 'file-status err';
  }
  submitBtn.disabled = false;
});
