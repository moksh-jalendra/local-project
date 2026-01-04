// profileview.js - View Other Users
// DEPENDENCY: config.js must be loaded first

let currentUser = null;
let targetUid = null;

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Get Target UID from URL
    const urlParams = new URLSearchParams(window.location.search);
    targetUid = urlParams.get('uid');

    if (!targetUid) {
        alert("User not found");
        window.location.href = 'feed.html';
        return;
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    const rtdb = firebase.database();

    // 2. Auth State
    auth.onAuthStateChanged(user => {
        currentUser = user;
        
        // If viewing self, redirect to edit profile
        if (currentUser && currentUser.uid === targetUid) {
            window.location.href = 'profile.html';
            return;
        }

        loadTargetProfile();
        if (currentUser) checkFriendStatus();
    });

    // --- 3. LOAD DATA ---
    function loadTargetProfile() {
        // A. Profile Info (Firestore)
        db.collection('users').doc(targetUid).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('view-name').innerText = data.displayName || "Musician";
                document.getElementById('header-name').innerText = data.displayName || "Profile";
                document.getElementById('view-bio').innerText = data.bio || "No bio available.";
                document.getElementById('view-avatar').innerText = (data.displayName || "U").charAt(0).toUpperCase();
                
                document.getElementById('loading-state').style.display = 'none';
                document.getElementById('profile-content').style.display = 'block';
            } else {
                alert("User profile not found.");
            }
        });

        // B. Tracks & Stats (RTDB)
        rtdb.ref(`users/${targetUid}`).once('value', snap => {
            const data = snap.val() || {};
            
            // Stats
            const tracks = data.savedKeys ? Object.keys(data.savedKeys).length : 0;
            const friends = data.friends ? Object.keys(data.friends).length : 0;
            document.getElementById('view-tracks-count').innerText = tracks;
            document.getElementById('view-friends-count').innerText = friends;

            // Render Tracks
            const list = document.getElementById('tracks-list');
            list.innerHTML = '';
            if (data.savedKeys) {
                Object.keys(data.savedKeys).forEach(key => {
                    const item = data.savedKeys[key];
                    const div = document.createElement('div');
                    div.className = 'item-card';
                    div.innerHTML = `
                        <div class="item-info">
                            <h4>🎵 ${item.title || "Untitled"}</h4>
                            <small>${new Date(item.timestamp).toLocaleDateString()}</small>
                        </div>
                        `;
                    list.appendChild(div);
                });
            } else {
                list.innerHTML = "<p style='color:#777;text-align:center;'>No public tracks.</p>";
            }
        });

        // C. Posts (Firestore)
        db.collection('posts').where('authorId', '==', targetUid).orderBy('timestamp', 'desc').get()
            .then(snap => {
                document.getElementById('view-posts-count').innerText = snap.size;
                const list = document.getElementById('posts-list');
                list.innerHTML = '';
                snap.forEach(doc => {
                    const post = doc.data();
                    const div = document.createElement('div');
                    div.className = 'item-card';
                    div.innerHTML = `<div class="item-info"><h4>📄 ${post.content.substring(0,30)}...</h4></div>`;
                    list.appendChild(div);
                });
                if(snap.empty) list.innerHTML = "<p style='color:#777;text-align:center;'>No posts yet.</p>";
            });
    }

    // --- 4. FRIEND LOGIC ---
    const friendBtn = document.getElementById('friend-btn');
    const msgBtn = document.getElementById('message-btn');

    function checkFriendStatus() {
        // Check if already friends
        rtdb.ref(`users/${currentUser.uid}/friends/${targetUid}`).once('value', snap => {
            if (snap.exists()) {
                // ALREADY FRIENDS
                friendBtn.innerText = "Friends ✔";
                friendBtn.disabled = true;
                msgBtn.style.display = "inline-block";
                msgBtn.onclick = () => window.location.href = `message.html?uid=${targetUid}`;
            } else {
                // Check if request sent
                rtdb.ref(`notifications/${targetUid}`).orderByChild('fromUid').equalTo(currentUser.uid).once('value', notifSnap => {
                    let sent = false;
                    notifSnap.forEach(child => {
                        if (child.val().type === 'friend_request') sent = true;
                    });

                    if (sent) {
                        friendBtn.innerText = "Request Sent";
                        friendBtn.disabled = true;
                    } else {
                        friendBtn.innerText = "Add Friend";
                        friendBtn.disabled = false;
                        friendBtn.onclick = sendFriendRequest;
                    }
                });
            }
        });
    }

    function sendFriendRequest() {
        if (!currentUser) return alert("Login to add friends");
        
        friendBtn.innerText = "Sending...";
        
        // Push Notification to Target
        rtdb.ref(`notifications/${targetUid}`).push({
            type: 'friend_request',
            fromUid: currentUser.uid,
            fromName: currentUser.displayName,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        }).then(() => {
            friendBtn.innerText = "Request Sent";
            friendBtn.disabled = true;
        });
    }

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
});