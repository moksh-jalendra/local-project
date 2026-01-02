// auth.js - Fixed Google Login & Verification
// DEPENDENCY: config.js must be loaded first

document.addEventListener('DOMContentLoaded', () => {
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // UI Elements
    const statusMsg = document.getElementById('auth-status');
    const googleBtn = document.getElementById('google-btn');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const resetBtn = document.getElementById('reset-link-btn');
    
    const verifyOverlay = document.getElementById('verification-overlay');
    const verifyEmailDisplay = document.getElementById('verify-email-display');
    const authCard = document.querySelector('.auth-card:not(#verification-overlay)');

    let pollInterval = null;

    // --- 0. CHECK LOGIN STATE ---
    auth.onAuthStateChanged(user => {
        if (user) {
            if (user.emailVerified) {
                // If verified, ensure DB is synced then redirect
                handleAuthSuccess(user);
            } else {
                showVerificationScreen(user.email);
                startVerificationPolling(user);
            }
        }
    });

    // --- 1. GOOGLE SIGN IN ---
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            showStatus("Connecting to Google...", "processing");
            auth.signInWithPopup(googleProvider)
                .then(result => {
                    // Google users are verified by default
                    handleAuthSuccess(result.user);
                })
                .catch(err => handleAuthError(err));
        });
    }

    // --- 2. EMAIL LOGIN ---
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-password').value.trim();
            if(!email || !pass) return showStatus("Enter email and password.", "error");

            showStatus("Verifying...", "processing");
            auth.signInWithEmailAndPassword(email, pass)
                .then(result => {
                    if (result.user.emailVerified) {
                        handleAuthSuccess(result.user);
                    } else {
                        showVerificationScreen(email);
                        startVerificationPolling(result.user);
                    }
                })
                .catch(err => showStatus(err.message, "error"));
        });
    }

    // --- 3. SIGN UP ---
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const pass = document.getElementById('signup-password').value.trim();

            if(!name || !email) return showStatus("Name and Email required.", "error");
            if(pass.length < 6) return showStatus("Password must be 6+ chars.", "error");

            showStatus("Creating Account...", "processing");

            auth.createUserWithEmailAndPassword(email, pass)
                .then(res => {
                    // Update Auth Profile
                    return res.user.updateProfile({ displayName: name }).then(() => res.user);
                })
                .then(user => {
                    // Send Email
                    user.sendEmailVerification();
                    // Create DB Profile immediately
                    return db.collection('users').doc(user.uid).set({
                        displayName: name,
                        email: email,
                        bio: "New Artist",
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        isVerified: false
                    }).then(() => user);
                })
                .then(user => {
                    showStatus("", "");
                    showVerificationScreen(email);
                    startVerificationPolling(user);
                })
                .catch(err => showStatus(err.message, "error"));
        });
    }

    // --- HELPERS ---

    // THE FIX: Smart Redirect that ensures DB Profile exists
    function handleAuthSuccess(user) {
        showStatus("Syncing Profile...", "success");
        
        const userRef = db.collection('users').doc(user.uid);
        
        userRef.get().then(doc => {
            if (!doc.exists) {
                // If Google Login (First Time), create the doc now
                return userRef.set({
                    displayName: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    bio: "New Artist",
                    photoURL: user.photoURL || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isVerified: true
                });
            } else {
                // Just update login time
                return userRef.update({ 
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    isVerified: true 
                });
            }
        }).then(() => {
            window.location.href = 'profile.html';
        }).catch(e => {
            console.error(e);
            // Even if DB fails, let them in
            window.location.href = 'profile.html';
        });
    }

    function startVerificationPolling(user) {
        if(pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(async () => {
            await user.reload();
            if (user.emailVerified) {
                clearInterval(pollInterval);
                handleAuthSuccess(user);
            }
        }, 3000);
    }

    function showVerificationScreen(email) {
        if(authCard) authCard.style.display = 'none';
        if(verifyOverlay) {
            verifyOverlay.style.display = 'block';
            if(verifyEmailDisplay) verifyEmailDisplay.innerText = email;
        }
    }

    function showStatus(msg, type) {
        if(!statusMsg) return;
        statusMsg.innerText = msg;
        statusMsg.className = 'auth-status-message ' + type;
        statusMsg.style.display = msg ? 'block' : 'none';
    }

    function handleAuthError(error) {
        if (error.code === 'auth/popup-closed-by-user') showStatus("Login cancelled.", "error");
        else showStatus(error.message, "error");
    }

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
});