// casio.js - Audio Engine & Physics (Scrolling)

// Elements
const refContainer = document.getElementById('ref-keys');
const refScroller = document.getElementById('ref-scroller');
const mainContainer = document.getElementById('main-keys');
const mainScroller = document.querySelector('.main-keyboard-area');

// Audio Context
let audioCtx = null;
let activeOscillators = {}; // Polyphony map
let isSustain = false;      // Sustain State

// --- 1. KEY GENERATION ---
const NOTES = [];
const OCTAVES = [2, 3, 4, 5, 6]; // C2 to C6
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Generate Notes
OCTAVES.forEach(oct => {
    NAMES.forEach(name => {
        NOTES.push(name + oct);
    });
});
NOTES.push("C7"); // End note

function createKey(note, type) {
    const el = document.createElement('div');
    const isBlack = note.includes('#');
    el.className = type === 'ref' ? `ref-key ${isBlack?'black':'white'}` : `key ${isBlack?'black':'white'}`;
    el.dataset.note = note;
    
    if (type === 'main') {
        const span = document.createElement('span');
        span.className = 'key-label';
        span.innerText = note;
        el.appendChild(span);
    }
    return el;
}

function initKeys() {
    if(!refContainer || !mainContainer) return;
    refContainer.innerHTML = ''; mainContainer.innerHTML = '';
    
    // Padding
    mainContainer.appendChild(document.createElement('div')).className = 'boundary-block';

    NOTES.forEach(note => {
        refContainer.appendChild(createKey(note, 'ref'));
        mainContainer.appendChild(createKey(note, 'main'));
    });

    mainContainer.appendChild(document.createElement('div')).className = 'boundary-block';
}
initKeys();

// --- 2. PHYSICS (Synchronized Scrolling) ---
let currentTranslate = 0;
let isDragging = false;
let startPos = 0;
let prevTranslate = 0;
let maxRefScroll = 0;
let maxMainScroll = 0;
let syncRatio = 1;

function calculateBounds() {
    if(!refScroller || !mainScroller) return;
    // Calculate Max Scroll (Negative values)
    maxRefScroll = refScroller.clientWidth - refContainer.scrollWidth;
    maxMainScroll = mainScroller.clientWidth - mainContainer.scrollWidth;
    syncRatio = (maxRefScroll !== 0) ? maxMainScroll / maxRefScroll : 1;
}

function applyTransform(x) {
    // Clamp
    if (x > 0) x = 0;
    if (x < maxRefScroll) x = maxRefScroll;
    
    if(refContainer) refContainer.style.transform = `translateX(${x}px)`;
    if(mainContainer) mainContainer.style.transform = `translateX(${x * syncRatio}px)`;
    
    currentTranslate = x;
}

function getX(e) {
    return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
}

// Drag Logic
if(refScroller) {
    refScroller.addEventListener('mousedown', startDrag);
    refScroller.addEventListener('touchstart', startDrag, {passive: false});
}

function startDrag(e) {
    isDragging = true;
    startPos = getX(e);
    refContainer.style.transition = 'none';
    mainContainer.style.transition = 'none';
}

window.addEventListener('mousemove', moveDrag);
window.addEventListener('touchmove', moveDrag, {passive: false});

function moveDrag(e) {
    if(!isDragging) return;
    // e.preventDefault(); // Optional: allow vertical scroll
    const diff = getX(e) - startPos;
    applyTransform(prevTranslate + diff);
}

window.addEventListener('mouseup', endDrag);
window.addEventListener('touchend', endDrag);

function endDrag() {
    isDragging = false;
    prevTranslate = currentTranslate;
}

window.addEventListener('resize', () => {
    calculateBounds();
    applyTransform(currentTranslate);
});

// --- 3. AUDIO ENGINE ---
const AudioEngine = {
    init() {
        if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if(audioCtx.state === 'suspended') audioCtx.resume();
    },

    getFreq(note) {
        const idx = NOTES.indexOf(note);
        // Base C2 = ~65.41Hz. Adjust offset if needed.
        return 65.41 * Math.pow(2, idx / 12);
    },

    playTone(note) {
        this.init();
        if(activeOscillators[note]) this.stopTone(note); // No overlap

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle'; // Piano-like
        osc.frequency.setValueAtTime(this.getFreq(note), audioCtx.currentTime);
        
        // Attack
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.02);
        
        // Decay/Sustain Logic
        gain.gain.exponentialRampToValueAtTime(isSustain ? 0.3 : 0.001, audioCtx.currentTime + (isSustain ? 2.0 : 0.5));

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();

        activeOscillators[note] = { osc, gain };
    },

    stopTone(note) {
        const active = activeOscillators[note];
        if(!active) return;

        const now = audioCtx.currentTime;
        const release = isSustain ? 1.0 : 0.1;

        active.gain.gain.cancelScheduledValues(now);
        active.gain.gain.setValueAtTime(active.gain.gain.value, now);
        active.gain.gain.exponentialRampToValueAtTime(0.001, now + release);
        active.osc.stop(now + release + 0.1);

        delete activeOscillators[note];
    },
    
    setSustain(state) { isSustain = state; }
};

// --- 4. INPUT HANDLING ---
function handleInput(note, action) {
    if(!note) return;
    
    if(action === 'down') {
        AudioEngine.playTone(note);
        visualize(note, true);
        if(window.DisplayModule) DisplayModule.ui.text.innerText = note;
        // Hook for recording/practice
        if(window.CasioApp && window.CasioApp.logNote) window.CasioApp.logNote(note);
    } else {
        AudioEngine.stopTone(note);
        visualize(note, false);
    }
}

function visualize(note, active) {
    const k = document.querySelector(`.key[data-note="${note}"]`);
    const r = document.querySelector(`.ref-key[data-note="${note}"]`);
    if(k) active ? k.classList.add('active') : k.classList.remove('active');
    if(r) active ? r.classList.add('active-ref') : r.classList.remove('active-ref');
}

// Bind Touches
const keys = document.querySelectorAll('.key');
keys.forEach(k => {
    const n = k.dataset.note;
    k.addEventListener('mousedown', () => handleInput(n, 'down'));
    k.addEventListener('mouseup', () => handleInput(n, 'up'));
    k.addEventListener('mouseleave', () => handleInput(n, 'up'));
    
    k.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(n, 'down'); });
    k.addEventListener('touchend', (e) => { e.preventDefault(); handleInput(n, 'up'); });
});

// Setup Initial Center
window.addEventListener('load', () => {
    setTimeout(() => {
        calculateBounds();
        // Center View
        const mid = maxRefScroll / 2;
        applyTransform(mid);
        prevTranslate = mid;
        currentTranslate = mid;
    }, 500);
});