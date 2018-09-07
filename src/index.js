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
    board:      0x853004,
    cockpit:    0xdddddd,
    body:       0xdddddd,
    missile:    0xcccccc,
    asteroid:   0x777777
};

const BOARD = {
    minPositionX: -40,
    maxPositionX:  40
};

// TODO: verify vars and consts for unused
let renderer, camera, scene, controls;
let hemisphereLight, pointLight;
let spaceship, board, asteroids;

let time = 0;

function Asteroid(position) {
    this.radius = 10;
    this.mesh = new THREE.Object3D();

    let geometry = new THREE.SphereGeometry(this.radius);
    let material = new THREE.MeshPhongMaterial({
        color: colors.asteroid,
        flatShading: THREE.SmoothShading
    });

    // TODO: improve randomizer mechanism
    for (let i = 0; i < geometry.vertices.length; i ++) {
        const vertex = geometry.vertices[i];
        const max = 1;

        vertex.x += Math.random() * max - max / 2;
        vertex.y += Math.random() * max - max / 2;
        vertex.z += Math.random() * max - max / 2;
    }

    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.position.set(position.x, position.y, position.z);

    this.mesh.name = "asteroid-" + Date.now();
}

function Missile(spaceshipPosition) {
    this.mesh = new THREE.Object3D();

    let geometry = new THREE.Geometry();
    let material = new THREE.MeshPhongMaterial({
        color: colors.missile,
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
    this.mesh.rotation.x = -Math.PI / 2 + 0.2;

    this.mesh.position.set(
        spaceshipPosition.x,
        spaceshipPosition.y - 15,   // TODO hack!
        spaceshipPosition.z - 1
    );

    // Generate an unique id
    this.mesh.name = "missile-" + Date.now();

    // Init missile's properties
    this.range = 200;
    this.speed = 0.01;
}

function init() {
	function initWebGL() {
		renderer = new THREE.WebGLRenderer();
		camera = new THREE.PerspectiveCamera(SCENE.FRUSTUM,
											 SCENE.WIDTH / SCENE.HEIGHT,
											 SCENE.NEAR,
											 SCENE.FAR);

		scene = new THREE.Scene();

		camera.position.set(0, 10, 50);
		camera.lookAt(new THREE.Vector3(0, 5, 0));

		// TODO: remove for release
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

    function initLights() {
	    // Hemisphere light
        hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 0.9);

        // Point light
        pointLight = new THREE.PointLight(0xff4c00, 1.0);   // TODO: export to constants
        pointLight.position.set(0, 30, -200);

        scene.add(hemisphereLight);
        scene.add(pointLight);
    }

    // TODO: Make it look like Orzeł 7
    function Spaceship() {
        this.mesh = new THREE.Object3D();

        // Cockpit
        var geomCockpit = new THREE.BoxGeometry(40, 20, 20);

        geomCockpit.vertices[6].z -= 5;
        geomCockpit.vertices[7].z += 5;

        // Front
        var geomFront = new THREE.BoxGeometry(30, 10, 10);

        geomFront.vertices[0].z -= 2;
        geomFront.vertices[1].z += 2;
        geomFront.vertices[2].y += 2;
        geomFront.vertices[3].y += 2;

        geomFront.vertices[4].z -= 5;
        geomFront.vertices[4].y += 10;
        geomFront.vertices[5].z += 5;
        geomFront.vertices[5].y += 10;
        geomFront.vertices[6].z -= 5;
        geomFront.vertices[7].z += 5;

        geomFront.translate(35, -5, 0);

        // Wings
        var geomWings = new THREE.BoxGeometry(20, 4, 100, 1, 1, 3);

        geomWings.vertices[0].x -= 10;
        geomWings.vertices[0].y -= 2;
        geomWings.vertices[1].y -= 2;
        geomWings.vertices[2].y -= 2;
        geomWings.vertices[3].y -= 2;
        geomWings.vertices[3].x -= 10;
        geomWings.vertices[4].x -= 10;
        geomWings.vertices[7].x -= 10;

        // Spaceship
        const mergedGeometry = new THREE.Geometry();
        const mergedMaterial = new THREE.MeshPhongMaterial({
            color: colors.body,
            flatShading: THREE.FlatShading
        });

        mergedGeometry.merge(geomCockpit);
        mergedGeometry.merge(geomFront);
        mergedGeometry.merge(geomWings);

        this.mesh = new THREE.Mesh(mergedGeometry, mergedMaterial);

        this.mesh.scale.set(0.1, 0.1, 0.1);
        this.mesh.rotation.y = Math.PI / 2;
        this.mesh.rotation.x = 0.3;
        this.mesh.position.y -= 15;

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

        // TODO: pass scene as an arg
        scene.add(spaceship.mesh);
    }

    function Board() {
	    this.mesh = new THREE.Object3D();

        const boardGeometry = new THREE.CylinderGeometry(400, 400, 500, 20, 20);
        const boardMaterial = new THREE.MeshPhongMaterial({
            color: colors.board
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

    function initAsteroids() {
	    asteroids = [];
	    asteroids.maxCount = 20;
	    asteroids.cooldown = 0;
    }

	initWebGL();
    initLights();
	initSpaceship();
    initBoard();
    initAsteroids();
}

function render() {
    renderer.render(scene, camera);
}

function updateBoard() {
    board.mesh.rotation.x += 0.01;  // TODO: config rotation speed etc
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

// TODO: missiles should be orbiting around the board
function updateMissiles () {
    for (let i = 0; i < spaceship.missles.length; i++) {
        const missile = spaceship.missles[i];

        missile.mesh.position.sub(board.mesh.position);
        missile.mesh.position.applyAxisAngle(new THREE.Vector3(-1, 0, 0), missile.speed);
        missile.mesh.position.add(board.mesh.position);

        // TODO: make it more generic (3d instead of 1d)
        // if (missile.mesh.position.z < - missile.range) {
        //     spaceship.missles.splice(i, 1);
        //     scene.remove(scene.getObjectByName(missile.mesh.name));
        // }
    }

    if (spaceship.missles.cooldown > 0) {
        spaceship.missles.cooldown -= 1;
    } else {
        spaceship.missles.cooldown = 0;
    }
}

function updateAsteroids() {
    if (!asteroids.cooldown && asteroids.length < asteroids.maxCount) {
        const initialPosition = {
            x: board.mesh.position.x + (BOARD.maxPositionX - BOARD.minPositionX) *Math.random() + BOARD.minPositionX,
            y: board.mesh.position.y - 410,
            z: board.mesh.position.z
        }
        const asteroid = new Asteroid(initialPosition);

        asteroids.push(asteroid);
        scene.add(asteroid.mesh);

        asteroids.cooldown = 50;
    }
    // TODO: generate new asteroids if required
    // TODO: rotate/move the asteroids
    // TODO: remove old asteroids
    // TODO: detect collision

    asteroids.forEach(function(asteroid, ai) {
        // Animate asteroids
        const rotationIncrement = 0.02;

        asteroid.mesh.rotation.x += rotationIncrement;
        asteroid.mesh.rotation.z += rotationIncrement / 2;

        // Rotate around the center
        asteroid.mesh.position.sub(board.mesh.position);
        asteroid.mesh.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.01);
        asteroid.mesh.position.add(board.mesh.position);

        // Collision with missiles
        spaceship.missles.forEach(function(missile, mi) {
            const m = missile.mesh.position;
            const a = asteroid.mesh.position;
            const r = asteroid.radius;

            if (
                (m.x > a.x - r && m.x < a.x + r) &&
                (m.y > a.y - r && m.y < a.y + r) &&
                (m.z > a.z - r && m.z < a.z + r)
            ) {
                // TODO: explosion
                asteroids.splice(ai, 1)
                scene.remove(scene.getObjectByName(asteroid.mesh.name));

                spaceship.missles.splice(mi, 1);
                scene.remove(scene.getObjectByName(missile.mesh.name));
            }
        })
    });

    if (asteroids.cooldown > 0) {
        asteroids.cooldown -= 1;
    } else {
        asteroids.cooldown = 0;
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
    updateAsteroids();

    updateInterface();

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

function updateInterface() {
    const interface = document.getElementById("interface");

    if (interface) {
        interface.innerText = "Cooldown: " + spaceship.missles.cooldown;
    }
}

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

                spaceship.missles.cooldown = 50;    // TODO: don't hardcode it
            }
    }
});
