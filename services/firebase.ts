import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// 透過環境變數讀取設定
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { db };

// ------------------------------------------------------------------
// 以下保留原本的輔助函式 (不需要更動)
// ------------------------------------------------------------------

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