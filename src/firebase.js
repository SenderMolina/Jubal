import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyCvvuj8B8HJvzjew32ZqsOxd-P6xwug7QQ",
  authDomain: "jubal-1cbcc.firebaseapp.com",
  databaseURL: "https://jubal-1cbcc-default-rtdb.firebaseio.com",
  projectId: "jubal-1cbcc",
  storageBucket: "jubal-1cbcc.firebasestorage.app",
  messagingSenderId: "607684618832",
  appId: "1:607684618832:web:369dca080c4e20eb89bf55"
}

const firebaseApp = initializeApp(firebaseConfig)
export const db = getDatabase(firebaseApp)
