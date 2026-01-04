// remixer-data.js - Default Audio Assets

// We use procedural generation for "Defaults" to avoid external 404s
// In a real app, these would be mp3/wav URLs.

const DEFAULT_LIBRARY = [
    { id: 'kick1', name: 'Kick Drum (4/4)', type: 'drum', duration: 2.0 },
    { id: 'snare1', name: 'Snare Snap', type: 'drum', duration: 2.0 },
    { id: 'bass1', name: 'Wobble Bass', type: 'bass', duration: 4.0 },
    { id: 'pad1', name: 'Ethereal Pad', type: 'chord', duration: 8.0 },
    { id: 'lead1', name: 'Acid Lead', type: 'lead', duration: 4.0 }
];

// Helper to generate a buffer for these defaults on the fly
async function generateBuffer(type, duration, ctx) {
    const sampleRate = ctx.sampleRate;
    const frames = sampleRate * duration;
    const buffer = ctx.createBuffer(1, frames, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < frames; i++) {
        // Simple synthesis logic
        const t = i / sampleRate;
        if(type === 'drum') {
            // Kick-ish
            const freq = 150 * Math.exp(-10 * t);
            data[i] = Math.sin(2 * Math.PI * freq * t);
        } else if (type === 'bass') {
            // Sawtooth
            const freq = 55;
            data[i] = ((t * freq) % 1) * 2 - 1;
        } else {
            // Noise/Pad
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        
        // Envelope fade out
        if (t > duration - 0.1) {
            data[i] *= (duration - t) / 0.1;
        }
    }
    return buffer;
}