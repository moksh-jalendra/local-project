// audio.js - Centralized Audio Engine for Feed Playback

const AudioPlayer = {
    ctx: null,
    activeNodes: [],
    progressTimer: null,
    currentPlayingId: null,

    // Initialize Audio Context on user gesture
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Main Play Function
    play(post, uiIds, onProgress, onFinish) {
        this.init();
        this.stop(); // Stop any currently playing track

        this.currentPlayingId = uiIds.btnId;
        const type = post.type;
        const data = post.asset.data;
        const kit = post.asset.kit;

        // Detect track type
        if (type === 'recording' || type === 'ai-generated') {
            // Check if it's a drum track (has kit data) or melody
            if (kit || (data.length > 0 && data[0].padId)) {
                this.playDrumTrack(data, kit, onProgress, onFinish);
            } else {
                this.playMelody(data, post.asset.previewTone, onProgress, onFinish);
            }
        }
    },

    stop() {
        // Stop all oscillators and nodes
        this.activeNodes.forEach(n => {
            try { n.stop(); } catch (e) {}
            try { n.disconnect(); } catch (e) {}
        });
        this.activeNodes = [];

        // Clear timers
        if (this.progressTimer) clearInterval(this.progressTimer);
        this.progressTimer = null;
        this.currentPlayingId = null;
    },

    // --- ENGINES ---

    playMelody(sequence, toneType, onProgress, onFinish) {
        if (!Array.isArray(sequence) || sequence.length === 0) {
            if(onFinish) onFinish();
            return;
        }

        const now = this.ctx.currentTime;
        let maxDuration = 0;

        sequence.forEach(note => {
            const startTime = now + (note.time / 1000);
            const duration = (note.duration || 300) / 1000;
            
            this.createOscillator(note.note, startTime, duration, toneType);
            
            if ((note.time + (note.duration || 300)) > maxDuration) {
                maxDuration = note.time + (note.duration || 300);
            }
        });

        this.startProgressTracker(maxDuration, onProgress, onFinish);
    },

    playDrumTrack(sequence, kitConfig, onProgress, onFinish) {
        if (!Array.isArray(sequence) || sequence.length === 0) {
            if(onFinish) onFinish();
            return;
        }

        const now = this.ctx.currentTime;
        let maxDuration = 0;

        sequence.forEach(hit => {
            const startTime = now + (hit.time / 1000);
            // Default to standard kit if config missing
            const padId = hit.padId; 
            // Logic to synthesize drum sound based on padId
            this.synthesizeDrum(padId, startTime);

            if (hit.time > maxDuration) maxDuration = hit.time;
        });

        // Add 1 second buffer for decay
        this.startProgressTracker(maxDuration + 1000, onProgress, onFinish);
    },

    // --- SYNTHESIS ---

    createOscillator(note, time, duration, type) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Tone Selection
        osc.type = 'triangle'; // Default
        if (type === 'PIANO') osc.type = 'triangle'; 
        if (type === 'FLUTE') osc.type = 'sine';
        if (type === 'SYNTH') osc.type = 'sawtooth';

        osc.frequency.value = this.getFreq(note);

        // Envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + duration + 0.1);

        this.activeNodes.push(osc);
    },

    synthesizeDrum(padId, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Simple synthesis map for feed preview
        if(padId.includes('kick')) {
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
            gain.gain.setValueAtTime(1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        } else if(padId.includes('snare')) {
            osc.type = 'triangle';
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        } else {
            // Hihat/Cymbal generic
            osc.type = 'square';
            osc.frequency.value = 800; // High pitch
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        }

        osc.start(time);
        osc.stop(time + 0.5);
        this.activeNodes.push(osc);
    },

    // --- UTILITIES ---

    startProgressTracker(totalDurationMs, onProgress, onFinish) {
        const startTime = Date.now();
        
        this.progressTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const percent = Math.min(100, (elapsed / totalDurationMs) * 100);
            
            if (onProgress) onProgress(percent);

            if (percent >= 100) {
                this.stop();
                if (onFinish) onFinish();
            }
        }, 50);
    },

    getFreq(note) {
        if (!note) return 440;
        const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = parseInt(note.slice(-1));
        const keyIndex = NOTES.indexOf(note.slice(0, -1));
        return 27.5 * Math.pow(2, (octave * 12 + keyIndex) / 12);
    }
};