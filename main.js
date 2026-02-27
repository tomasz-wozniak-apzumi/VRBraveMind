import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { guiSettings } from './src/config/SceneConfig.js';
import { createTherapistGUI } from './src/ui/UIManager.js';
import { initAudio, setupPassengerAudio, triggerTinnitus, stopTinnitus, isTinnitusActive } from './src/audio/AudioManager.js';

let camera, scene, renderer;
let carGroup, passengerModel, carModel, roadModel, incomingCarGroup;
let grid;
let clock = new THREE.Clock();
let mixer;
let scenarioTimer = 0;
const speed = 15;

guiSettings.resetScenario = () => {
    scenarioTimer = 0;
    if (isTinnitusActive()) stopTinnitus();
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

    initAudio(camera);

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
        setupPassengerAudio(passengerModel);

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

    // GUI Setup from separate UI Manager module
    const models = { carModel, passengerModel, roadModel, cameraRig, userSpawnHelper };
    const gui = createTherapistGUI(guiSettings, models);

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
        if (!isTinnitusActive()) triggerTinnitus();
    } else {
        if (isTinnitusActive()) stopTinnitus();
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

    if (mixer) {
        // Zamiast odtwarzać klatki ciągle do przodu (update), 
        // wymuszamy na animacji konkretną klatkę z naszego matematycznego zegara.
        // Dzięki temu oddychanie/ruchy cofną się bezbłędnie podczas Rewindu!
        mixer.setTime(Math.max(0, t));
    }
    renderer.render(scene, camera);
}
