// octapad-left.js - Left Panel Logic

document.addEventListener('DOMContentLoaded', () => {
    const kitBtn = document.getElementById('kit-mode-btn');
    if (kitBtn) {
        kitBtn.addEventListener('click', () => {
            if (window.DisplayModule) {
                window.DisplayModule.setMode('KIT');
                window.DisplayModule.renderCurrent(); 
            }
        });
    }

    const patternBtn = document.getElementById('pattern-mode-btn');
    if (patternBtn) {
        patternBtn.addEventListener('click', () => {
            if (window.DisplayModule) {
                window.DisplayModule.setMode('PATTERN');
                window.DisplayModule.renderCurrent(); 
            }
        });
    }
    
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
        fsBtn.addEventListener('click', toggleFullScreen);
    }
});