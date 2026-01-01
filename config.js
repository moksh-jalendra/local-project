// config.js - Centralized Firebase Configuration
// PROJECT: Chronoglow

const firebaseConfig = {
  apiKey: "AIzaSyBxodD7iSH0JdXypNNcb7XXw_iP21IhYTI",
  authDomain: "chronoglow-nwtxo.firebaseapp.com",
  databaseURL: "https://chronoglow-nwtxo-default-rtdb.firebaseio.com",
  projectId: "chronoglow-nwtxo",
  storageBucket: "chronoglow-nwtxo.firebasestorage.app",
  messagingSenderId: "688060228830",
  appId: "1:688060228830:web:3049a4a87495909e074e4f"
};

// Initialize only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Initialized: Chronoglow");
}

// Export global instances for use in other files
// Other scripts (auth.js, feed.js) can now just use 'auth', 'db', 'rtdb'
const auth = firebase.auth();
const db = firebase.firestore();      // For User Profiles & Feed
const rtdb = firebase.database();     // For Chat, Octapad & Game