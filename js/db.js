
// Firebase Configuration (New Project: mybatchparty)
const firebaseConfig = {
    apiKey: "AIzaSyBBqzmVd6ZlNVmE6nZSv0NmzTCmJg8DZhI",
    authDomain: "mybatchparty.firebaseapp.com",
    projectId: "mybatchparty",
    storageBucket: "mybatchparty.firebasestorage.app",
    messagingSenderId: "714202167143",
    appId: "1:714202167143:web:b057a2f621c3ff2dfd61c2"
};

// Initialize Firebase (Compat mode for simple script loading)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

console.log("Firebase Cloud DB Initialized (mybatchparty)");
