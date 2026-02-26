import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let camera, scene, renderer;
let carGroup, passengerModel;
let grid;
let clock = new THREE.Clock();
const speed = 15;

init();
animate();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88ccee);
    scene.fog = new THREE.Fog(0x88ccee, 10, 500);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    const cameraRig = new THREE.Group();
    scene.add(cameraRig);
    cameraRig.add(camera);
    cameraRig.position.set(0.4, 1.2, -0.2);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffaa55, 0.8);
    dirLight.position.set(0, 20, -10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, -1);
    controls.update();

    document.body.appendChild(VRButton.createButton(renderer));

    const loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
        document.getElementById('info').innerHTML = `Loading VR App... ${Math.round((itemsLoaded / itemsTotal) * 100)}%`;
        if (itemsLoaded === itemsTotal) {
            document.getElementById('info').innerHTML = 'Models Loaded. Click "Enter VR" below.';
        }
    };

    const loader = new GLTFLoader(loadingManager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    carGroup = new THREE.Group();
    scene.add(carGroup);

    loader.load('/models3d/autonomous_gt_car_interior_design_-_manual_mode.glb', function (gltf) {
        const car = gltf.scene;
        carGroup.add(car);
    }, undefined, function (e) {
        console.error(e);
    });

    loader.load('/models3d/ready_player_me_female_character.glb', function (gltf) {
        passengerModel = gltf.scene;
        passengerModel.position.set(-0.5, 0.2, 0.2);
        carGroup.add(passengerModel);
        setupAudio(passengerModel);
    }, undefined, function (e) {
        console.error(e);
    });

    grid = new THREE.GridHelper(2000, 200, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    grid.position.y = 0;
    scene.add(grid);

    window.addEventListener('resize', onWindowResize);
}

function setupAudio(targetObj) {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.PositionalAudio(listener);
    const oscillator = listener.context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, listener.context.currentTime);
    oscillator.start(0);

    sound.setNodeSource(oscillator);
    sound.setRefDistance(1);
    sound.setVolume(0);

    targetObj.add(sound);

    window.addEventListener('pointerdown', () => {
        if (listener.context.state === 'suspended') {
            listener.context.resume();
        }
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
    if (grid) {
        grid.position.z += speed * delta;
        if (grid.position.z > 10) grid.position.z -= 10;
    }
    renderer.render(scene, camera);
}
