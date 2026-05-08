import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

import {
  initializeFirestore
} from "firebase/firestore";

import {
  getStorage
} from "firebase/storage";

/*
Replace below values from Firebase Console

Project Settings
→ General
→ Your Apps
→ SDK setup and configuration
*/

const firebaseConfig = {
  apiKey: "AIzaSyBkdmUBYWycVkn5pd9XCWSFgYm0uZ1v7HQ",
  authDomain: "safeher1-514a9.firebaseapp.com",
  projectId: "safeher1-514a9",
  storageBucket: "safeher1-514a9.firebasestorage.app",
  messagingSenderId: "585835226482",
  appId: "1:585835226482:web:f443f208b5a45b080ca9eb"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(app);

export default app;