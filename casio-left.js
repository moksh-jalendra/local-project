// casio-left.js

document.addEventListener('DOMContentLoaded', () => {
    // Mode Buttons
    const trackBtn = document.getElementById('track-mode-btn');
    const toneBtn = document.getElementById('tone-mode-btn');
    const fsBtn = document.getElementById('fullscreen-btn');

    if(trackBtn) trackBtn.addEventListener('click', () => {
        if(window.DisplayModule) DisplayModule.setMode('TRACK');
    });

    if(toneBtn) toneBtn.addEventListener('click', () => {
        if(window.DisplayModule) DisplayModule.setMode('TONE');
    });

    if(fsBtn) fsBtn.addEventListener('click', () => {
        const d = document.documentElement;
        if(d.requestFullscreen) d.requestFullscreen();
    });
});