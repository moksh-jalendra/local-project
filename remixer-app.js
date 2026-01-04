// remixer-app.js - UI Interaction & Drag-n-Drop

const RemixApp = {
    draggedItem: null,

    init() {
        // Initialize Engine
        RemixEngine.init();
        
        // Add 4 Empty Tracks
        for(let i=0; i<4; i++) this.createTrackUI(`Track ${i+1}`);
        
        this.renderRuler();
    },

    createTrackUI(name) {
        const trackData = RemixEngine.addTrack(name);
        const container = document.getElementById('tracks-container');
        
        const row = document.createElement('div');
        row.className = 'track-row';
        row.dataset.id = trackData.id;
        
        row.innerHTML = `
            <div class="track-header">
                <div class="track-name">${name}</div>
                <div class="track-controls">
                    <button class="track-btn mute" onclick="RemixApp.toggleMute(${trackData.id}, this)">M</button>
                    <button class="track-btn solo" onclick="RemixApp.toggleSolo(${trackData.id}, this)">S</button>
                </div>
            </div>
            <div class="track-lane" ondrop="RemixApp.handleDrop(event, ${trackData.id})" ondragover="event.preventDefault()">
                </div>
        `;
        
        container.appendChild(row);
    },

    renderRuler() {
        const r = document.getElementById('time-ruler');
        // Create 8 markers
        for(let i=0; i<9; i++) {
            const m = document.createElement('div');
            m.className = 'ruler-mark';
            m.innerText = i + 1;
            r.appendChild(m);
        }
    },

    // --- DRAG & DROP ---
    handleDragStart(e, itemData) {
        this.draggedItem = itemData;
        e.dataTransfer.setData('text/plain', JSON.stringify(itemData));
    },

    async handleDrop(e, trackId) {
        e.preventDefault();
        const lane = e.currentTarget;
        const rect = lane.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        
        // Convert px to time (assuming 100px = 1 second for MVP)
        const startTime = offsetX / 100; 
        
        // Generate Audio Buffer
        const ctx = RemixEngine.ctx;
        const buffer = await generateBuffer(this.draggedItem.type, this.draggedItem.duration, ctx);
        
        // Add to Engine
        const track = RemixEngine.tracks[trackId];
        track.clips.push({
            buffer: buffer,
            start: startTime,
            offset: 0,
            duration: this.draggedItem.duration
        });
        
        // Render Clip in UI
        this.renderClip(lane, this.draggedItem.name, offsetX, this.draggedItem.duration * 100);
    },

    renderClip(lane, name, left, width) {
        const clip = document.createElement('div');
        clip.className = 'audio-clip';
        clip.style.left = left + 'px';
        clip.style.width = width + 'px';
        clip.innerText = name;
        lane.appendChild(clip);
    },

    // --- CONTROLS ---
    toggleMute(id, btn) {
        RemixEngine.toggleMute(id);
        btn.classList.toggle('active');
    },
    
    toggleSolo(id, btn) {
        // Simple UI toggle for now
        btn.classList.toggle('active');
    },

    updatePlayhead(percent) {
        const ph = document.getElementById('playhead');
        if(!ph) return;
        // Container width approx calculation
        const container = document.getElementById('tracks-container');
        if(container) {
            const width = container.clientWidth;
            // Offset 120px for header
            const pos = 120 + (width * (percent/100));
            ph.style.transform = `translateX(${pos}px)`;
        }
    }
};

// Bindings
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 3. START BUTTON FIX ---
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-overlay').style.display = 'none';
        
        // THIS LINE WAS MISSING:
        document.querySelector('.casio-wrapper').style.opacity = '1';
        
        // Init logic
        RemixApp.init();
    });

    // Toggle Panel
    const topPanel = document.getElementById('top-panel');
    document.getElementById('panel-toggle').addEventListener('click', () => {
        topPanel.classList.toggle('closed');
    });
    
    // Library Drag Handling
    const libDefaults = document.getElementById('lib-defaults');
    if (libDefaults && typeof DEFAULT_LIBRARY !== 'undefined') {
        DEFAULT_LIBRARY.forEach(item => {
            const el = document.createElement('div');
            el.className = 'lib-item';
            el.draggable = true;
            el.innerHTML = `<span>${item.name}</span> <span>${item.duration}s</span>`;
            
            el.addEventListener('dragstart', (e) => RemixApp.handleDragStart(e, item));
            libDefaults.appendChild(el);
        });
    }
});