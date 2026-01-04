// casio-upper.js

window.DisplayModule = {
    ui: {
        text: document.getElementById('lcd-text'),
        labelTrack: document.getElementById('label-track'),
        labelTone: document.getElementById('label-tone'),
        labelPractice: document.getElementById('label-practice'),
        labelSustain: document.getElementById('label-sustain')
    },

    setMode(mode) {
        // Reset
        this.ui.labelTrack.classList.remove('active');
        this.ui.labelTone.classList.remove('active');
        
        if(mode === 'TRACK') {
            this.ui.labelTrack.classList.add('active');
            this.ui.text.innerText = "TRACK MODE";
        } else if(mode === 'TONE') {
            this.ui.labelTone.classList.add('active');
            this.ui.text.innerText = "GRAND PIANO";
        }
    },

    updateIndicators(type, active) {
        if(type === 'rec') {
            const icon = document.getElementById('lcd-status-icon');
            if(icon) icon.className = active ? 'recording' : '';
        }
        if(type === 'sus') {
            this.ui.labelSustain.style.opacity = active ? 1 : 0.3;
        }
    }
};