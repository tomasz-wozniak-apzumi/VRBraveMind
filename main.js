import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let camera, scene, renderer;
let carGroup, passengerModel, carModel, roadModel;
let grid;
let clock = new THREE.Clock();
let mixer;
const speed = 15;

const guiSettings = {
    carX: 0.9, carY: 1.4, carZ: -3.28, carScale: 0.03,
    carRotX: 1.598407, carRotY: 3.141592, carRotZ: 0.288407,
    passX: 0.6, passY: 1.93, passZ: 1.19, passScale: 1,
    passRotX: 0, passRotY: 3.141592, passRotZ: 0,
    roadX: 0, roadY: -3.3, roadZ: 0, roadScale: 3,
    roadRotX: 0, roadRotY: 0, roadRotZ: 0
};

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

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffaa55, 1.5);
    dirLight.position.set(0, 20, -10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

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

    const tgaLoader = new TGALoader(loadingManager);
    loadingManager.addHandler(/\.tga$/i, tgaLoader);

    carGroup = new THREE.Group();
    scene.add(carGroup);

    const fbxLoader = new FBXLoader(loadingManager);
    fbxLoader.load('/models3d/32-mercedes-benz-gls-580-2020/uploads_files_2787791_Mercedes+Benz+GLS+580.fbx', function (fbx) {
        carModel = fbx;
        carModel.position.set(guiSettings.carX, guiSettings.carY, guiSettings.carZ);
        carModel.rotation.set(guiSettings.carRotX, guiSettings.carRotY, guiSettings.carRotZ);
        carModel.scale.setScalar(guiSettings.carScale);
        carGroup.add(carModel);
    }, undefined, function (e) {
        console.error(e);
    });

    loader.load('/models3d/ready_player_me_female_character_sittingLoop.glb', function (gltf) {
        passengerModel = gltf.scene;

        // Przesunięcie i obrót z panelu GUI
        passengerModel.position.set(guiSettings.passX, guiSettings.passY, guiSettings.passZ);
        passengerModel.rotation.set(guiSettings.passRotX, guiSettings.passRotY, guiSettings.passRotZ);
        passengerModel.scale.setScalar(guiSettings.passScale);

        carGroup.add(passengerModel);
        setupAudio(passengerModel);

        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(passengerModel);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        }
    }, undefined, function (e) {
        console.error(e);
    });

    loader.load('/models3d/esec_traffic_project.glb', function (gltf) {
        roadModel = gltf.scene;
        roadModel.position.set(guiSettings.roadX, guiSettings.roadY, guiSettings.roadZ);
        roadModel.rotation.set(guiSettings.roadRotX, guiSettings.roadRotY, guiSettings.roadRotZ);
        roadModel.scale.setScalar(guiSettings.roadScale);

        scene.add(roadModel);
    }, undefined, function (e) {
        console.error(e);
    });

    grid = new THREE.GridHelper(2000, 200, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    grid.position.y = 0;
    scene.add(grid);

    window.addEventListener('resize', onWindowResize);

    // GUI Setup
    const gui = new GUI();
    const carFolder = gui.addFolder('Car (Mercedes)');
    carFolder.add(guiSettings, 'carX', -10, 10, 0.01).onChange(v => { if (carModel) carModel.position.x = v; });
    carFolder.add(guiSettings, 'carY', -10, 10, 0.01).onChange(v => { if (carModel) carModel.position.y = v; });
    carFolder.add(guiSettings, 'carZ', -10, 10, 0.01).onChange(v => { if (carModel) carModel.position.z = v; });
    carFolder.add(guiSettings, 'carRotX', -Math.PI, Math.PI, 0.01).onChange(v => { if (carModel) carModel.rotation.x = v; });
    carFolder.add(guiSettings, 'carRotY', -Math.PI, Math.PI, 0.01).onChange(v => { if (carModel) carModel.rotation.y = v; });
    carFolder.add(guiSettings, 'carRotZ', -Math.PI, Math.PI, 0.01).onChange(v => { if (carModel) carModel.rotation.z = v; });
    carFolder.add(guiSettings, 'carScale', 0.001, 2, 0.001).onChange(v => { if (carModel) carModel.scale.setScalar(v); });

    const passFolder = gui.addFolder('Passenger');
    passFolder.add(guiSettings, 'passX', -5, 5, 0.01).onChange(v => { if (passengerModel) passengerModel.position.x = v; });
    passFolder.add(guiSettings, 'passY', -5, 5, 0.01).onChange(v => { if (passengerModel) passengerModel.position.y = v; });
    passFolder.add(guiSettings, 'passZ', -5, 5, 0.01).onChange(v => { if (passengerModel) passengerModel.position.z = v; });
    passFolder.add(guiSettings, 'passRotX', -Math.PI, Math.PI, 0.01).onChange(v => { if (passengerModel) passengerModel.rotation.x = v; });
    passFolder.add(guiSettings, 'passRotY', -Math.PI, Math.PI, 0.01).onChange(v => { if (passengerModel) passengerModel.rotation.y = v; });
    passFolder.add(guiSettings, 'passRotZ', -Math.PI, Math.PI, 0.01).onChange(v => { if (passengerModel) passengerModel.rotation.z = v; });
    passFolder.add(guiSettings, 'passScale', 0.1, 5, 0.01).onChange(v => { if (passengerModel) passengerModel.scale.setScalar(v); });

    const roadFolder = gui.addFolder('Road/Environment');
    roadFolder.add(guiSettings, 'roadX', -500, 500, 0.1).onChange(v => { if (roadModel) roadModel.position.x = v; });
    roadFolder.add(guiSettings, 'roadY', -100, 100, 0.1).onChange(v => { if (roadModel) roadModel.position.y = v; });
    roadFolder.add(guiSettings, 'roadZ', -1000, 1000, 0.1).onChange(v => { if (roadModel) roadModel.position.z = v; });
    roadFolder.add(guiSettings, 'roadRotX', -Math.PI, Math.PI, 0.01).onChange(v => { if (roadModel) roadModel.rotation.x = v; });
    roadFolder.add(guiSettings, 'roadRotY', -Math.PI, Math.PI, 0.01).onChange(v => { if (roadModel) roadModel.rotation.y = v; });
    roadFolder.add(guiSettings, 'roadRotZ', -Math.PI, Math.PI, 0.01).onChange(v => { if (roadModel) roadModel.rotation.z = v; });
    roadFolder.add(guiSettings, 'roadScale', 0.001, 20, 0.001).onChange(v => { if (roadModel) roadModel.scale.setScalar(v); });
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
    if (roadModel) {
        // Pseudo driving motion: moving city environment backwards
        roadModel.position.z += speed * delta;

        // Very basic simple loop: if city drives too far back, reset it 
        // to keep impression of continuous forward movement. (Value '300' is arbitrary and needs tweaking on scale).
        if (roadModel.position.z > 300) {
            roadModel.position.z = 0;
        }
    }
    if (mixer) {
        mixer.update(delta);
    }
    renderer.render(scene, camera);
}
