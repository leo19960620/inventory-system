// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// 貼上您在 Step 1.4 複製的設定
const firebaseConfig = {
  apiKey: "AIzaSyBS0buqEla1r6ul_EOMSIcPRN8wZQoXjPs",
  authDomain: "inventory-system-8a4fa.firebaseapp.com",
  projectId: "inventory-system-8a4fa",
  storageBucket: "inventory-system-8a4fa.firebasestorage.app",
  messagingSenderId: "484286314441",
  appId: "1:484286314441:web:23e1923cace491d388da18",
  databaseURL: "https://inventory-system-8a4fa-default-rtdb.asia-southeast1.firebasedatabase.app",
};
// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 取得資料庫實例
export const database = getDatabase(app);