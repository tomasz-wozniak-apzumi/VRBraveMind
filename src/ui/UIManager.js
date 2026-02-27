import GUI from 'lil-gui';

export function createTherapistGUI(guiSettings, getModels) {
    const gui = new GUI();

    const carFolder = gui.addFolder('Car (Mercedes)');
    carFolder.add(guiSettings, 'carX', -10, 10, 0.01).onChange(v => { const m = getModels(); if (m.carModel) m.carModel.position.x = v; });
    carFolder.add(guiSettings, 'carY', -10, 10, 0.01).onChange(v => { const m = getModels(); if (m.carModel) m.carModel.position.y = v; });
    carFolder.add(guiSettings, 'carZ', -10, 10, 0.01).onChange(v => { const m = getModels(); if (m.carModel) m.carModel.position.z = v; });
    carFolder.add(guiSettings, 'carRotX', -Math.PI, Math.PI, 0.01).onChange(v => { const m = getModels(); if (m.carModel) m.carModel.rotation.x = v; });
    carFolder.add(guiSettings, 'carRotY', -Math.PI, Math.PI, 0.01).onChange(v => { const m = getModels(); if (m.carModel) m.carModel.rotation.y = v; });
    carFolder.add(guiSettings, 'carRotZ', -Math.PI, Math.PI, 0.01).onChange(v => { const m = getModels(); if (m.carModel) m.carModel.rotation.z = v; });
    carFolder.add(guiSettings, 'carScale', 0.001, 2, 0.001).onChange(v => { const m = getModels(); if (m.carModel) m.carModel.scale.setScalar(v); });

    const passFolder = gui.addFolder('Passenger');
    passFolder.add(guiSettings, 'passX', -5, 5, 0.01).onChange(v => { const m = getModels(); if (m.passengerModel) m.passengerModel.position.x = v; });
    passFolder.add(guiSettings, 'passY', -5, 5, 0.01).onChange(v => { const m = getModels(); if (m.passengerModel) m.passengerModel.position.y = v; });
    passFolder.add(guiSettings, 'passZ', -5, 5, 0.01).onChange(v => { const m = getModels(); if (m.passengerModel) m.passengerModel.position.z = v; });
    passFolder.add(guiSettings, 'passRotX', -Math.PI, Math.PI, 0.01).onChange(v => { const m = getModels(); if (m.passengerModel) m.passengerModel.rotation.x = v; });
    passFolder.add(guiSettings, 'passRotY', -Math.PI, Math.PI, 0.01).onChange(v => { const m = getModels(); if (m.passengerModel) m.passengerModel.rotation.y = v; });
    passFolder.add(guiSettings, 'passRotZ', -Math.PI, Math.PI, 0.01).onChange(v => { const m = getModels(); if (m.passengerModel) m.passengerModel.rotation.z = v; });
    passFolder.add(guiSettings, 'passScale', 0.1, 5, 0.01).onChange(v => { const m = getModels(); if (m.passengerModel) m.passengerModel.scale.setScalar(v); });

    const roadFolder = gui.addFolder('Road/Environment');
    roadFolder.add(guiSettings, 'roadX', -500, 500, 0.1).onChange(v => { const m = getModels(); if (m.roadModel) m.roadModel.position.x = v; });
    roadFolder.add(guiSettings, 'roadY', -100, 100, 0.1).onChange(v => { const m = getModels(); if (m.roadModel) m.roadModel.position.y = v; });
    roadFolder.add(guiSettings, 'roadZ', -1000, 1000, 0.1).onChange(v => { const m = getModels(); if (m.roadModel) m.roadModel.position.z = v; });
    roadFolder.add(guiSettings, 'roadRotX', -Math.PI, Math.PI, 0.01).onChange(v => { const m = getModels(); if (m.roadModel) m.roadModel.rotation.x = v; });
    roadFolder.add(guiSettings, 'roadRotY', -Math.PI, Math.PI, 0.01).onChange(v => { const m = getModels(); if (m.roadModel) m.roadModel.rotation.y = v; });
    roadFolder.add(guiSettings, 'roadRotZ', -Math.PI, Math.PI, 0.01).onChange(v => { const m = getModels(); if (m.roadModel) m.roadModel.rotation.z = v; });
    roadFolder.add(guiSettings, 'roadScale', 0.001, 20, 0.001).onChange(v => { const m = getModels(); if (m.roadModel) m.roadModel.scale.setScalar(v); });

    const toolsFolder = gui.addFolder('Developer Tools');
    toolsFolder.add(guiSettings, 'showLabels').name('Show Mesh Names').onChange(v => {
        const m = getModels();
        if (m.roadModel) {
            m.roadModel.traverse(child => {
                if (child.name === "DebugLabel") child.visible = v;
            });
        }
    });

    const userFolder = gui.addFolder('User (Driver) Spawn');
    userFolder.add(guiSettings, 'userX', -5, 5, 0.01).onChange(v => { const m = getModels(); if (m.cameraRig) m.cameraRig.position.x = v; if (m.userSpawnHelper) m.userSpawnHelper.position.x = v; });
    userFolder.add(guiSettings, 'userY', -5, 5, 0.01).onChange(v => { const m = getModels(); if (m.cameraRig) m.cameraRig.position.y = v; if (m.userSpawnHelper) m.userSpawnHelper.position.y = v; });
    userFolder.add(guiSettings, 'userZ', -5, 5, 0.01).onChange(v => { const m = getModels(); if (m.cameraRig) m.cameraRig.position.z = v; if (m.userSpawnHelper) m.userSpawnHelper.position.z = v; });
    userFolder.add(guiSettings, 'showUserSpawn').name('Show Spawn Marker').onChange(v => { const m = getModels(); if (m.userSpawnHelper) m.userSpawnHelper.visible = v; });

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
    therapistFolder.add(guiSettings, 'playScenario').name('Play / Pause').listen();
    therapistFolder.add(guiSettings, 'scenarioSpeed', -3.0, 3.0, 0.1).name('Speed Multiplier').listen();
    therapistFolder.add(guiSettings, 'resetScenario').name('Rewind (Reset Scenario)');

    return gui;
}
