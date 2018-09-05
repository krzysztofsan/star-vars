const SCENE = {
	FRUSTUM: 75,
	WIDTH: window.innerWidth,
	HEIGHT: window.innerHeight,
	NEAR: 0.01,
	FAR: 1000
};

const CONFIG = {
    controls: {
        enabled: false
    },
    camera: {
        autoRotate: false
    }
};

const KEY_CODE = {
    UP:     38,
    DOWN:   40,
    LEFT:   37,
    RIGHT:  39,
    SPACE:  32
};

const colors = {
    cockpit: 0xdddddd,
    body: 0xdddddd,
};

const BOARD = {
    minPositionX: -17,
    maxPositionX:  17
};

let renderer, camera, scene, controls;
let hemisphereLight, shadowLight, ambientLight, pointLight;
let spaceship, board;

let time = 0;

function Missile(spaceshipPosition) {
    this.mesh = new THREE.Object3D();

    let geometry = new THREE.Geometry();
    let material = new THREE.MeshPhongMaterial({
        color: colors.body,
        flatShading: THREE.SmoothShading
    });

    // TODO: Peak
    // TODO: Fire!
    // TODO: Colours

    const bodyGeometry = new THREE.CylinderGeometry(1, 1, 10, 8, 10);

    bodyGeometry.translate(0, -10, 0);

    const wingsGeometryZ = new THREE.BoxGeometry(5, 1, 0.1, 5, 1, 1);
    wingsGeometryZ.vertices[0].y -= 0.5;
    wingsGeometryZ.vertices[1].y -= 0.5;
    wingsGeometryZ.vertices[4].y -= 0.5;
    wingsGeometryZ.vertices[5].y -= 0.5;

    const wingsGeometryX = new THREE.BoxGeometry(0.1, 1, 5, 1, 1, 5);
    wingsGeometryX.vertices[0].y -= 0.5;
    wingsGeometryX.vertices[17].y -= 0.5;
    wingsGeometryX.vertices[5].y -= 0.5;
    wingsGeometryX.vertices[12].y -= 0.5;

    wingsGeometryZ.translate(0,  -14, 0);
    wingsGeometryX.translate(0,  -14, 0);

    geometry.merge(bodyGeometry);
    geometry.merge(wingsGeometryZ);
    geometry.merge(wingsGeometryX);

    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.scale.set(0.2, 0.2, 0.2);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.x = spaceshipPosition.x;
    this.mesh.position.z = spaceshipPosition.z - 1;

    console.log(spaceshipPosition);

    this.mesh.updateMatrix();
    this.mesh.geometry.applyMatrix(this.mesh.matrix);
    this.mesh.matrix.identity();

    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.scale.set(1, 1, 1);

    // Generate an unique id
    this.mesh.name = "missile-" + Date.now();

    // Init missile's properties
    this.range = 200;
    this.speed = 1.2;

}

function init() {
	function initWebGL() {
		renderer = new THREE.WebGLRenderer();
		camera = new THREE.PerspectiveCamera(SCENE.FRUSTUM,
											 SCENE.WIDTH / SCENE.HEIGHT,
											 SCENE.NEAR,
											 SCENE.FAR);

		scene = new THREE.Scene();

		camera.position.set(0, 10, 15);
		camera.lookAt(new THREE.Vector3(0, 5, 0));

		if (CONFIG.controls.enabled) {
            controls = new THREE.OrbitControls(camera);
            controls.autoRotate = CONFIG.camera.autoRotate;
            controls.addEventListener("change", render);
        }

		scene.add(camera);

		renderer.setSize(SCENE.WIDTH, SCENE.HEIGHT);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;

		document.body.appendChild(renderer.domElement);
	}

	// TODO: Sunrise effect
    function initLights() {
	    // Hemisphere light
        hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 0.9);

        // Shadow light
        shadowLight = new THREE.DirectionalLight(0xffffff, 1.0);
        shadowLight.position.set(100, 50, -100);
        shadowLight.castShadow = true;

        // Ambient light
        ambientLight = new THREE.AmbientLight(0xdddddd, 0.5);

        // Point light
        pointLight = new THREE.PointLight(0xffffff, 1.0);
        pointLight.position.set(0, 30, -200);

        scene.add(hemisphereLight);
        // scene.add(shadowLight);
        // scene.add(ambientLight);
        scene.add(pointLight);
    }

    // TODO: Make it look like Orzeł 7
    function Spaceship() {
        this.mesh = new THREE.Object3D();

        // Create the cabin
        var geomCockpit = new THREE.BoxGeometry(40, 20, 20);
        var matCockpit = new THREE.MeshPhongMaterial({
            color: colors.body,
            flatShading: THREE.FlatShading
        });

        geomCockpit.vertices[6].z -= 5;
        geomCockpit.vertices[7].z += 5;

        var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
        cockpit.castShadow = true;
        cockpit.receiveShadow = true;
        this.mesh.add(cockpit);

        // Create the front
        var geomEngine = new THREE.BoxGeometry(30, 10, 10);
        var matEngine = new THREE.MeshPhongMaterial({
            color: colors.body,
            flatShading: THREE.FlatShading
        });

        geomEngine.vertices[0].z -= 2;
        geomEngine.vertices[1].z += 2;
        geomEngine.vertices[2].y += 2;
        geomEngine.vertices[3].y += 2;

        geomEngine.vertices[4].z -= 5;
        geomEngine.vertices[4].y += 10;
        geomEngine.vertices[5].z += 5;
        geomEngine.vertices[5].y += 10;
        geomEngine.vertices[6].z -= 5;
        geomEngine.vertices[7].z += 5;

        geomEngine.translate(35, -5, 0);

        var engine = new THREE.Mesh(geomEngine, matEngine);

        engine.position.x = 35;
        engine.position.y = -5;

        engine.castShadow = true;
        engine.receiveShadow = true;
        this.mesh.add(engine);


        // Create wings
        var geomWings = new THREE.BoxGeometry(20, 4, 100, 1, 1, 3);
        var matWings = new THREE.MeshPhongMaterial({
            color: colors.body,
            flatShading: THREE.FlatShading
        });

        geomWings.vertices[0].x -= 10;
        geomWings.vertices[0].y -= 2;
        geomWings.vertices[1].y -= 2;
        geomWings.vertices[2].y -= 2;
        geomWings.vertices[3].y -= 2;
        geomWings.vertices[3].x -= 10;
        geomWings.vertices[4].x -= 10;
        geomWings.vertices[7].x -= 10;

        var wings = new THREE.Mesh(geomWings, matWings);

        // TODO: unneccesary
        this.mesh.add(wings);

        const mergedGeometry = new THREE.Geometry();
        const mergedMaterial = new THREE.MeshPhongMaterial({
            color: colors.body,
            flatShading: THREE.FlatShading
        });

        mergedGeometry.merge(geomCockpit);
        mergedGeometry.merge(geomEngine);
        mergedGeometry.merge(geomWings);

        this.mesh = new THREE.Mesh(mergedGeometry, mergedMaterial);

        this.mesh.scale.set(0.1, 0.1, 0.1);
        this.mesh.rotation.y = Math.PI / 2;

        this.mesh.updateMatrix();
        this.mesh.geometry.applyMatrix(this.mesh.matrix);
        this.mesh.matrix.identity();

        this.mesh.position.set(0, 0, 0);
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.scale.set(1, 1, 1);
    }

	function initSpaceship() {
        spaceship = new Spaceship();

        spaceship.leftPressed = false;
        spaceship.leftSpeed = 0;
        spaceship.rightPressed = false;
        spaceship.rightSpeed = 0;

        spaceship.maxSpeed = 1.0;
        spaceship.acceleration = 0.15;
        spaceship.inertia = 0.05;

        spaceship.missles = [];
        spaceship.missles.cooldown = 0;

        scene.add(spaceship.mesh);
    }

    function Board() {
	    this.mesh = new THREE.Object3D();

        const boardGeometry = new THREE.CylinderGeometry(400, 400, 500, 20, 20);
        const boardMaterial = new THREE.MeshPhongMaterial({
            color: 0x853004
        })

        for (var i = 0; i < boardGeometry.vertices.length; i++) {
            boardGeometry.vertices[i].x += (Math.random() - 0.5) * 10;
            boardGeometry.vertices[i].y += (Math.random() - 0.5) * 10;
            boardGeometry.vertices[i].z += (Math.random() - 0.5) * 10;
        }

        const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);

        boardMesh.castShadow = true;
        boardMesh.receiveShadow = true;

        this.mesh.add(boardMesh);
    }

    function initBoard() {
	    board = new Board();

	    board.mesh.rotation.z = Math.PI / 2;
	    board.mesh.position.y = -400;
	    board.mesh.position.z = -160;

	    scene.add(board.mesh);
    }

	initWebGL();
    initLights();
	initSpaceship();
    initBoard();
}

function render() {
    renderer.render(scene, camera);
}

function updateBoard() {
    board.mesh.rotation.x += 0.01;
}

function updateSpaceship() {
    // Update spaceship's speed
    const speed = spaceship.leftSpeed *  spaceship.maxSpeed +
                  spaceship.rightSpeed * spaceship.maxSpeed;

    // Updating spaceship's position
    if (
        speed < 0 && spaceship.mesh.position.x > BOARD.minPositionX ||
        speed > 0 && spaceship.mesh.position.x < BOARD.maxPositionX
    ) {
        spaceship.mesh.position.x += speed;
    }

    // Update directional speed
    if (spaceship.leftPressed) {
        spaceship.leftSpeed = spaceship.leftSpeed - spaceship.acceleration > -1 ?
            spaceship.leftSpeed - spaceship.acceleration :
            -1;
    } else {
        spaceship.leftSpeed = spaceship.leftSpeed + spaceship.inertia < 0 ?
            spaceship.leftSpeed + spaceship.inertia :
            0;
    }

    if (spaceship.rightPressed) {
        spaceship.rightSpeed = spaceship.rightSpeed + spaceship.acceleration < 1 ?
            spaceship.rightSpeed + spaceship.acceleration :
            1;
    } else {
        spaceship.rightSpeed = spaceship.rightSpeed - spaceship.inertia > 0 ?
            spaceship.rightSpeed - spaceship.inertia :
            0;
    }

    // Animate the spaceship
    spaceship.mesh.position.y = Math.sin(time / 10) / 5;
    spaceship.mesh.rotation.z = -(speed / spaceship.maxSpeed) * Math.PI / 10;
}

function updateMissiles () {
    for (let i = 0; i < spaceship.missles.length; i++) {
        const missile = spaceship.missles[i];

        missile.mesh.position.z -= missile.speed;

        // TODO: make it more generic (3d instead of 1d)
        if (missile.mesh.position.z < - missile.range) {
            spaceship.missles.splice(i, 1);
            scene.remove(scene.getObjectByName(missile.mesh.name));
        }
    }

    if (spaceship.missles.cooldown > 0) {
        spaceship.missles.cooldown -= 1;
    } else {
        spaceship.missles.cooldown = 0;
    }
}

function animate() {
    time += 1;

    if (CONFIG.controls.enabled) {
        controls.update();
    }

    updateBoard();
    updateSpaceship();
    updateMissiles();

	requestAnimationFrame(animate);
	render();
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
render();
animate();

window.addEventListener("resize", onWindowResize);

document.addEventListener("keydown", function(event) {
    var keyCode = event.which;

    switch (keyCode) {
        case KEY_CODE.RIGHT:
            spaceship.rightPressed = true;
            break;
        case KEY_CODE.LEFT:
            spaceship.leftPressed = true;
    }
});

document.addEventListener("keyup", function(event) {
    var keyCode = event.which;

    switch (keyCode) {
        case KEY_CODE.LEFT:
            spaceship.leftPressed = false;
            break;
        case KEY_CODE.RIGHT:
            spaceship.rightPressed = false;
            break;
        case KEY_CODE.SPACE:
            if (!spaceship.missles.cooldown) {
                spaceship.missles.push(new Missile(spaceship.mesh.position));
                scene.add(spaceship.missles[spaceship.missles.length - 1].mesh);    // TODO: rethink that

                spaceship.missles.cooldown = 100;    // TODO: don't hardcode it
            }
    }
});
