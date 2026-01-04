// profile.js - Profile Logic + Friends Bar
// DEPENDENCY: config.js must be loaded first

let currentUser = null;
let currentItemToShare = null; 

document.addEventListener('DOMContentLoaded', () => {
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    const rtdb = firebase.database();

    // Elements
    const profileContent = document.getElementById('profile-content');
    const loginPrompt = document.getElementById('login-prompt');
    const loadingState = document.getElementById('loading-state');
    
    // Sidebar & Modal Elements
    const sidebar = document.getElementById('settings-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const editOverlay = document.getElementById('edit-overlay');
    const editNameInput = document.getElementById('edit-name-input');
    const editBioInput = document.getElementById('edit-bio-input');

    // --- 1. AUTH INITIALIZATION ---
    auth.onAuthStateChanged(user => {
        if(loadingState) loadingState.style.display = 'none';
        
        if (user) {
            if (!user.emailVerified && user.providerData.length > 0 && user.providerData[0].providerId === 'password') {
                alert("Please verify your email address.");
                auth.signOut().then(() => window.location.href = 'auth.html');
                return;
            }

            currentUser = user;
            if(profileContent) profileContent.style.display = 'block';
            if(loginPrompt) loginPrompt.style.display = 'none';
            
            // Set Presence (I am Online)
            setPresenceOnline();

            // Load Data
            loadUserProfile();
            loadFriendsList(); // NEW
            loadUserTracks();
            loadCustomTones();
            loadUserPosts();
        } else {
            if(profileContent) profileContent.style.display = 'none';
            if(loginPrompt) loginPrompt.style.display = 'block';
        }
    });

    // --- 2. PRESENCE SYSTEM ---
    function setPresenceOnline() {
        const userStatusRef = rtdb.ref(`users/${currentUser.uid}/status`);
        userStatusRef.set('online');
        userStatusRef.onDisconnect().set('offline'); // Auto offline on close
    }

    // --- 3. FRIENDS LIST LOGIC (NEW) ---
    function loadFriendsList() {
        const scroller = document.getElementById('friends-scroller');
        
        rtdb.ref(`users/${currentUser.uid}/friends`).once('value', snapshot => {
            scroller.innerHTML = ''; // Clear loaders
            
            if (!snapshot.exists()) {
                scroller.innerHTML = '<p style="font-size:0.8em; color:#888; padding:10px;">Add friends to see them here!</p>';
                return;
            }

            snapshot.forEach(child => {
                const friendUid = child.key;
                createFriendItem(friendUid, scroller);
            });
        });
    }

    function createFriendItem(uid, container) {
        // Create skeleton
        const item = document.createElement('a');
        item.className = 'friend-item';
        item.href = `message.html?uid=${uid}`; // Clicking goes to chat
        item.innerHTML = `
            <div class="friend-avatar" id="av-${uid}">?
                <div class="msg-badge" id="badge-${uid}"></div>
            </div>
            <span class="friend-name" id="name-${uid}">...</span>
        `;
        container.appendChild(item);

        // A. Load Name (Firestore)
        db.collection('users').doc(uid).get().then(doc => {
            if(doc.exists) {
                const name = doc.data().displayName;
                document.getElementById(`name-${uid}`).innerText = name.split(' ')[0]; // First name only
                document.getElementById(`av-${uid}`).firstChild.nodeValue = name.charAt(0).toUpperCase();
            }
        });

        // B. Listen for Online Status (RTDB - Green Ring)
        rtdb.ref(`users/${uid}/status`).on('value', snap => {
            const status = snap.val();
            if (status === 'online') item.classList.add('online');
            else item.classList.remove('online');
        });

        // C. Listen for Unread Messages (RTDB - Red Dot)
        // We look at OUR notifications to see if THIS friend sent a message
        rtdb.ref(`notifications/${currentUser.uid}`).orderByChild('read').equalTo(false).on('value', snap => {
            let hasMsg = false;
            snap.forEach(n => {
                const notif = n.val();
                if (notif.type === 'message' && notif.fromUid === uid) {
                    hasMsg = true;
                }
            });
            if (hasMsg) item.classList.add('has-msg');
            else item.classList.remove('has-msg');
        });
    }

    // --- 4. SIDEBAR & EDIT LOGIC (Existing) ---
    function toggleSidebar(show) {
        if(show) { sidebar.classList.add('active'); overlay.classList.add('active'); } 
        else { sidebar.classList.remove('active'); overlay.classList.remove('active'); }
    }

    if(document.getElementById('settings-toggle-btn')) {
        document.getElementById('settings-toggle-btn').addEventListener('click', () => toggleSidebar(true));
    }
    if(document.getElementById('close-sidebar-btn')) {
        document.getElementById('close-sidebar-btn').addEventListener('click', () => toggleSidebar(false));
    }
    if(overlay) overlay.addEventListener('click', () => toggleSidebar(false));

    if(document.getElementById('edit-profile-btn')) {
        document.getElementById('edit-profile-btn').addEventListener('click', () => {
            toggleSidebar(false);
            const currentName = document.getElementById('user-name').innerText;
            const currentBio = document.getElementById('user-bio').innerText;
            editNameInput.value = (currentName === "..." || currentName === "Musician") ? "" : currentName;
            editBioInput.value = (currentBio === "..." || currentBio === "No bio yet.") ? "" : currentBio;
            editOverlay.style.display = 'flex';
        });
    }

    if(document.getElementById('cancel-edit-btn')) {
        document.getElementById('cancel-edit-btn').addEventListener('click', () => editOverlay.style.display = 'none');
    }

    if(document.getElementById('save-profile-btn')) {
        document.getElementById('save-profile-btn').addEventListener('click', () => {
            const newName = editNameInput.value.trim();
            const newBio = editBioInput.value.trim();
            if (!newName) return alert("Display Name cannot be empty.");

            const btn = document.getElementById('save-profile-btn');
            btn.innerText = "Saving...";
            btn.disabled = true;

            db.collection('users').doc(currentUser.uid).set({
                displayName: newName,
                bio: newBio
            }, { merge: true }).then(() => {
                document.getElementById('user-name').innerText = newName;
                document.getElementById('user-bio').innerText = newBio;
                document.getElementById('user-avatar').innerText = newName.charAt(0).toUpperCase();
                editOverlay.style.display = 'none';
                btn.innerText = "Save Changes";
                btn.disabled = false;
                alert("Profile Updated!");
                return currentUser.updateProfile({ displayName: newName });
            }).catch(e => {
                alert("Error saving: " + e.message);
                btn.innerText = "Save Changes";
                btn.disabled = false;
            });
        });
    }

    if(document.getElementById('theme-sidebar-btn')) {
        document.getElementById('theme-sidebar-btn').addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('synthflow_theme', isLight ? 'light' : 'dark');
            toggleSidebar(false);
        });
    }

    if(document.getElementById('logout-btn')) {
        document.getElementById('logout-btn').addEventListener('click', () => {
            if(confirm("Log out?")) {
                // Set offline before logging out
                rtdb.ref(`users/${currentUser.uid}/status`).set('offline')
                    .then(() => auth.signOut())
                    .then(() => window.location.reload());
            }
        });
    }

    // --- 5. DATA LOADING ---
    function loadUserProfile() {
        const authName = currentUser.displayName || currentUser.email.split('@')[0];
        document.getElementById('user-name').innerText = authName;
        document.getElementById('user-avatar').innerText = authName.charAt(0).toUpperCase();

        db.collection('users').doc(currentUser.uid).get().then(doc => {
            if(doc.exists) {
                const data = doc.data();
                const finalName = data.displayName || authName;
                document.getElementById('user-name').innerText = finalName;
                document.getElementById('user-bio').innerText = data.bio || "No bio yet.";
                document.getElementById('user-avatar').innerText = finalName.charAt(0).toUpperCase();
            }
        });

        rtdb.ref(`users/${currentUser.uid}/friends`).once('value', snap => {
            document.getElementById('stat-friends').innerText = snap.exists() ? snap.numChildren() : 0;
        });
    }

    function loadUserTracks() {
        const list = document.getElementById('tracks-list');
        rtdb.ref(`users/${currentUser.uid}/savedKeys`).once('value', snap => {
            list.innerHTML = '';
            const data = snap.val();
            let count = 0;
            if (data) {
                Object.keys(data).forEach(key => {
                    count++;
                    const item = data[key];
                    const div = document.createElement('div');
                    div.className = 'item-card';
                    div.innerHTML = `
                        <div class="item-info"><h4>${item.title || "Untitled"}</h4><p>Recording</p></div>
                        <div>
                            <button class="action-btn btn-share" onclick="openShare('track', '${key}', '${item.title}')">Share</button>
                            <button class="action-btn btn-delete" onclick="deleteItem('track', '${key}')">🗑</button>
                        </div>
                    `;
                    list.appendChild(div);
                });
            } else list.innerHTML = '<p style="text-align:center; color:#666;">No tracks yet.</p>';
            document.getElementById('stat-tracks').innerText = count;
        });
    }

    function loadCustomTones() {
        const list = document.getElementById('assets-list');
        rtdb.ref(`users/${currentUser.uid}/customTones`).once('value', snap => {
            list.innerHTML = '';
            const data = snap.val();
            if (data) {
                Object.keys(data).forEach(key => {
                    const item = data[key];
                    const div = document.createElement('div');
                    div.className = 'item-card';
                    div.innerHTML = `
                        <div class="item-info"><h4>${item.name}</h4><p>${item.wave}</p></div>
                        <div>
                            <button class="action-btn btn-share" onclick="openShare('tone', '${key}', '${item.name}')">Share</button>
                            <button class="action-btn btn-delete" onclick="deleteItem('tone', '${key}')">🗑</button>
                        </div>
                    `;
                    list.appendChild(div);
                });
            } else list.innerHTML = '<p style="text-align:center; color:#666;">No custom tones.</p>';
        });
    }

    function loadUserPosts() {
        const list = document.getElementById('posts-list');
        db.collection('posts').where('authorId', '==', currentUser.uid).orderBy('timestamp', 'desc').get()
          .then(snap => {
              list.innerHTML = '';
              document.getElementById('stat-posts').innerText = snap.size;
              if(!snap.empty) {
                  snap.forEach(doc => {
                      const post = doc.data();
                      const div = document.createElement('div');
                      div.className = 'item-card';
                      div.innerHTML = `
                          <div class="item-info"><h4>${post.asset ? post.asset.title : "Post"}</h4><p>${post.likes ? post.likes.length : 0} Likes</p></div>
                          <button class="action-btn btn-delete" onclick="deleteItem('post', '${doc.id}')">Delete</button>
                      `;
                      list.appendChild(div);
                  });
              } else list.innerHTML = '<p style="text-align:center; color:#666;">No posts yet.</p>';
          });
    }

    // --- 6. GLOBALS ---
    window.deleteItem = (type, id) => {
        if(!confirm("Delete this item?")) return;
        let p;
        if(type==='track') p = rtdb.ref(`users/${currentUser.uid}/savedKeys/${id}`).remove();
        if(type==='tone') p = rtdb.ref(`users/${currentUser.uid}/customTones/${id}`).remove();
        if(type==='post') p = db.collection('posts').doc(id).delete();
        
        p.then(() => {
            if(type==='track') loadUserTracks();
            if(type==='tone') loadCustomTones();
            if(type==='post') loadUserPosts();
        });
    };

    window.openShare = (type, id, title) => {
        currentItemToShare = { type, id, title };
        document.getElementById('share-item-name').innerText = title;
        document.getElementById('share-overlay').style.display = 'flex';
    };

    if(document.getElementById('cancel-share-btn')) {
        document.getElementById('cancel-share-btn').addEventListener('click', () => document.getElementById('share-overlay').style.display = 'none');
    }
    
    if(document.getElementById('confirm-share-btn')) {
        document.getElementById('confirm-share-btn').addEventListener('click', () => {
            const caption = document.getElementById('share-caption').value;
            const { type, id, title } = currentItemToShare;
            
            let fetchP;
            if (type === 'track') fetchP = rtdb.ref(`users/${currentUser.uid}/savedKeys/${id}`).once('value');
            if (type === 'tone') fetchP = rtdb.ref(`users/${currentUser.uid}/customTones/${id}`).once('value');

            fetchP.then(snap => {
                const data = snap.val();
                return db.collection('posts').add({
                    authorId: currentUser.uid,
                    authorName: currentUser.displayName,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    content: caption,
                    type: type === 'track' ? 'recording' : 'tone',
                    likes: [],
                    asset: { title: title, data: type==='track'?data.data:data }
                });
            }).then(() => {
                alert("Posted!");
                document.getElementById('share-overlay').style.display = 'none';
                loadUserPosts();
            });
        });
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
});