import { db } from "./firebase-config.js";
import {
  collection, addDoc, Timestamp, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const form = document.getElementById('advForm');
const status = document.getElementById('advStatus');
const submitBtn = document.getElementById('advSubmitBtn');
const detectLocationBtn = document.getElementById('detectLocationBtn');
const locationStatus = document.getElementById('locationStatus');

let detectedLat = null;
let detectedLng = null;

detectLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'This browser can\'t detect location — use the City/area field below instead.';
    locationStatus.className = 'file-status err';
    return;
  }
  locationStatus.textContent = 'Detecting…';
  locationStatus.className = 'file-status';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      detectedLat = pos.coords.latitude;
      detectedLng = pos.coords.longitude;
      locationStatus.textContent = '✓ Location detected — your radius above will be used to match displays.';
      locationStatus.className = 'file-status ok';
    },
    () => {
      locationStatus.textContent = 'Could not get your location — permission denied or unavailable. The City/area field below will be used instead.';
      locationStatus.className = 'file-status err';
    },
  );
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
      radiusKm: detectedLat !== null ? parseInt(document.getElementById('radiusSelect').value, 10) : null,
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
  } catch (err) {
    status.textContent = 'Something went wrong — please try again.';
    status.className = 'file-status err';
  }
  submitBtn.disabled = false;
});
