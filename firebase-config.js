// Shared Firebase setup used by advertise.html, admin.html, and the
// display's own app.js (to fetch approved ads for the ticker).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcCQxFSiXUgxj_h9x4CI-1oarvFb7zApc",
  authDomain: "hidaya-ads.firebaseapp.com",
  projectId: "hidaya-ads",
  storageBucket: "hidaya-ads.firebasestorage.app",
  messagingSenderId: "934436134478",
  appId: "1:934436134478:web:f864e7ea33ced8d500ad1f",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
