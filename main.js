import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let camera, scene, renderer;
let carGroup, passengerModel, carModel, roadModel, incomingCarGroup;
let grid;
let clock = new THREE.Clock();
let mixer;
let audioListenerGlobal;
let scenarioTimer = 0;
let tinnitusActive = false;
let currentTinnitusOsc = null;
let currentTinnitusGain = null;
const speed = 15;

const guiSettings = {
    carX: 1.4, carY: -1, carZ: -3.28, carScale: 0.03,
    carRotX: 1.598407, carRotY: 3.141592, carRotZ: -0.00159,
    passX: -0.16, passY: -0.78, passZ: 0.94, passScale: 1.15,
    passRotX: 0, passRotY: 3.141592, passRotZ: 0,
    roadX: -16.2, roadY: 2, roadZ: 0, roadScale: 3,
    roadRotX: -0.02159, roadRotY: 1.598407, roadRotZ: 0,
    userX: -1, userY: -0.23, userZ: 0.82,
    showUserSpawn: false, // Turned off by default so the red sphere does not obstruct patient view
    showLabels: false,
    incStartX: 20, incStartY: -1.5, incStartZ: -60, incRotY: -0.785, incScale: 0.03,
    incStartTime: 10.0, incSpeedX: -17.5, incSpeedZ: 25, crashThresholdX: 1.0,
    playScenario: true,
    scenarioSpeed: 1.0,
    resetScenario: () => {
        scenarioTimer = 0;
        if (tinnitusActive) stopTinnitus();
    }
};

init();
animate();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88ccee);
    scene.fog = new THREE.Fog(0x88ccee, 10, 500);

    carGroup = new THREE.Group();
    scene.add(carGroup);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    const cameraRig = new THREE.Group();
    carGroup.add(cameraRig); // Wrap camera into car for synchronized spin during accident
    cameraRig.add(camera);
    cameraRig.position.set(guiSettings.userX, guiSettings.userY, guiSettings.userZ);

    // Visual helper for the user spawn point
    const userGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const userMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const userSpawnHelper = new THREE.Mesh(userGeo, userMat);
    userSpawnHelper.position.copy(cameraRig.position);
    userSpawnHelper.visible = guiSettings.showUserSpawn;
    carGroup.add(userSpawnHelper);

    audioListenerGlobal = new THREE.AudioListener();
    camera.add(audioListenerGlobal);

    incomingCarGroup = new THREE.Group();
    incomingCarGroup.position.set(50, 0, -100); // Hidden / far away initially
    scene.add(incomingCarGroup);

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

    const fbxLoader = new FBXLoader(loadingManager);
    fbxLoader.load('/models3d/32-mercedes-benz-gls-580-2020/uploads_files_2787791_Mercedes+Benz+GLS+580.fbx', function (fbx) {
        carModel = fbx;
        carModel.position.set(guiSettings.carX, guiSettings.carY, guiSettings.carZ);
        carModel.rotation.set(guiSettings.carRotX, guiSettings.carRotY, guiSettings.carRotZ);
        carModel.scale.setScalar(guiSettings.carScale);
        carGroup.add(carModel);

        const clonedIncoming = carModel.clone();
        incomingCarGroup.add(clonedIncoming);
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

        // Skrypt debugujący dla wyciągnięcia nazw obiektów (nad obiektami jako chmurki tekstowe)
        roadModel.traverse((child) => {
            if (child.isMesh && child.name) {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 128;
                const context = canvas.getContext('2d');
                context.font = "Bold 40px Arial";
                context.fillStyle = "rgba(0, 255, 0, 1.0)"; // Jaskrawy zielony napis
                context.strokeStyle = "black";
                context.lineWidth = 5;
                context.strokeText(child.name, 10, 60);
                context.fillText(child.name, 10, 60);

                const texture = new THREE.CanvasTexture(canvas);
                // depthTest: false upewnia się, że napisy prześwitują przez budynki, więc łatwo je znaleźć na całej mapie
                const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.scale.set(6, 1.5, 1);
                sprite.position.set(0, 2, 0); // Lekko powyżej oryginalnego mesha
                sprite.visible = guiSettings.showLabels;
                sprite.name = "DebugLabel";
                child.add(sprite);
            }
        });

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

    const toolsFolder = gui.addFolder('Developer Tools');
    toolsFolder.add(guiSettings, 'showLabels').name('Show Mesh Names').onChange(v => {
        if (roadModel) {
            roadModel.traverse(child => {
                if (child.name === "DebugLabel") child.visible = v;
            });
        }
    });

    const userFolder = gui.addFolder('User (Driver) Spawn');
    userFolder.add(guiSettings, 'userX', -5, 5, 0.01).onChange(v => { cameraRig.position.x = v; if (userSpawnHelper) userSpawnHelper.position.x = v; });
    userFolder.add(guiSettings, 'userY', -5, 5, 0.01).onChange(v => { cameraRig.position.y = v; if (userSpawnHelper) userSpawnHelper.position.y = v; });
    userFolder.add(guiSettings, 'userZ', -5, 5, 0.01).onChange(v => { cameraRig.position.z = v; if (userSpawnHelper) userSpawnHelper.position.z = v; });
    userFolder.add(guiSettings, 'showUserSpawn').name('Show Spawn Marker').onChange(v => { if (userSpawnHelper) userSpawnHelper.visible = v; });

    const incomingFolder = gui.addFolder('Incoming Accident Vehicle');
    incomingFolder.add(guiSettings, 'incStartTime', 0, 60, 0.1).name('Start Time (s)');
    incomingFolder.add(guiSettings, 'incStartX', -100, 100, 0.1).name('Start X');
    incomingFolder.add(guiSettings, 'incStartY', -10, 10, 0.01).name('Start Y');
    incomingFolder.add(guiSettings, 'incStartZ', -200, 200, 0.1).name('Start Z');
    incomingFolder.add(guiSettings, 'incRotY', -Math.PI, Math.PI, 0.01).name('Rotation Y');
    incomingFolder.add(guiSettings, 'incScale', 0.001, 2, 0.001).name('Scale');
    incomingFolder.add(guiSettings, 'incSpeedX', -100, 100, 0.1).name('Speed X');
    incomingFolder.add(guiSettings, 'incSpeedZ', -100, 100, 0.1).name('Speed Z');
    incomingFolder.add(guiSettings, 'crashThresholdX', -20, 20, 0.1).name('Crash Config: X Threshold');

    const therapistFolder = gui.addFolder('Therapist Controls');
    therapistFolder.add(guiSettings, 'playScenario').name('Play / Pause');
    therapistFolder.add(guiSettings, 'scenarioSpeed', -3.0, 3.0, 0.1).name('Speed Multiplier');
    therapistFolder.add(guiSettings, 'resetScenario').name('Rewind (Reset Scenario)');

    // VR Controller Events - binding to both indices just in case (left/right order depends on power-on sequence)
    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        controller.addEventListener('selectstart', () => {
            guiSettings.playScenario = !guiSettings.playScenario; // Toggle Play/Pause (Trigger)
        });
        controller.addEventListener('squeezestart', () => {
            guiSettings.resetScenario(); // Rewind/Reset (Grip)
        });
        scene.add(controller);
    }
}

function setupAudio(targetObj) {
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

function triggerTinnitus() {
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

function stopTinnitus() {
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

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    let delta = clock.getDelta();

    // Query VR Gamepad for right thumbstick (speed control)
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source && source.handedness === 'right' && source.gamepad) {
                // Usually axis 3 is Thumbstick Y, axis 2 is X. 
                // Pushing up usually gives -1, pulling down gives +1.
                const speedAxis = source.gamepad.axes[3];
                if (speedAxis !== undefined && Math.abs(speedAxis) > 0.1) {
                    guiSettings.scenarioSpeed -= speedAxis * 0.01; // adjust gradually, 0.01 per frame
                    if (guiSettings.scenarioSpeed < -3.0) guiSettings.scenarioSpeed = -3.0; // enable rewind speed
                    if (guiSettings.scenarioSpeed > 3.0) guiSettings.scenarioSpeed = 3.0;
                }
            }
        }
    }

    if (!guiSettings.playScenario) {
        // Obiekty stoją w miejscu jeśli symulacja zapauzowana (ale render idzie dalej by ruszać głową w VR)
        renderer.render(scene, camera);
        return;
    }

    // Apply scaling
    delta *= guiSettings.scenarioSpeed;
    scenarioTimer += delta;
    if (scenarioTimer < 0) scenarioTimer = 0;

    let t = scenarioTimer;
    let t_start = guiSettings.incStartTime;
    // ensure time to crash is pure positive regardless of physics mistake (dirX guarantees crash)
    let timeToCrash = Math.abs((guiSettings.incStartX - guiSettings.crashThresholdX) / (guiSettings.incSpeedX || 0.1));
    let t_crash = t_start + timeToCrash;
    let t_end = t_crash + 10.0;

    // Hard freeze of time exactly at scenario completion
    if (t > t_end) {
        t = t_end;
        scenarioTimer = t_end;
    }

    // 1. Road and Grid Movement (loop flawlessly tied to true evaluated time)
    let traveled = speed * Math.min(t, t_crash) + (speed * 0.1) * Math.max(0, Math.min(t - t_crash, t_end - t_crash));
    if (grid) grid.position.z = (traveled % 10);
    if (roadModel) roadModel.position.z = guiSettings.roadZ + (traveled % 300);

    // 2. Incoming Car Math
    if (incomingCarGroup) {
        if (t < t_start) {
            incomingCarGroup.position.set(20, -100, -60); // hidden underground
        } else {
            let dtCar = Math.min(t - t_start, timeToCrash);
            let dirX = Math.sign(guiSettings.crashThresholdX - guiSettings.incStartX);
            incomingCarGroup.position.x = guiSettings.incStartX + dirX * Math.abs(guiSettings.incSpeedX) * dtCar;
            incomingCarGroup.position.y = guiSettings.incStartY;
            incomingCarGroup.position.z = guiSettings.incStartZ + guiSettings.incSpeedZ * dtCar;
            incomingCarGroup.rotation.y = guiSettings.incRotY;
            incomingCarGroup.scale.setScalar(guiSettings.incScale);
        }
    }

    // 3. Accident Spin & Sliding Math
    if (carGroup) {
        if (t <= t_crash) {
            carGroup.rotation.y = 0;
            carGroup.position.x = 0;
            carGroup.position.z = 0;
        } else {
            let dtCrash = t - t_crash;
            let spinTime = Math.min(dtCrash, 8.0 / 5.0);
            carGroup.rotation.y = 8 * spinTime - 2.5 * spinTime * spinTime;
            let slideTime = Math.min(dtCrash, 3.0);
            carGroup.position.x = -2 * slideTime; // skids left
            carGroup.position.z = -4 * slideTime; // skids backward
        }
    }

    // 4. Audio Tinnitus Trigger
    if (t >= t_crash && t < t_end) {
        if (!tinnitusActive) triggerTinnitus();
    } else {
        if (tinnitusActive) stopTinnitus();
    }

    // 5. End Text Overlay Display
    let endText = document.getElementById('end-text-vr');
    if (t >= t_end) {
        if (!endText) {
            endText = document.createElement('div');
            endText.id = 'end-text-vr';
            endText.style.position = 'absolute';
            endText.style.top = '20px';
            endText.style.width = '100%';
            endText.style.textAlign = 'center';
            endText.style.color = 'red';
            endText.style.fontSize = '30px';
            endText.style.fontWeight = 'bold';
            endText.style.zIndex = '100';
            endText.style.pointerEvents = 'none';
            endText.innerText = 'SYMULACJA ZAKOŃCZONA - GOTOWE DO COFNIĘCIA (Wykorzystaj ujemny Speed)';
            document.body.appendChild(endText);
        } else {
            endText.style.display = 'block';
        }
    } else {
        if (endText) endText.style.display = 'none';
    }

    if (mixer) mixer.update(Math.abs(delta)); // animation remains forward tracking even if reverse physics speed
    renderer.render(scene, camera);
}
