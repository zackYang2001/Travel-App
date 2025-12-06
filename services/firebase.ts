
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

// ------------------------------------------------------------------
// IMPORTANT: REPLACE THE OBJECT BELOW WITH YOUR OWN FIREBASE CONFIG
// 1. Go to console.firebase.google.com
// 2. Create a project -> Add Web App
// 3. Copy the config object
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// Initialize only if config is valid (simple check)
let app;
let db: any;

try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } else {
        console.warn("Firebase config is missing. Please update services/firebase.ts");
    }
} catch (e) {
    console.error("Firebase init error:", e);
}

export { db };

// Helper to identify the current device/browser user
export const getDeviceId = () => {
    let id = localStorage.getItem('wanderlist_device_id');
    if (!id) {
        id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('wanderlist_device_id', id);
    }
    return id;
};

export const ensureUserExists = async (userId: string, defaultName: string = '訪客') => {
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            id: userId,
            name: defaultName,
            avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + userId
        });
    }
    return snap.exists() ? snap.data() : { id: userId, name: defaultName };
};
