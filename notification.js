// notification.js - Alerts & Friend Requests
// DEPENDENCY: config.js must be loaded first

document.addEventListener('DOMContentLoaded', () => {
    
    const auth = firebase.auth();
    const rtdb = firebase.database();
    let currentUser = null;

    const list = document.getElementById('notification-list');
    const spinner = document.getElementById('loading-spinner');

    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            loadNotifications(user.uid);
        } else {
            window.location.href = 'auth.html';
        }
    });

    function loadNotifications(uid) {
        // Listen to notifications node
        rtdb.ref(`notifications/${uid}`).on('value', snap => {
            spinner.style.display = 'none';
            list.innerHTML = '';

            if (!snap.exists()) {
                list.innerHTML = '<p class="empty-msg">No new notifications.</p>';
                return;
            }

            const notifs = [];
            snap.forEach(child => {
                notifs.push({ key: child.key, ...child.val() });
            });

            // Reverse to show newest first
            notifs.reverse().forEach(n => renderNotification(n));
        });
    }

    function renderNotification(n) {
        const div = document.createElement('div');
        div.className = `notification-card ${n.read ? '' : 'unread'}`;
        
        let content = '';
        let actions = '';

        // TYPE: Friend Request
        if (n.type === 'friend_request') {
            content = `<a href="profileview.html?uid=${n.fromUid}" style="color:inherit; font-weight:bold;">${n.fromName}</a> sent you a friend request.`;
            if (!n.read) {
                actions = `
                    <div class="notif-actions">
                        <button class="btn-accept" onclick="acceptRequest('${n.key}', '${n.fromUid}', '${n.fromName}')">Accept</button>
                        <button class="btn-decline" onclick="deleteNotification('${n.key}')">Decline</button>
                    </div>
                `;
            } else {
                actions = `<small style="color:#00bfff;">Request Accepted</small>`;
            }
        } 
        // TYPE: Generic (Like/Comment)
        else {
            content = n.message || "New activity.";
        }

        div.innerHTML = `
            <div class="notif-header">
                <span class="notif-title">${getIcon(n.type)} Notification</span>
                <span class="notif-time">${new Date(n.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="notif-body">${content}</div>
            ${actions}
        `;
        list.appendChild(div);
    }

    // --- ACTIONS (Exposed Globally) ---

    window.acceptRequest = (notifKey, fromUid, fromName) => {
        if(!currentUser) return;

        // Atomic Update: Add to My Friends AND Their Friends
        const updates = {};
        updates[`users/${currentUser.uid}/friends/${fromUid}`] = true;
        updates[`users/${fromUid}/friends/${currentUser.uid}`] = true;
        updates[`notifications/${currentUser.uid}/${notifKey}/read`] = true; // Mark read

        rtdb.ref().update(updates).then(() => {
            alert(`You are now friends with ${fromName}!`);
        }).catch(e => alert(e.message));
    };

    window.deleteNotification = (key) => {
        rtdb.ref(`notifications/${currentUser.uid}/${key}`).remove();
    };

    // Helper Icons
    function getIcon(type) {
        if(type === 'friend_request') return '👤';
        if(type === 'like') return '❤️';
        return '🔔';
    }

    // Clear All Read
    document.getElementById('clear-all-btn').addEventListener('click', () => {
        if(!currentUser) return;
        rtdb.ref(`notifications/${currentUser.uid}`).once('value', snap => {
            snap.forEach(child => {
                if(!child.val().read) {
                    child.ref.update({ read: true });
                }
            });
        });
    });
});