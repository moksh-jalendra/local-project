// remixer-left.js
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('play-btn').addEventListener('click', () => {
        RemixEngine.play();
        if(window.DisplayModule) DisplayModule.setStatus('PLAYING');
    });
    
    document.getElementById('stop-btn').addEventListener('click', () => {
        RemixEngine.stop();
        if(window.DisplayModule) DisplayModule.setStatus('STOPPED');
    });
});