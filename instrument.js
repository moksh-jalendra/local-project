// instrument.js - Logic for Instrument Hub
// DEPENDENCY: config.js must be loaded first

document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize Firebase Auth just to check state
    const auth = firebase.auth();

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("User authorized for studio access.");
            // Optional: You could unlock premium instruments here in the future
        } else {
            console.log("Guest user accessing studio.");
        }
    });

    // Add simple click animation for better feel
    const cards = document.querySelectorAll('.inst-card');
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Optional: Add sound effect on click here
            this.style.opacity = "0.7";
        });
    });
});