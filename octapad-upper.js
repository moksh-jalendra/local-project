// octapad-upper.js - Display Module Logic

window.DisplayModule = {
    currentMode: 'KIT', 
    // Use Global DRUM_KITS from octapad.js
    kits: Object.entries(DRUM_KITS).map(([id, data]) => ({ id: id, title: data.title })),
    patterns: [{id: 'BASIC', title: 'BASIC BEAT'}, {id: 'FUNK', title: 'FUNK GROOVE'}],
    practiceLevels: [{ id: 4, title: "EASY (4 HITS)" }, { id: 8, title: "MED (8 HITS)" }, { id: 12, title: "PRO (12 HITS)" }],
    
    currentIndex: 0,
    selectedKit: 'STANDARD',
    selectedPattern: 'BASIC',
    selectedLevel: 4, 

    ui: {
        get text() { return document.getElementById('lcd-text'); },
        get icon() { return document.getElementById('lcd-status-icon'); },
        get lblKit() { return document.getElementById('label-kit'); },
        get lblPattern() { return document.getElementById('label-pattern'); },
        get lblLearn() { return document.getElementById('label-learn'); },
        get lblVolume() { return document.getElementById('label-volume'); } 
    },

    _showVolumeText() {
        if (window.AudioEngine && window.AudioEngine.masterGain) {
            const v = Math.round(window.AudioEngine.volume * 100);
            this.ui.text.innerText = `VOL: ${v}%`;
        } else {
            this.ui.text.innerText = "READY";
        }
    },

    init() {
        this.setMode('KIT');
    },
    
    setMode(mode) {
        this.currentMode = mode;
        this.currentIndex = 0;
        this.updateLabels();
        
        if (mode === 'KIT') {
            this.selectedKit = this.kits[0] ? this.kits[0].id : 'STANDARD';
            if(window.AudioEngine) this.updatePadLabels(); 
        }
        if (mode === 'PATTERN') {
            this.selectedPattern = this.patterns[0] ? this.patterns[0].id : 'BASIC';
        }
        if (mode === 'LEARN') {
            this.selectedLevel = this.practiceLevels[0] ? this.practiceLevels[0].id : 4;
        }
        
        this.renderCurrent(); 
    },

    updateLabels() {
        if (!this.ui.lblKit) return;
        
        this.ui.lblKit.classList.remove('active');
        this.ui.lblPattern.classList.remove('active');
        this.ui.lblLearn.classList.remove('active');
        if(this.ui.lblVolume) this.ui.lblVolume.classList.remove('active'); 

        if (this.currentMode === 'KIT') {
            this.ui.lblKit.classList.add('active');
        } else if (this.currentMode === 'PATTERN') {
            this.ui.lblPattern.classList.add('active');
        } else if (this.currentMode === 'LEARN') {
            this.ui.lblLearn.classList.add('active');
        } else {
            if(this.ui.lblVolume) this.ui.lblVolume.classList.add('active'); 
        }
    },
    
    updatePadLabels() {
        const kit = DRUM_KITS[this.selectedKit] || DRUM_KITS['STANDARD'];
        const padNames = kit.labels;
        
        const pads = document.querySelectorAll('.pad');
        const padTypes = ['crash', 'ride', 'tom1', 'tom2', 'hihat', 'snare', 'kick', 'clap']; 

        pads.forEach(pad => {
            const padType = pad.dataset.sound;
            const index = padTypes.indexOf(padType);
            
            if (index !== -1 && padNames[index]) {
                const span = pad.querySelector('span');
                if (span) {
                    span.innerText = padNames[index];
                }
            }
        });
    },

    getFullList() {
        if (this.currentMode === 'KIT') return this.kits;
        if (this.currentMode === 'PATTERN') return this.patterns;
        if (this.currentMode === 'LEARN') return this.practiceLevels;
        return [];
    },

    navigate(dir) {
        const list = this.getFullList();
        if (list.length === 0) return this._showVolumeText(); 

        this.currentIndex += dir;
        if (this.currentIndex < 0) this.currentIndex = list.length - 1;
        if (this.currentIndex >= list.length) this.currentIndex = 0;

        this.renderCurrent();

        const item = list[this.currentIndex];
        
        if (this.currentMode === 'KIT') {
            this.selectedKit = item.id;
            if(window.AudioEngine) AudioEngine.setCurrentKit(this.selectedKit);
            this.tempMessage(`KIT: ${this.selectedKit} LOADED`);
            this.updatePadLabels(); 
        } else if (this.currentMode === 'LEARN') {
            this.selectedLevel = item.id;
        }
    },

    renderCurrent() {
        const list = this.getFullList();
        const mode = this.currentMode;
        
        if (mode === 'KIT' || mode === 'PATTERN' || mode === 'LEARN') {
            if (list.length === 0) {
                this.ui.text.innerText = `${mode} EMPTY`;
                return;
            }
            const item = list[this.currentIndex];
            let name = (item.title || "Untitled").toUpperCase();
            this.ui.text.innerText = name.length > 12 ? name.substring(0, 11) + ".." : name;
        } else {
            this._showVolumeText(); 
        }
    },

    tempMessage(msg, duration=1500) {
        const prev = this.ui.text.innerText;
        this.ui.text.innerText = msg.toUpperCase();
        
        setTimeout(() => {
            if(this.ui.text.innerText === msg.toUpperCase() && (!window.AudioEngine || !AudioEngine.isRecording)) {
                this.renderCurrent();
            }
        }, duration);
    },

    setRec(active) {
        if(active) { 
            this.ui.icon.classList.add('recording'); 
            this.ui.text.innerText="REC...";
            this.ui.lblKit.classList.remove('active');
            this.ui.lblPattern.classList.remove('active');
            this.ui.lblLearn.classList.remove('active');
            if(this.ui.lblVolume) this.ui.lblVolume.classList.remove('active');
        } else { 
            this.ui.icon.classList.remove('recording'); 
            this.updateLabels(); 
            this.renderCurrent(); 
        }
    },
    
    getCurrentLevel() { return this.selectedLevel; }
};

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>window.DisplayModule.init());
else window.DisplayModule.init()