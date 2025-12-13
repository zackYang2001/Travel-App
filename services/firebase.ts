import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

// ------------------------------------------------------------------
// 使用環境變數載入 Firebase 設定 (最安全的方式)
// 這些變數會從你的 .env.local 檔案中讀取
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize only if config is valid
let app;
let db: any;

try {
    // 檢查是否有抓到環境變數 (apiKey 是否存在)
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase initialized successfully with env vars");
    } else {
        console.warn("Firebase config is missing. Please check your .env.local file.");
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