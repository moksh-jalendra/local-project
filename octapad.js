// octapad.js - Digital Drum Machine Engine
// DEPENDENCY: config.js

const rtdb = firebase.database();
const auth = firebase.auth();

let audioCtx = null;
let isRecording = false;
let startTime = 0;
let recordedEvents = [];
let currentUser = null;

// --- 1. AUDIO SYNTHESIS ENGINE ---
// Generates drum sounds using Math (Oscillators/Noise)
const DrumSynth = {
    play(type, vol = 1) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const t = audioCtx.currentTime;
        const masterGain = audioCtx.createGain();
        masterGain.gain.value = vol;
        masterGain.connect(audioCtx.destination);

        if (type === 'kick') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
            gain.gain.setValueAtTime(1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.5);
        } 
        else if (type === 'snare') {
            // Noise
            const noise = audioCtx.createBufferSource();
            noise.buffer = this.createNoiseBuffer();
            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 1000;
            const noiseEnv = audioCtx.createGain();
            noiseEnv.gain.setValueAtTime(1, t);
            noiseEnv.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseEnv);
            noiseEnv.connect(masterGain);
            noise.start(t);
            
            // Tone
            const osc = audioCtx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, t);
            const oscEnv = audioCtx.createGain();
            oscEnv.gain.setValueAtTime(0.7, t);
            oscEnv.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.connect(oscEnv);
            oscEnv.connect(masterGain);
            osc.start(t);
        }
        else if (type === 'hihat') {
            const ratio = [2, 3, 4.16, 5.43, 6.79, 8.21];
            ratio.forEach(r => {
                const osc = audioCtx.createOscillator();
                osc.type = 'square';
                osc.frequency.value = 150 * r;
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.1);
            });
        }
        else if (type.includes('tom')) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const freq = type === 'tom1' ? 200 : 150;
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq/2, t + 0.4);
            gain.gain.setValueAtTime(1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.5);
        }
        else if (type === 'crash' || type === 'ride') {
            // Metallic noise approximation
            const osc = audioCtx.createOscillator();
            osc.type = 'square'; // More harmonics
            osc.frequency.value = type==='crash'? 200 : 400; // Modulator
            
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + (type==='crash'?1.5:0.8));
            
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 2);
        }
        else if (type === 'clap') {
            const noise = audioCtx.createBufferSource();
            noise.buffer = this.createNoiseBuffer();
            const env = audioCtx.createGain();
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(1, t + 0.01);
            env.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            noise.connect(env);
            env.connect(masterGain);
            noise.start(t);
        }
    },

    createNoiseBuffer() {
        if (this._noiseBuffer) return this._noiseBuffer;
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this._noiseBuffer = buffer;
        return buffer;
    }
};

// --- 2. INTERACTION LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    
    auth.onAuthStateChanged(u => currentUser = u);

    const pads = document.querySelectorAll('.pad');
    const volSlider = document.getElementById('vol-slider');

    // Handle Pad Click/Touch
    pads.forEach(pad => {
        // Support both mouse and touch
        ['mousedown', 'touchstart'].forEach(evt => 
            pad.addEventListener(evt, (e) => {
                e.preventDefault(); // Prevent double firing on mobile
                triggerPad(pad);
            })
        );
    });

    // Handle Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Prevent machine gunning
        const pad = document.querySelector(`.pad[data-key="${e.key.toLowerCase()}"]`);
        if (pad) triggerPad(pad);
    });

    function triggerPad(pad) {
        const soundType = pad.dataset.sound;
        const volume = volSlider.value / 100;
        
        // 1. Play Sound
        DrumSynth.play(soundType, volume);

        // 2. Visual Animation
        pad.classList.add('hit');
        setTimeout(() => pad.classList.remove('hit'), 100);

        // 3. Record Event
        if (isRecording) {
            const time = Date.now() - startTime;
            recordedEvents.push({ padId: soundType, time: time });
        }
    }

    // --- 3. RECORDING LOGIC ---
    const recordBtn = document.getElementById('record-btn');
    const statusText = document.getElementById('status-text');
    const saveModal = document.getElementById('save-modal');

    recordBtn.addEventListener('click', () => {
        if (!isRecording) {
            // Start
            isRecording = true;
            startTime = Date.now();
            recordedEvents = [];
            recordBtn.classList.add('recording');
            statusText.innerText = "REC 00:00";
            
            // Update Timer UI
            this.timerInterval = setInterval(() => {
                const s = Math.floor((Date.now() - startTime) / 1000);
                statusText.innerText = `REC 00:${s.toString().padStart(2, '0')}`;
            }, 1000);

        } else {
            // Stop
            isRecording = false;
            clearInterval(this.timerInterval);
            recordBtn.classList.remove('recording');
            statusText.innerText = "SAVING...";

            if (recordedEvents.length > 0) {
                saveModal.style.display = 'flex';
            } else {
                statusText.innerText = "READY";
                alert("Nothing was recorded.");
            }
        }
    });

    // --- 4. SAVING LOGIC ---
    document.getElementById('cancel-save').addEventListener('click', () => {
        saveModal.style.display = 'none';
        statusText.innerText = "READY";
    });

    document.getElementById('confirm-save').addEventListener('click', () => {
        if (!currentUser) return alert("Login to save tracks.");
        const name = document.getElementById('track-name').value || "Untitled Beat";

        const trackData = {
            title: name,
            type: 'drum',
            timestamp: Date.now(),
            data: recordedEvents,
            kit: 'standard'
        };

        rtdb.ref(`users/${currentUser.uid}/savedKeys`).push(trackData)
            .then(() => {
                alert("Beat Saved Successfully!");
                saveModal.style.display = 'none';
                statusText.innerText = "READY";
            })
            .catch(e => alert("Error: " + e.message));
    });
});