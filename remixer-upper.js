// remixer-upper.js
window.DisplayModule = {
    ui: {
        status: document.getElementById('ind-status'),
        time: document.getElementById('ind-time')
    },
    setStatus(msg) {
        if(this.ui.status) this.ui.status.innerText = msg;
    },
    updateTime(seconds) {
        const date = new Date(0);
        date.setSeconds(seconds);
        const timeString = date.toISOString().substr(14, 5);
        if(this.ui.time) this.ui.time.innerText = timeString + ":" + Math.floor((seconds % 1)*100);
    }
};