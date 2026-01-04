// casio-right.js

document.addEventListener('DOMContentLoaded', () => {
    
    // Sustain
    const susBtn = document.getElementById('sustain-btn');
    if(susBtn) {
        susBtn.addEventListener('click', () => {
            susBtn.classList.toggle('active');
            const isOn = susBtn.classList.contains('active');
            if(window.AudioEngine) AudioEngine.setSustain(isOn);
            if(window.DisplayModule) {
                DisplayModule.updateIndicators('sus', isOn);
                DisplayModule.ui.text.innerText = isOn ? "SUSTAIN ON" : "SUSTAIN OFF";
            }
        });
    }

    // Play (Placeholder for sequence playback)
    const playBtn = document.getElementById('play-toggle-btn');
    if(playBtn) {
        playBtn.addEventListener('click', () => {
            playBtn.classList.toggle('active');
            // Logic to play recorded tracks would go here
        });
    }
});