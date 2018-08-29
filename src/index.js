const SCENE = {
	FRUSTUM: 75,
	WIDTH: window.innerWidth,
	HEIGHT: window.innerHeight,
	NEAR: 0.01,
	FAR: 1000
};

const CONFIG = {
    controls: {
        enabled: true
    },
    camera: {
        autoRotate: false
    }
};

const KEY_CODE = {
    UP:     38,
    DOWN:   40,
    LEFT:   37,
    RIGHT:  39
}

const colors = {
    cockpit: 0xdddddd,
    body: 0xdddddd,
};

const BOARD = {
    minPositionX: -10,
    maxPositionX:  10
};

let renderer, camera, scene, controls;
let hemisphereLight, shadowLight, ambientLight, pointLight;
let spaceship, board;

let time = 0;

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

    function initLights() {
	    // Hemisphere light
        hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);

        // Shadow light
        shadowLight = new THREE.DirectionalLight(0xffffff, 1.0);
        shadowLight.position.set(100, 50, -100);
        shadowLight.castShadow = true;

        // Ambient light
        ambientLight = new THREE.AmbientLight(0xdddddd, .5);

        // Point light
        pointLight = new THREE.PointLight(0xffffff, 1.0);
        pointLight.position.set(0, 30, -200);

        scene.add(hemisphereLight);
        // scene.add(shadowLight);
        // scene.add(ambientLight);
        scene.add(pointLight);
    }

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

        this.mesh.add(wings);


        // TODO: merge all the geometries
        const mergedGeometry = new THREE.Geometry();
        const mergedMaterial = new THREE.MeshPhongMaterial({
            color: colors.body,
            flatShading: THREE.FlatShading
        });

        mergedGeometry.merge(geomCockpit);
        mergedGeometry.merge(geomEngine);
        mergedGeometry.merge(geomWings);

        this.mesh = new THREE.Mesh(mergedGeometry, mergedMaterial);

        this.speed = 0;
        this.maxSpeed = 0.5;
        this.acceleration = 0.1;
        this.slowdown = false;
        this.inertia = 0.01;
    }

	function initSpaceship() {
        spaceship = new Spaceship();

        spaceship.mesh.scale.set(0.1, 0.1, 0.1);
        spaceship.mesh.rotation.y = Math.PI / 2;

        spaceship.mesh.updateMatrix();
        spaceship.mesh.geometry.applyMatrix(spaceship.mesh.matrix);
        spaceship.mesh.matrix.identity();

        spaceship.mesh.position.set(0, 0, 0);
        spaceship.mesh.rotation.set(0, 0, 0);
        spaceship.mesh.scale.set(1, 1, 1);

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

function animate() {
    time += 1;

    if (CONFIG.controls.enabled) {
        controls.update();
    }

    // Animate the spaceship
    spaceship.mesh.position.y = Math.sin(time / 10) / 5;
    spaceship.mesh.rotation.z = (-spaceship.speed / spaceship.maxSpeed) * Math.PI / 20;

    spaceship.mesh.position.x += spaceship.speed;

    // Slowdown
    if (spaceship.slowdown) {
        if (spaceship.speed > 0) {
            if (spaceship.speed < spaceship.inertia) {
                spaceship.speed = 0;
            } else {
                spaceship.speed -= spaceship.inertia;
            }
        }

        if (spaceship.speed < 0) {
            if (spaceship.speed > -spaceship.inertia) {
                spaceship.speed = 0;
            } else {
                spaceship.speed += spaceship.inertia;
            }
        }
    }

    // Animate board
    board.mesh.rotation.x += 0.01;

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
            if (spaceship.mesh.position.x < BOARD.maxPositionX) {
                spaceship.slowdown = false;
                spaceship.speed = spaceship.speed < spaceship.maxSpeed ?
                    spaceship.speed + spaceship.acceleration :
                    spaceship.maxSpeed;
            } else {
                spaceship.slowdown = true;
            }
            break;
        case KEY_CODE.LEFT:
            if (spaceship.mesh.position.x > BOARD.minPositionX) {
                spaceship.slowdown = false;
                spaceship.speed = spaceship.speed > -spaceship.maxSpeed ?
                    spaceship.speed - spaceship.acceleration :
                    -spaceship.maxSpeed;
            } else {
                spaceship.slowdown = true;
            }
    }

});

document.addEventListener("keyup", function(event) {
    var keyCode = event.which;

    switch (keyCode) {
        case KEY_CODE.LEFT:
        case KEY_CODE.RIGHT:
            spaceship.slowdown = true;
    }

});
