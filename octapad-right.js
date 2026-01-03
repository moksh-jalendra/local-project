// octapad-right.js - Right Panel Logic & Saving
// DEPENDENCY: config.js must be loaded first

document.addEventListener('DOMContentLoaded', () => {
    
    // Use Global Auth & RTDB (Realtime DB)
    // 'auth' and 'rtdb' are defined in config.js

    const PracticeManager = {
        isActive: false,
        fullSequence: [], 
        chunkSize: 4,
        inputIndex: 0, 
        demoTimers: [],

        generateSequence(length) {
            const pads = ['kick', 'snare', 'hihat', 'tom1', 'clap'];
            this.fullSequence = Array.from({ length: length }, () => pads[Math.floor(Math.random() * pads.length)]);
            this.chunkSize = length;
            return this.fullSequence;
        },

        start(difficulty) {
            this.isActive = true;
            this.chunkSize = difficulty;
            this.generateSequence(difficulty); 
            this.inputIndex = 0;
            
            document.getElementById('play-toggle-btn').classList.add('active');
            if(window.AudioEngine) AudioEngine.resumeContext();
            
            this.playDemoChunk();
        },

        stop() {
            this.isActive = false;
            this.clear();
            document.getElementById('play-toggle-btn').classList.remove('active');
            if(window.DisplayModule) DisplayModule.setMode('KIT'); 
        },

        playDemoChunk() {
            this.clear();
            if(window.DisplayModule) DisplayModule.tempMessage("WATCH THE PADS");
            
            let delay = 0;
            this.fullSequence.forEach((padType) => {
                this.demoTimers.push(setTimeout(() => {
                    if(window.AudioEngine) AudioEngine.triggerSound(padType);
                    
                    const padEl = document.querySelector(`.pad[data-sound="${padType}"]`);
                    if(padEl) {
                        padEl.classList.add('hit');
                        setTimeout(() => padEl.classList.remove('hit'), 200);
                    }
                }, delay));
                delay += 500;
            });

            this.demoTimers.push(setTimeout(() => {
                this.inputIndex = 0;
                if(window.DisplayModule) DisplayModule.tempMessage("YOUR TURN!");
            }, delay + 200));
        },

        checkInput(padType) {
            if(!this.isActive) return;
            
            const targetPad = this.fullSequence[this.inputIndex];

            if(padType === targetPad) {
                this.inputIndex++;
                
                if(this.inputIndex >= this.fullSequence.length) {
                    if(window.DisplayModule) DisplayModule.tempMessage("PERFECT!");
                    setTimeout(() => this.stop(), 1000);
                }
            } 
            else {
                if(window.DisplayModule) DisplayModule.tempMessage("TRY AGAIN");
                this.inputIndex = 0; 
                setTimeout(() => this.playDemoChunk(), 1000);
            }
        },

        clear() {
            this.demoTimers.forEach(clearTimeout); this.demoTimers = [];
            document.querySelectorAll('.pad.hit').forEach(p => p.classList.remove('hit'));
        }
    };

    window.onOctapadHit = (padType) => PracticeManager.checkInput(padType);

    const playBtn = document.getElementById('play-toggle-btn');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if(window.AudioEngine) AudioEngine.resumeContext();
            
            if (AudioEngine.playbackTimeouts.length > 0) {
                 AudioEngine.stopPlayback();
                 playBtn.classList.remove('active');
                 DisplayModule.tempMessage("STOPPED");
                 return;
            }

            if (window.DisplayModule && DisplayModule.currentMode === 'LEARN') {
                if (PracticeManager.isActive) {
                    PracticeManager.stop();
                    return;
                }
                const level = DisplayModule.getCurrentLevel(); 
                PracticeManager.start(level);
                return;
            }

            const seq = AudioEngine.recordedSequence;
            if(seq && seq.length > 0) {
                playBtn.classList.add('active');
                DisplayModule.tempMessage("PLAYING TRACK");
                if(window.AudioEngine) {
                    AudioEngine.playSequence(seq, () => {
                        playBtn.classList.remove('active');
                        DisplayModule.tempMessage("DONE");
                    });
                }
            } else {
                DisplayModule.tempMessage("EMPTY RECORDING");
            }
        });
    }

    const recBtn = document.getElementById('record-toggle-btn');
    if(recBtn) {
        recBtn.addEventListener('click', () => {
            if (!auth.currentUser) return alert("Login required to record and save tracks.");
            
            if(window.AudioEngine) AudioEngine.resumeContext();

            if (AudioEngine.isRecording) {
                const seq = AudioEngine.stopRecording();
                recBtn.classList.remove('active');
                DisplayModule.setRec(false); 
                
                if (seq.length > 0) {
                    const title = prompt("Name your beat:", "My Octapad Beat");
                    if (title) {
                        DisplayModule.tempMessage("SAVING...");
                        // Use 'rtdb' global for Realtime Database
                        rtdb.ref('users/'+auth.currentUser.uid+'/savedKeys/').push({
                            type:'octapad-recording', title: title, data: seq, timestamp: Date.now()
                        }).then(() => DisplayModule.tempMessage("SAVED!"));
                    }
                } else {
                    DisplayModule.tempMessage("NO HITS");
                }
            } else {
                AudioEngine.startRecording();
                recBtn.classList.add('active');
                DisplayModule.setRec(true); 
            }
        });
    }
    
    const learnBtn = document.getElementById('learn-btn');
    if (learnBtn) {
        learnBtn.addEventListener('click', () => {
            if (!auth.currentUser) return alert("Login required.");
            
            if(PracticeManager.isActive) PracticeManager.stop();

            if (window.DisplayModule.currentMode === 'LEARN') {
                window.DisplayModule.setMode('KIT'); 
            } else {
                window.DisplayModule.setMode('LEARN');
                window.DisplayModule.tempMessage("SELECT LEVEL");
            }
        });
    }

    const navUpBtn = document.getElementById('screen-up-btn');
    const navDownBtn = document.getElementById('screen-down-btn');
    
    if(navUpBtn) navUpBtn.addEventListener('click', () => {
        if (window.DisplayModule.currentMode === 'KIT' || window.DisplayModule.currentMode === 'PATTERN' || window.DisplayModule.currentMode === 'LEARN') {
            window.DisplayModule.navigate(-1); 
        } else {
             if(window.AudioEngine) AudioEngine.setVolume(AudioEngine.volume + 0.1); 
        }
    });

    if(navDownBtn) navDownBtn.addEventListener('click', () => {
        if (window.DisplayModule.currentMode === 'KIT' || window.DisplayModule.currentMode === 'PATTERN' || window.DisplayModule.currentMode === 'LEARN') {
            window.DisplayModule.navigate(1); 
        } else {
            if(window.AudioEngine) AudioEngine.setVolume(AudioEngine.volume - 0.1); 
        }
    });
});