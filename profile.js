// profile.js - Profile Logic (Fixed Saving & Name Display)
// DEPENDENCY: config.js must be loaded first

let currentUser = null;
let currentItemToShare = null; 

document.addEventListener('DOMContentLoaded', () => {
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    const rtdb = firebase.database();

    // DOM Elements
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
            // Security Check
            if (!user.emailVerified && user.providerData.length > 0 && user.providerData[0].providerId === 'password') {
                alert("Please verify your email address.");
                auth.signOut().then(() => window.location.href = 'auth.html');
                return;
            }

            currentUser = user;
            if(profileContent) profileContent.style.display = 'block';
            if(loginPrompt) loginPrompt.style.display = 'none';
            
            // LOAD DATA
            loadUserProfile();
            loadUserTracks();
            loadCustomTones();
            loadUserPosts();
        } else {
            if(profileContent) profileContent.style.display = 'none';
            if(loginPrompt) loginPrompt.style.display = 'block';
        }
    });

    // --- 2. DATA LOADING (Fixed Name Logic) ---
    function loadUserProfile() {
        // A. Set Instant Fallback from Auth Object (Fastest)
        const authName = currentUser.displayName || currentUser.email.split('@')[0];
        document.getElementById('user-name').innerText = authName;
        document.getElementById('user-avatar').innerText = authName.charAt(0).toUpperCase();

        // B. Fetch Details from Database (Slower but more complete)
        db.collection('users').doc(currentUser.uid).get().then(doc => {
            if(doc.exists) {
                const data = doc.data();
                // Prefer DB name, fallback to Auth name
                const finalName = data.displayName || authName;
                document.getElementById('user-name').innerText = finalName;
                document.getElementById('user-bio').innerText = data.bio || "No bio yet.";
                document.getElementById('user-avatar').innerText = finalName.charAt(0).toUpperCase();
            } else {
                // If doc missing, self-heal
                db.collection('users').doc(currentUser.uid).set({
                    displayName: authName,
                    email: currentUser.email,
                    bio: "New Artist"
                }, { merge: true });
            }
        });

        // Friends Count
        rtdb.ref(`users/${currentUser.uid}/friends`).once('value', snap => {
            const count = snap.exists() ? snap.numChildren() : 0;
            document.getElementById('stat-friends').innerText = count;
        });
    }

    // --- 3. SIDEBAR LOGIC ---
    function toggleSidebar(show) {
        if(show) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    }

    document.getElementById('settings-toggle-btn').addEventListener('click', () => toggleSidebar(true));
    document.getElementById('close-sidebar-btn').addEventListener('click', () => toggleSidebar(false));
    overlay.addEventListener('click', () => toggleSidebar(false));

    // --- 4. EDIT PROFILE (Fixed Saving) ---
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        toggleSidebar(false);
        // Pre-fill inputs
        editNameInput.value = document.getElementById('user-name').innerText;
        const currentBio = document.getElementById('user-bio').innerText;
        editBioInput.value = (currentBio === "No bio yet." || currentBio === "...") ? "" : currentBio;
        editOverlay.style.display = 'flex';
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        editOverlay.style.display = 'none';
    });

    document.getElementById('save-profile-btn').addEventListener('click', () => {
        const newName = editNameInput.value.trim();
        const newBio = editBioInput.value.trim();

        if (!newName) return alert("Name cannot be empty.");

        const btn = document.getElementById('save-profile-btn');
        const originalText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        // THE FIX: Use .set() with merge:true instead of .update()
        // This creates the document if it doesn't exist, preventing the freeze.
        db.collection('users').doc(currentUser.uid).set({
            displayName: newName,
            bio: newBio
        }, { merge: true }).then(() => {
            // Also update Auth profile
            return currentUser.updateProfile({ displayName: newName });
        }).then(() => {
            // Update UI
            document.getElementById('user-name').innerText = newName;
            document.getElementById('user-bio').innerText = newBio || "No bio yet.";
            document.getElementById('user-avatar').innerText = newName.charAt(0).toUpperCase();
            
            editOverlay.style.display = 'none';
            alert("Profile Saved!");
        }).catch(e => {
            alert("Error: " + e.message);
        }).finally(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        });
    });

    // --- 5. OTHER ACTIONS ---
    document.getElementById('theme-sidebar-btn').addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('synthflow_theme', isLight ? 'light' : 'dark');
        toggleSidebar(false);
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        if(confirm("Log out?")) {
            auth.signOut().then(() => window.location.reload());
        }
    });

    // --- 6. EXISTING LISTS (Tracks/Posts) ---
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

    // --- 7. GLOBALS & TABS ---
    window.deleteItem = (type, id) => {
        if(!confirm("Delete this?")) return;
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

    document.getElementById('cancel-share-btn').addEventListener('click', () => document.getElementById('share-overlay').style.display = 'none');
    
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

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
});