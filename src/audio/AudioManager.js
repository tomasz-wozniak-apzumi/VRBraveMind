import * as THREE from 'three';

let audioListenerGlobal;
let tinnitusActive = false;
let currentTinnitusOsc = null;
let currentTinnitusGain = null;

export function initAudio(camera) {
    audioListenerGlobal = new THREE.AudioListener();
    camera.add(audioListenerGlobal);
    return audioListenerGlobal;
}

export function setupPassengerAudio(targetObj) {
    if (!audioListenerGlobal) return;
    const sound = new THREE.PositionalAudio(audioListenerGlobal);
    const oscillator = audioListenerGlobal.context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioListenerGlobal.context.currentTime);
    oscillator.start(0);

    sound.setNodeSource(oscillator);
    sound.setRefDistance(1);
    sound.setVolume(0);

    targetObj.add(sound);

    window.addEventListener('pointerdown', () => {
        if (audioListenerGlobal.context.state === 'suspended') {
            audioListenerGlobal.context.resume();
        }
        setInterval(() => {
            if (sound.getVolume() > 0) return;
            sound.setVolume(0.1);
            setTimeout(() => sound.setVolume(0), 1000);
        }, 3000);
    }, { once: true });
}

export function triggerTinnitus() {
    if (tinnitusActive || !audioListenerGlobal) return;
    tinnitusActive = true;

    const context = audioListenerGlobal.context;
    if (context.state === 'suspended') context.resume();

    currentTinnitusOsc = context.createOscillator();
    currentTinnitusOsc.type = 'sine';
    currentTinnitusOsc.frequency.setValueAtTime(6000, context.currentTime);

    currentTinnitusGain = context.createGain();
    currentTinnitusGain.gain.setValueAtTime(0, context.currentTime);
    currentTinnitusGain.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.1); // Sudden hit
    currentTinnitusGain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 10); // Fade 10s

    currentTinnitusOsc.connect(currentTinnitusGain);
    currentTinnitusGain.connect(context.destination);

    currentTinnitusOsc.start();
}

export function stopTinnitus() {
    tinnitusActive = false;
    if (currentTinnitusOsc) {
        currentTinnitusOsc.stop();
        currentTinnitusOsc.disconnect();
        currentTinnitusOsc = null;
    }
    if (currentTinnitusGain) {
        currentTinnitusGain.disconnect();
        currentTinnitusGain = null;
    }
}

export function isTinnitusActive() {
    return tinnitusActive;
}
