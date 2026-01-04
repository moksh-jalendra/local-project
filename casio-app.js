// casio-app.js - Main App Logic (Firebase & Recorder)
// DEPENDENCY: config.js

document.addEventListener('DOMContentLoaded', () => {
    
    // Globals from config.js
    const auth = firebase.auth();
    const db = firebase.database(); // RTDB for tracks

    let isRecording = false;
    let recordingData = [];
    let recStartTime = 0;

    // --- 1. RECORDER ---
    window.CasioApp = {
        logNote(note) {
            if(isRecording) {
                recordingData.push({
                    note: note,
                    time: Date.now() - recStartTime
                });
            }
        }
    };

    const recBtn = document.getElementById('record-toggle-btn');
    if(recBtn) {
        recBtn.addEventListener('click', () => {
            if(!auth.currentUser) return alert("Login to record.");

            if(!isRecording) {
                // START
                isRecording = true;
                recordingData = [];
                recStartTime = Date.now();
                recBtn.classList.add('active');
                if(window.DisplayModule) DisplayModule.updateIndicators('rec', true);
                if(window.DisplayModule) DisplayModule.ui.text.innerText = "REC...";
            } else {
                // STOP & SAVE
                isRecording = false;
                recBtn.classList.remove('active');
                if(window.DisplayModule) DisplayModule.updateIndicators('rec', false);
                
                if(recordingData.length > 0) {
                    const title = prompt("Name your track:", "My Piano Melody");
                    if(title) {
                        db.ref(`users/${auth.currentUser.uid}/savedKeys`).push({
                            type: 'piano',
                            title: title,
                            data: recordingData,
                            timestamp: Date.now()
                        });
                        alert("Saved!");
                    }
                }
            }
        });
    }

    // --- 2. STARTUP ---
    const startBtn = document.getElementById('start-btn');
    if(startBtn) {
        startBtn.addEventListener('click', () => {
            document.getElementById('start-overlay').style.display = 'none';
            document.querySelector('.casio-wrapper').style.opacity = '1';
            AudioEngine.init();
        });
    }

    // --- 3. TOGGLE LABELS ---
    const lblBtn = document.getElementById('labels-btn');
    const mainKeys = document.getElementById('main-keys');
    if(lblBtn) {
        lblBtn.addEventListener('click', () => {
            mainKeys.classList.toggle('show-labels');
        });
    }
});