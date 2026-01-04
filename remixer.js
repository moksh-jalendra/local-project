// remixer.js - Multi-Track Audio Engine

const RemixEngine = {
    ctx: null,
    masterGain: null,
    tracks: [], // Array of Track Objects
    isPlaying: false,
    startTime: 0,
    pauseTime: 0,
    loopDuration: 8, // Seconds (default 4 bars at 120bpm)
    animationFrame: null,

    init() {
        if(!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
        }
        if(this.ctx.state === 'suspended') this.ctx.resume();
    },

    // --- TRACK MANAGEMENT ---
    addTrack(name) {
        const id = this.tracks.length;
        const gainNode = this.ctx.createGain();
        gainNode.connect(this.masterGain);
        
        const track = {
            id: id,
            name: name,
            gainNode: gainNode,
            clips: [], // { start: sec, buffer: AudioBuffer, offset: sec, duration: sec }
            muted: false,
            solo: false,
            sources: [] // Active source nodes
        };
        this.tracks.push(track);
        return track;
    },

    // --- LOADING AUDIO ---
    async loadSample(urlOrData) {
        // If it's a URL (default sample) or Base64/Blob (user recording)
        // Ideally user recordings are saved as JSON note data in Casio, 
        // but for Remixer we want AudioBuffers.
        // For simplicity: We will generate buffers for "Recordings" or fetch URL for defaults.
        
        if (typeof urlOrData === 'string') {
            // Fetch URL
            const response = await fetch(urlOrData);
            const arrayBuffer = await response.arrayBuffer();
            return await this.ctx.decodeAudioData(arrayBuffer);
        }
        // Handle raw JSON sequence rendering later if needed
        return null; 
    },

    // --- PLAYBACK CONTROLS ---
    play() {
        this.init();
        if(this.isPlaying) return;
        
        this.isPlaying = true;
        this.startTime = this.ctx.currentTime - this.pauseTime;
        
        this.scheduleTracks();
        this.startVisualizer();
    },

    stop() {
        this.isPlaying = false;
        this.pauseTime = 0;
        this.stopAllSources();
        cancelAnimationFrame(this.animationFrame);
        
        // Reset Playhead
        if(window.RemixApp) RemixApp.updatePlayhead(0);
    },

    scheduleTracks() {
        // Simple loop scheduler
        this.tracks.forEach(track => {
            if(track.muted) return;
            
            track.clips.forEach(clip => {
                const source = this.ctx.createBufferSource();
                source.buffer = clip.buffer;
                source.connect(track.gainNode);
                
                // Calculate precise start
                // For looping: we simply re-trigger. 
                // A real DAW needs complex lookahead.
                // We will implement a simple "Start Now" for MVP.
                
                const playTime = this.startTime + clip.start;
                
                if (playTime >= this.ctx.currentTime) {
                    source.start(playTime, clip.offset, clip.duration);
                    track.sources.push(source);
                }
            });
        });
    },

    stopAllSources() {
        this.tracks.forEach(t => {
            t.sources.forEach(s => {
                try { s.stop(); } catch(e){}
            });
            t.sources = [];
        });
    },

    // --- MIXER ---
    toggleMute(trackId) {
        const t = this.tracks[trackId];
        t.muted = !t.muted;
        t.gainNode.gain.value = t.muted ? 0 : 1;
    },

    setMasterVolume(val) {
        if(this.masterGain) this.masterGain.gain.value = val;
    },

    startVisualizer() {
        const update = () => {
            if(!this.isPlaying) return;
            
            // Calculate Playhead %
            const elapsed = this.ctx.currentTime - this.startTime;
            const progress = (elapsed % this.loopDuration) / this.loopDuration;
            
            if(window.RemixApp) RemixApp.updatePlayhead(progress * 100);
            if(window.DisplayModule) DisplayModule.updateTime(elapsed);

            this.animationFrame = requestAnimationFrame(update);
        };
        update();
    }
};