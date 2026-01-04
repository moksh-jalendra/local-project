// message.js - Real-Time Chat Engine
// DEPENDENCY: config.js

document.addEventListener('DOMContentLoaded', () => {
    
    // Config
    const auth = firebase.auth();
    const db = firebase.firestore();
    const rtdb = firebase.database();

    let currentUser = null;
    let targetUid = null;
    let chatId = null;

    // Elements
    const list = document.getElementById('message-list');
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    const title = document.getElementById('chat-title');

    // 1. Get Target User
    const urlParams = new URLSearchParams(window.location.search);
    targetUid = urlParams.get('uid');

    if (!targetUid) {
        alert("No user selected.");
        window.location.href = 'feed.html';
        return;
    }

    // 2. Auth Check
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            initChat();
        } else {
            window.location.href = 'auth.html';
        }
    });

    // 3. Initialize
    function initChat() {
        // A. Load Target Info (Name)
        db.collection('users').doc(targetUid).get().then(doc => {
            if (doc.exists) {
                title.innerText = doc.data().displayName || "User";
            } else {
                title.innerText = "Unknown User";
            }
        });

        // B. Generate Chat ID (Sort UIDs alphabetically to match)
        const ids = [currentUser.uid, targetUid].sort();
        chatId = ids.join('_');

        // C. Load Messages
        loadMessages();
    }

    // 4. Load Messages (Realtime Listener)
    function loadMessages() {
        rtdb.ref('messages/' + chatId).limitToLast(50).on('value', snapshot => {
            list.innerHTML = ''; // Clear loader/old
            
            if (!snapshot.exists()) {
                list.innerHTML = '<p style="text-align:center;color:#777;margin-top:20px;">Start the conversation! 👋</p>';
                return;
            }

            let lastDate = null;

            snapshot.forEach(child => {
                const msg = child.val();
                renderMessage(msg, lastDate);
                lastDate = new Date(msg.timestamp).toDateString();
            });

            // Auto Scroll to bottom
            setTimeout(() => {
                const main = document.querySelector('.chat-section');
                main.scrollTop = main.scrollHeight;
            }, 100);
        });
    }

    function renderMessage(msg, lastDate) {
        // Date Divider
        const msgDate = new Date(msg.timestamp);
        if (msgDate.toDateString() !== lastDate) {
            const div = document.createElement('div');
            div.className = 'date-divider';
            div.innerHTML = `<span>${msgDate.toLocaleDateString()}</span>`;
            list.appendChild(div);
        }

        // Message Bubble
        const div = document.createElement('div');
        const isMe = msg.sender === currentUser.uid;
        div.className = `msg-bubble ${isMe ? 'sent' : 'received'}`;
        
        div.innerHTML = `
            ${escapeHtml(msg.text)}
            <span class="msg-time">${msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        `;
        list.appendChild(div);
    }

    // 5. Send Message
    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        input.value = ''; // Clear input immediately

        // A. Push to Chat
        rtdb.ref('messages/' + chatId).push({
            sender: currentUser.uid,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // B. Send Notification to Target (Optional but recommended)
        rtdb.ref(`notifications/${targetUid}`).push({
            type: 'message',
            fromUid: currentUser.uid,
            message: `New message from ${currentUser.displayName}`,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        });
    }

    // Bind Events
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function escapeHtml(text) {
        if (!text) return "";
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
});