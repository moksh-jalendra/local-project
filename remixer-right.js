// remixer-right.js
document.addEventListener('DOMContentLoaded', () => {
    // Add Track
    document.getElementById('add-track-btn').addEventListener('click', () => {
        RemixApp.createTrackUI(`Track ${RemixEngine.tracks.length + 1}`);
    });

    // Library Modal
    const modal = document.getElementById('library-modal');
    document.getElementById('library-btn').addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('close-lib-btn').addEventListener('click', () => modal.style.display = 'none');

    // Volume
    document.getElementById('master-vol').addEventListener('input', (e) => {
        RemixEngine.setMasterVolume(e.target.value / 100);
    });
});