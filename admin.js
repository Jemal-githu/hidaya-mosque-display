import { db, auth } from "./firebase-config.js";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const loginBox = document.getElementById('loginBox');
const adminBox = document.getElementById('adminBox');
const loginBtn = document.getElementById('loginBtn');
const loginStatus = document.getElementById('loginStatus');
const adsList = document.getElementById('adsList');

loginBtn.addEventListener('click', async () => {
  loginStatus.textContent = 'Signing in…';
  loginStatus.className = 'file-status';
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById('loginEmail').value.trim(),
      document.getElementById('loginPassword').value,
    );
  } catch (e) {
    loginStatus.textContent = 'Sign-in failed — check your email/password.';
    loginStatus.className = 'file-status err';
  }
});

function fmtDate(ts) {
  if (!ts) return '';
  return ts.toDate().toLocaleDateString();
}

function renderAds(snapshot) {
  adsList.innerHTML = '';
  if (snapshot.empty) {
    adsList.innerHTML = '<p class="field-hint">No submissions yet.</p>';
    return;
  }
  snapshot.forEach((docSnap) => {
    const ad = docSnap.data();
    const card = document.createElement('div');
    card.className = 'ad-card';
    card.innerHTML = `
      <span class="ad-badge ${ad.status}">${ad.status.toUpperCase()}</span>
      <h3>${ad.businessName || '(no name)'}</h3>
      <p>${ad.offerText || ''}</p>
      <p>📍 ${ad.region || '—'} &nbsp;|&nbsp; 🗂 ${ad.category || '—'}</p>
      <p>${typeof ad.lat === 'number' && typeof ad.radiusKm === 'number'
          ? `📡 GPS captured — ${ad.radiusKm} km radius`
          : '⚠️ No GPS — matched by city name only'}</p>
      <p>📅 ${fmtDate(ad.startDate)} → ${fmtDate(ad.endDate)}</p>
      <p>✉️ ${ad.contact || '—'}</p>
      <div class="ad-actions"></div>
    `;
    const actions = card.querySelector('.ad-actions');

    if (ad.status !== 'approved') {
      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn-approve';
      approveBtn.textContent = 'Approve';
      approveBtn.onclick = () => updateDoc(doc(db, 'ads', docSnap.id), { status: 'approved' });
      actions.appendChild(approveBtn);
    }
    if (ad.status !== 'rejected') {
      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn-reject';
      rejectBtn.textContent = 'Reject';
      rejectBtn.onclick = () => updateDoc(doc(db, 'ads', docSnap.id), { status: 'rejected' });
      actions.appendChild(rejectBtn);
    }
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => {
      if (confirm(`Delete "${ad.businessName}"? This cannot be undone.`)) {
        deleteDoc(doc(db, 'ads', docSnap.id));
      }
    };
    actions.appendChild(deleteBtn);

    adsList.appendChild(card);
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBox.classList.add('hidden');
    adminBox.classList.remove('hidden');
    const q = query(collection(db, 'ads'), orderBy('submittedAt', 'desc'));
    onSnapshot(q, renderAds);
  } else {
    loginBox.classList.remove('hidden');
    adminBox.classList.add('hidden');
  }
});
