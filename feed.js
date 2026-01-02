// feed.js - UI & Data Logic (Audio delegated to audio.js)
// DEPENDENCY: config.js and audio.js must be loaded first

let currentUser = null;
let lastDoc = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', () => {
    
    // Globals from config.js
    const auth = firebase.auth();
    const db = firebase.firestore();
    const rtdb = firebase.database();

    // Init
    auth.onAuthStateChanged(user => {
        currentUser = user;
        document.querySelector('.loader-spinner').classList.remove('active');
        fetchPosts(true); // Initial load
        
        if(user) checkNotifications(user.uid);
    });

    // Infinite Scroll
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            fetchPosts();
        }
    });

    // Pull to Refresh
    document.getElementById('pull-to-refresh').addEventListener('click', () => {
        location.reload();
    });
});

// --- 1. POST FETCHING ---
function fetchPosts(isFresh = false) {
    if (isLoading) return;
    isLoading = true;

    if (isFresh) {
        document.getElementById('posts-feed').innerHTML = '';
        lastDoc = null;
    }

    let query = db.collection('posts').orderBy('timestamp', 'desc').limit(10);
    if (lastDoc) query = query.startAfter(lastDoc);

    query.get().then(snapshot => {
        if (snapshot.empty) {
            if(isFresh) document.getElementById('posts-feed').innerHTML = "<p style='text-align:center;color:#888;padding:20px;'>No posts yet.</p>";
            isLoading = false;
            return;
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        
        snapshot.forEach(doc => {
            renderPost(doc.id, doc.data());
        });
        
        isLoading = false;
    }).catch(e => {
        console.error("Feed Error:", e);
        isLoading = false;
    });
}

// --- 2. RENDER LOGIC ---
function renderPost(postId, post) {
    const container = document.getElementById('posts-feed');
    const div = document.createElement('div');
    div.className = 'post-card';
    
    const isLiked = post.likes && currentUser && post.likes.includes(currentUser.uid);
    const likeCount = post.likes ? post.likes.length : 0;
    const timeString = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleString() : 'Just now';
    
    // Check type for icon
    let icon = "🎵";
    if (post.type === 'ai-generated') icon = "🤖";
    
    div.innerHTML = `
        <div class="post-header">
            <div>
                <a href="profileview.html?uid=${post.authorId}" class="post-author">
                    ${escapeHtml(post.authorName)} ${post.authorVerified ? '<span class="verified-badge">✔</span>' : ''}
                </a>
                <span class="post-time">${timeString}</span>
            </div>
            ${currentUser && post.authorId === currentUser.uid ? `<button onclick="deletePost('${postId}')" class="post-options-btn">🗑</button>` : ''}
        </div>

        <div class="post-content">${escapeHtml(post.content)}</div>

        ${post.asset ? `
        <div class="audio-player-box">
            <span class="track-title">${icon} ${escapeHtml(post.asset.title)}</span>
            <div class="player-controls">
                <button id="btn-${postId}" class="listen-btn">▶ Listen</button>
                <div class="audio-progress-bar"><div id="bar-${postId}" class="audio-progress-fill"></div></div>
            </div>
        </div>` : ''}

        <div class="post-footer">
            <button class="action-item ${isLiked ? 'liked' : ''}" onclick="toggleLike('${postId}', this)">
                <span>${isLiked ? '❤️' : '🤍'}</span> <span class="like-count">${likeCount}</span>
            </button>
            <button class="action-item" onclick="alert('Comments coming soon!')">
                <span>💬</span> Comment
            </button>
        </div>
    `;

    container.appendChild(div);

    // Bind Audio Click
    if (post.asset) {
        const btn = div.querySelector(`#btn-${postId}`);
        btn.addEventListener('click', () => handleAudioClick(post, postId));
    }
}

// --- 3. AUDIO HANDLER (Delegates to audio.js) ---
function handleAudioClick(post, postId) {
    const btn = document.getElementById(`btn-${postId}`);
    const bar = document.getElementById(`bar-${postId}`);

    // If currently playing this track, Stop it
    if (AudioPlayer.currentPlayingId === `btn-${postId}`) {
        AudioPlayer.stop();
        resetPlayerUI(postId);
        return;
    }

    // Reset any other playing UI
    if (AudioPlayer.currentPlayingId) {
        const oldId = AudioPlayer.currentPlayingId.replace('btn-', '');
        resetPlayerUI(oldId);
    }

    // Update UI to Playing
    btn.classList.add('playing');
    btn.innerText = "■ Stop";

    // Call Audio Engine
    AudioPlayer.play(
        post,
        { btnId: `btn-${postId}`, barId: `bar-${postId}` },
        (percent) => { if(bar) bar.style.width = percent + "%"; }, // On Progress
        () => resetPlayerUI(postId) // On Finish
    );
}

function resetPlayerUI(postId) {
    const btn = document.getElementById(`btn-${postId}`);
    const bar = document.getElementById(`bar-${postId}`);
    if(btn) {
        btn.classList.remove('playing');
        btn.innerText = "▶ Listen";
    }
    if(bar) bar.style.width = "0%";
}

// --- 4. INTERACTIONS ---
window.toggleLike = (postId, btn) => {
    if (!currentUser) return alert("Login to like posts.");
    
    const countSpan = btn.querySelector('.like-count');
    const iconSpan = btn.querySelector('span'); // Heart icon
    
    const postRef = db.collection('posts').doc(postId);
    
    db.runTransaction(transaction => {
        return transaction.get(postRef).then(doc => {
            if (!doc.exists) throw "Post does not exist!";
            
            const data = doc.data();
            let likes = data.likes || [];
            
            if (likes.includes(currentUser.uid)) {
                likes = likes.filter(id => id !== currentUser.uid); // Unlike
                // Optimistic UI update
                btn.classList.remove('liked');
                iconSpan.innerText = '🤍';
            } else {
                likes.push(currentUser.uid); // Like
                btn.classList.add('liked');
                iconSpan.innerText = '❤️';
            }
            transaction.update(postRef, { likes: likes });
            return likes.length;
        });
    }).then(newCount => {
        countSpan.innerText = newCount;
    }).catch(err => console.error("Like failed", err));
};

window.deletePost = (postId) => {
    if(confirm("Delete this post?")) {
        db.collection('posts').doc(postId).delete()
            .then(() => {
                document.getElementById('posts-feed').innerHTML = ''; // Force refresh
                fetchPosts(true);
            });
    }
};

function checkNotifications(uid) {
    rtdb.ref(`notifications/${uid}`).orderByChild('read').equalTo(false).on('value', snap => {
        const dot = document.getElementById('notify-dot');
        if(dot) dot.style.display = snap.exists() ? 'block' : 'none';
    });
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}