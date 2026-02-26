import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

let camera, scene, renderer;
let carGroup, passengerModel;
let grid;
let clock = new THREE.Clock();

const speed = 15; // m/s for driving illusion

init();
animate();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88ccee); // dusk/sky color
    scene.fog = new THREE.Fog(0x88ccee, 10, 500);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // We create a rig to hold the camera because WebXR overrides the camera's local transform
    const cameraRig = new THREE.Group();
    scene.add(cameraRig);
    cameraRig.add(camera);
    // Position the rig roughly where the driver's head would be
    cameraRig.position.set(0.4, 1.2, -0.2); // Adjust these values based on the car model's scale/origin

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffaa55, 0.8); // Sunset-ish
    dirLight.position.set(0, 20, -10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; // Enable WebXR
    container.appendChild(renderer.domElement);

    // Add VR Button
    document.body.appendChild(VRButton.createButton(renderer));

    // Loaders
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
        document.getElementById('info').innerHTML = `Loading VR App... ${Math.round((itemsLoaded / itemsTotal) * 100)}%`;
        if(itemsLoaded === itemsTotal) {
            document.getElementById('info').innerHTML = 'Models Loaded. Click "Enter VR" below.';
        }
    };

    const loader = new GLTFLoader(loadingManager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    // Load Car
    carGroup = new THREE.Group();
    scene.add(carGroup);

    loader.load('/models3d/autonomous_gt_car_interior_design_-_manual_mode.glb', function (gltf) {
        const car = gltf.scene;
        carGroup.add(car);
        // The scaling and positioning depends heavily on the model.
        // We will keep it at scale 1, but we might need to adjust position later.
    }, undefined, function (e) {
        console.error(e);
    });

    // Load Passenger
    loader.load('/models3d/ready_player_me_female_character.glb', function (gltf) {
        passengerModel = gltf.scene;
        // Position on the passenger seat (these coordinates are speculative based on a standard LHD car)
        passengerModel.position.set(-0.5, 0.2, 0.2); 
        // We might need to scale it if RPM avatar is not match 1:1 with car
        carGroup.add(passengerModel);
        
        // Let's add simple audio to the passenger
        setupAudio(passengerModel);

    }, undefined, function (e) {
        console.error(e);
    });

    // Moving Grid to simulate driving
    grid = new THREE.GridHelper(2000, 200, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    grid.position.y = 0; // Ground level
    scene.add(grid);

    window.addEventListener('resize', onWindowResize);
}

function setupAudio(targetObj) {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.PositionalAudio(listener);
    // Create an oscillator to just act as a dummy talking sound, or load a file
    const oscillator = listener.context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, listener.context.currentTime);
    oscillator.start(0);
    
    // In a real scenario you load an AudioBuffer via THREE.AudioLoader
    // To not blow out ears, we set volume to 0 until user enters VR or clicks
    sound.setNodeSource(oscillator);
    sound.setRefDistance(1);
    sound.setVolume(0); 
    
    targetObj.add(sound);

    // Quick hack: enable sound after a click since AudioContext needs gesture
    window.addEventListener('pointerdown', () => {
        if(listener.context.state === 'suspended') {
            listener.context.resume();
        }
        // Pulse the volume to make it sound like taking breath/talking
        setInterval(() => {
            if (sound.getVolume() > 0) return;
            sound.setVolume(0.1);
            setTimeout(() => sound.setVolume(0), 1000);
        }, 3000);
    }, { once: true });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    const delta = clock.getDelta();

    // Drive Grid Illusion
    if (grid) {
        grid.position.z += speed * delta;
        // Reset grid to create infinite scroll
        if (grid.position.z > 10) {
            grid.position.z -= 10;
        }
    }

    renderer.render(scene, camera);
}
