import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZjmlWMFi6tnqldHL0T6PHVMJSv32RO3w",
  authDomain: "travel-app-a41a6.firebaseapp.com",
  projectId: "travel-app-a41a6",
  storageBucket: "travel-app-a41a6.firebasestorage.app",
  messagingSenderId: "61125297760",
  appId: "1:61125297760:web:1446bced80119165caa505"
};

// Initialize Firebase
let app;
let db: any;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

// Helper to get a consistent Device ID for this browser
const getDeviceId = () => {
    let id = localStorage.getItem('wanderlist_device_id');
    if (!id) {
        id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('wanderlist_device_id', id);
    }
    return id;
};

// Ensure the current "Device User" exists in the users collection
const ensureUserExists = async (deviceId: string) => {
    if (!db) return;
    const userRef = doc(db, 'users', deviceId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, {
            id: deviceId,
            name: '訪客',
            avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix'
        });
    }
};

export { db, getDeviceId, ensureUserExists };