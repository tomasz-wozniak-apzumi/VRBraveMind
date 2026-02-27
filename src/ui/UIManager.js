import GUI from 'lil-gui';

export function createTherapistGUI(guiSettings, models) {
    const { carModel, passengerModel, roadModel, cameraRig, userSpawnHelper } = models;
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
    userFolder.add(guiSettings, 'userX', -5, 5, 0.01).onChange(v => { if (cameraRig) cameraRig.position.x = v; if (userSpawnHelper) userSpawnHelper.position.x = v; });
    userFolder.add(guiSettings, 'userY', -5, 5, 0.01).onChange(v => { if (cameraRig) cameraRig.position.y = v; if (userSpawnHelper) userSpawnHelper.position.y = v; });
    userFolder.add(guiSettings, 'userZ', -5, 5, 0.01).onChange(v => { if (cameraRig) cameraRig.position.z = v; if (userSpawnHelper) userSpawnHelper.position.z = v; });
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
    therapistFolder.add(guiSettings, 'playScenario').name('Play / Pause').listen();
    therapistFolder.add(guiSettings, 'scenarioSpeed', -3.0, 3.0, 0.1).name('Speed Multiplier').listen();
    therapistFolder.add(guiSettings, 'resetScenario').name('Rewind (Reset Scenario)');

    return gui;
}
