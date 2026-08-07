import { db } from "./firebase-config.js";
import {
  collection, addDoc, Timestamp, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const form = document.getElementById('advForm');
const status = document.getElementById('advStatus');
const submitBtn = document.getElementById('advSubmitBtn');

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
      contact: document.getElementById('contact').value.trim(),
      startDate: Timestamp.fromDate(new Date(startDate + 'T00:00:00')),
      endDate: Timestamp.fromDate(new Date(endDate + 'T23:59:59')),
      status: 'pending',
      submittedAt: serverTimestamp(),
    });
    status.textContent = '✓ Submitted! We\'ll review it and it\'ll appear on displays in your area once approved.';
    status.className = 'file-status ok';
    form.reset();
  } catch (err) {
    status.textContent = 'Something went wrong — please try again.';
    status.className = 'file-status err';
  }
  submitBtn.disabled = false;
});
