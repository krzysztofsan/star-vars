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
    missile:    {
        body:   0xcccccc,
        peak:   0xff0000,
        wings:  0xff0000
    },
    asteroid:   0x777777,
    explosion:  0xffffff,
    pickup: {
        rocket:     0x11ffaa,
        life:       0xff2233,
        default:    0xaaaaaa
    }
};

const BOARD = {
    minPositionX: -40,
    maxPositionX:  40
};

// TODO: verify vars and consts for unused
let renderer, camera, scene, controls;
let hemisphereLight, pointLight;
let spaceship, board, asteroids, pickups, explosions = [];

let time = 0;

const PICKUP_TYPE = Object.freeze({
    LIFE:       "life",
    MISSILES:   "missiles"
});

function PickUp(p, type) {
    this.mesh = new THREE.Object3D();
    this.radius = 8;

    let geometry = new THREE.CubeGeometry(8, 8, 8);

    const color = type === PICKUP_TYPE.LIFE ? colors.pickup.life :
        type === PICKUP_TYPE.MISSILES ? colors.pickup.rocket :
            colors.pickup.default;

    let material = new THREE.MeshPhongMaterial({
        color: color,
        flatShading: THREE.SmoothShading
    });

    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.position.set(p.x, p.y, p.z);

    this.mesh.name = "pickup-" + Date.now();
}

function Explosion(p, radius) {
    const particleCount = 1000;
    const particles = new THREE.Geometry();
    const pMaterial = new THREE.PointsMaterial({
        color: colors.explosion,
        size: 0.5,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    for (let i = 0; i < particleCount; i++) {
        const px = Math.random() * 2 * radius - radius;

        const ry = Math.sqrt(radius * radius - px * px);
        const py = Math.random() * 2 * ry - ry;

        const rz = Math.sqrt(ry * ry - py * py);
        const pz = Math.random() * 2 * rz - rz;

        const particle = new THREE.Vector3(px, py, pz);

        particles.vertices.push(particle);
    }

    this.mesh = new THREE.Points(
        particles,
        pMaterial);
    this.mesh.position.set(p.x, p.y, p.z);
    this.mesh.name = "explosion-" + Date.now();

    // TODO: move to init
    this.explosionTimer = 0;
    this.easingFunction = function() {
        return 1.02 + (1 / Math.pow(1 + (this.explosionTimer / 3), 2));
    };
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

    // const translationMatrix = new THREE.Matrix4().makeTranslation(0, -20, 0);
    const scaleMatrix = new THREE.Matrix4().makeScale(0.2, 0.2, 0.2);
    const rotationMatrix = new THREE.Matrix4().makeRotationY(Math.PI / 2).multiply(new THREE.Matrix4().makeRotationZ(0.3));

    const repositionMatrix = rotationMatrix.multiply(scaleMatrix);

    mergedGeometry.applyMatrix(repositionMatrix);

    this.mesh = new THREE.Mesh(mergedGeometry, mergedMaterial);

    this.mesh.position.setY(-20);

    this.mesh.name = "spaceship"
}

function Asteroid(p) {
    this.radius = 8 + (Math.random() * 4 - 2);
    this.mesh = new THREE.Object3D();

    let geometry = new THREE.SphereGeometry(this.radius);
    let material = new THREE.MeshPhongMaterial({
        color: colors.asteroid,
        flatShading: THREE.SmoothShading
    });

    // TODO: improve randomizer mechanism
    for (let i = 0; i < geometry.vertices.length; i ++) {
        const vertex = geometry.vertices[i];
        const max = this.radius / 5;

        vertex.x += Math.random() * max - max / 2;
        vertex.y += Math.random() * max - max / 2;
        vertex.z += Math.random() * max - max / 2;
    }

    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.position.set(p.x, p.y, p.z);

    this.mesh.name = "asteroid-" + Date.now();
}

function Missile(spaceshipPosition) {
    this.mesh = new THREE.Object3D();

    // TODO: Fire!

    // Peak
    const peakGeometry = new THREE.SphereGeometry(1, 8, 8);
    const peakMaterial = new THREE.MeshPhongMaterial({
        color: colors.missile.peak,
        flatShading: THREE.FlatShading      // TODO: necessary?
    });

    peakGeometry.translate(0, -5, 0)

    const peak = new THREE.Mesh(peakGeometry, peakMaterial);


    // Body
    const bodyGeometry = new THREE.CylinderGeometry(1, 1, 10, 8, 10);

    bodyGeometry.translate(0, -10, 0);

    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: colors.missile.body,
        flatShading: THREE.FlatShading      // TODO: necessary?
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);


    // Wings
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

    const wingsGeometry = new THREE.Geometry();

    wingsGeometry.merge(wingsGeometryX);
    wingsGeometry.merge(wingsGeometryZ);

    const wingsMaterial = new THREE.MeshPhongMaterial({
        color: colors.missile.wings,
        flatShading: THREE.FlatShading
    });

    const wings = new THREE.Mesh(wingsGeometry, wingsMaterial);

    // Combining them together
    this.mesh = body;
    this.mesh.add(peak);
    this.mesh.add(wings);

    // Adjusting scale, rotation and position
    this.mesh.scale.set(0.4, 0.4, 0.4);
    this.mesh.rotation.x = -Math.PI / 2 + 0.2;

    this.mesh.position.set(
        spaceshipPosition.x,
        spaceshipPosition.y - 2,
        spaceshipPosition.z - 2
    );

    // Generate an unique id
    this.mesh.name = "missile-" + Date.now();

    // Init missile's properties
    this.range = 200;               // TODO: move elsewhere
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

	function initSpaceship() {
        spaceship = new Spaceship();

        spaceship.leftPressed = false;
        spaceship.leftSpeed = 0;
        spaceship.rightPressed = false;
        spaceship.rightSpeed = 0;

        spaceship.maxSpeed = 1.5;
        spaceship.acceleration = 0.15;
        spaceship.inertia = 0.05;

        spaceship.missles = [];
        spaceship.missles.remaining = 5;
        spaceship.missles.cooldown = 0;
        spaceship.missles.maxCooldown = 30;

        spaceship.lifes = 5;
        spaceship.maxLifes = spaceship.lifes;   // TODO: use it for showing damage/steam coming out of the breaking ship
        spaceship.score = 0;

        spaceship.animations = [];

        // TODO: pass scene as an arg
        scene.add(spaceship.mesh);
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
	    asteroids.maxCooldown = 50;
    }

    function initPickups() {
	    pickups = [];
	    pickups.maxCount = 5;
        pickups.cooldown = 0;
        pickups.maxCooldown = 300;
    }

	initWebGL();
    initLights();

	initSpaceship();
    initBoard();

    initAsteroids();

    initPickups();
}

function render() {
    renderer.render(scene, camera);
}

function updateBoard() {
    board.mesh.rotation.x += 0.01;  // TODO: config rotation speed etc
}

function updateSpaceship() {

    // If there's any animation active, interrupt steering and play it
    if (spaceship.animations && spaceship.animations.length) {
        /*
         *  Animation format:
         *  - position
         *  - rotation
         *  - duration
         */
        const a = spaceship.animations[0];

        if (!a.iterator) {
            a.iterator = 0;
        }

        if (a.iterator < a.duration) {
            spaceship.mesh.position.x += (a.position.x || 0) / a.duration;
            spaceship.mesh.position.y += (a.position.y || 0) / a.duration;
            spaceship.mesh.position.z += (a.position.z || 0) / a.duration;

            spaceship.mesh.rotation.x += (a.rotation.x || 0) / a.duration;
            spaceship.mesh.rotation.y += (a.rotation.y || 0) / a.duration;
            spaceship.mesh.rotation.z += (a.rotation.z || 0) / a.duration;

            a.iterator += 1;
        } else {
            spaceship.animations.splice(0, 1);
        }

        return;
    }

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
    spaceship.mesh.position.y += Math.sin(time / 10) / 20;
    spaceship.mesh.rotation.z = -(speed / spaceship.maxSpeed) * Math.PI / 10;
}

function updateMissiles () {
    for (let i = 0; i < spaceship.missles.length; i++) {
        const missile = spaceship.missles[i];

        missile.mesh.position.sub(board.mesh.position);
        missile.mesh.position.applyAxisAngle(new THREE.Vector3(-1, 0, 0), missile.speed);
        missile.mesh.position.add(board.mesh.position);

        // TODO: Prevent missiles from orbiting (?)
    }

    if (spaceship.missles.cooldown > 0) {
        spaceship.missles.cooldown -= 1;
    } else {
        spaceship.missles.cooldown = 0;
    }
}

function triggerExplosion(position, radius) {
    const explosion = new Explosion(position, radius);

    explosion.mesh.position = position;
    explosions.push(explosion);
    scene.add(explosion.mesh);
}

function triggerCollision(asteroid) {
    const modifier = asteroid.x > spaceship.mesh.position.x ? 1 : -1;

    spaceship.animations.push({
        position: {
            x: -5 * modifier,
            y: -5,
        },
        rotation: {
            x: 0.5,
            z: (Math.PI / 4) * modifier
        },
        duration: 4
    }, {
        position: {
            x: 5 * modifier,
            y: 5,
        },
        rotation: {
            x: -0.5,
            z: (-Math.PI / 4) * modifier
        },
        duration: 10
    });
}

function updateAsteroids() {
    if (!asteroids.cooldown && asteroids.length < asteroids.maxCount) {

        // TODO: Check for existing asteroids to avoid collision
        const initialPosition = {
            x: board.mesh.position.x + (BOARD.maxPositionX - BOARD.minPositionX) *Math.random() + BOARD.minPositionX,
            y: board.mesh.position.y - 410,
            z: board.mesh.position.z
        }
        const asteroid = new Asteroid(initialPosition);

        asteroids.push(asteroid);
        scene.add(asteroid.mesh);

        asteroids.cooldown = asteroids.maxCooldown;
    }

    asteroids.forEach(function(asteroid, ai) {
        // Animate asteroids
        const rotationIncrement = 0.02;

        asteroid.mesh.rotation.x += rotationIncrement;
        asteroid.mesh.rotation.z += rotationIncrement / 2;

        // Rotate around the center // TODO: make it general for all the objects
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
                triggerExplosion(a, r);

                asteroids.splice(ai, 1)
                scene.remove(scene.getObjectByName(asteroid.mesh.name));

                spaceship.missles.splice(mi, 1);
                scene.remove(scene.getObjectByName(missile.mesh.name));

                if (spaceship.lifes > 0) {
                    spaceship.score += 1;
                }
            }
        });

        // Collision with the spaceship
        if (spaceship.lifes > 0) {
            const s = spaceship.mesh.position;
            const a = asteroid.mesh.position;
            const r = asteroid.radius;

            // TODO: 1. extract 2. add a hitbox to the spaceship
            if (
                (s.x > a.x - r && s.x < a.x + r) &&
                (s.y > a.y - r && s.y < a.y + r) &&
                (s.z > a.z - r && s.z < a.z + r)
            ) {
                // TODO: Change collision animation
                triggerExplosion(spaceship.mesh.position, 2);
                triggerCollision(a);

                asteroids.splice(ai, 1)
                scene.remove(scene.getObjectByName(asteroid.mesh.name));

                spaceship.lifes -= 1;

                // TODO: export to a function
                if (spaceship.lifes <= 0) {
                    scene.remove(scene.getObjectByName(spaceship.mesh.name));

                    window.removeEventListener("keyup", keyUp);
                    window.removeEventListener("keydown", keyDown);

                    if (window.DeviceMotionEvent) {
                        window.removeEventListener("devicemotion", deviceMotion);
                        window.removeEventListener("touchend", touchend);
                    }
                }
            }
        }
    });

    if (asteroids.cooldown > 0) {
        asteroids.cooldown -= 1;
    } else {
        asteroids.cooldown = 0;
    }
}

function updatePickups() {
    if (!pickups.cooldown && pickups.length < pickups.maxCount) {

        // TODO: Check for existing asteroids to avoid collision
        const initialPosition = {
            x: board.mesh.position.x + (BOARD.maxPositionX - BOARD.minPositionX) *Math.random() + BOARD.minPositionX,
            y: board.mesh.position.y - 410,
            z: board.mesh.position.z
        };

        const type = Math.random() < 0.05 ? PICKUP_TYPE.LIFE : PICKUP_TYPE.MISSILES;

        const pickup = new PickUp(initialPosition, type);

        pickup.bonus = {
            lifes: type === PICKUP_TYPE.LIFE && 1,
            missles: type === PICKUP_TYPE.MISSILES && 1  // TODO: add randomization
        }

        pickups.push(pickup);
        scene.add(pickup.mesh);

        pickups.cooldown = pickups.maxCooldown;
    }

    pickups.forEach(function(pickup, pi) {
        // Animate pickups
        const rotationIncrement = 0.02;

        pickup.mesh.rotation.y += rotationIncrement;

        // Rotate around the center // TODO: make it general for all the objects
        pickup.mesh.position.sub(board.mesh.position);
        pickup.mesh.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.01);
        pickup.mesh.position.add(board.mesh.position);


        // Collision with the spaceship
        if (spaceship.lifes > 0) {
            const s = spaceship.mesh.position;
            const p = pickup.mesh.position;
            const r = pickup.radius;

            // TODO: 1. extract 2. add a hitbox to the spaceship
            if (
                (s.x > p.x - r && s.x < p.x + r) &&
                (s.y > p.y - r && s.y < p.y + r) &&
                (s.z > p.z - r && s.z < p.z + r)
            ) {
                // TODO: Add collection animation
                pickups.splice(pi, 1)
                scene.remove(scene.getObjectByName(pickup.mesh.name));

                spaceship.lifes += pickup.bonus.lifes;
                spaceship.missles.remaining += pickup.bonus.missles;
            }
        }
    });


    if (pickups.cooldown > 0) {
        pickups.cooldown -= 1;
    } else {
        pickups.cooldown = 0;
    }
}

function updateExplosions() {
    explosions.forEach(function(explosion, ei) {
        explosion.mesh.scale.multiplyScalar(explosion.easingFunction());
        explosion.mesh.material.opacity = (100 - explosion.explosionTimer) / 100;

        if (explosion.explosionTimer > 100) {   // TODO: set as a constant
            explosions.splice(ei, 1);
            scene.remove(scene.getObjectByName(explosion.mesh.name));
        }

        explosion.explosionTimer += 1;

        // Orbit // TODO: make it general for all the objects
        explosion.mesh.position.sub(board.mesh.position);
        explosion.mesh.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.01);
        explosion.mesh.position.add(board.mesh.position);
    })
}

function animate() {
    time += 1;

    // TODO: remove for release
    if (CONFIG.controls.enabled) {
        controls.update();
    }

    if (spaceship.lifes > 0) {
        updateSpaceship();
    }

    updateBoard();
    updateMissiles();
    updateAsteroids();
    updatePickups();
    updateExplosions();

    updateInterface();

	requestAnimationFrame(animate);
	render();
}


init();
render();
animate();

function updateInterface() {
    const interface = document.getElementById("interface");

    // TODO: improve
    if (interface) {
        interface.innerText = spaceship.lifes ?
            "Cooldown: \t\t" + spaceship.missles.cooldown + "\n" +
            "Lives: \t\t" + spaceship.lifes + "\n" +
            "Missles: \t\t" + spaceship.missles.remaining + "\n" +
            "Score: \t\t" + spaceship.score + "\n"
            :
            "THE END!\nScore: " + spaceship.score;
    }
}

function keyUp(event) {
    var keyCode = event.which;

    switch (keyCode) {
        case KEY_CODE.LEFT:
            spaceship.leftPressed = false;
            break;
        case KEY_CODE.RIGHT:
            spaceship.rightPressed = false;
            break;
        case KEY_CODE.SPACE:
            if (!spaceship.missles.cooldown && spaceship.missles.remaining > 0) {
                spaceship.missles.push(new Missile(spaceship.mesh.position));
                scene.add(spaceship.missles[spaceship.missles.length - 1].mesh);    // TODO: rethink that

                spaceship.missles.cooldown = spaceship.missles.maxCooldown;
                spaceship.missles.remaining -= 1;
            }
    }
}

function keyDown(event) {
    var keyCode = event.which;

    switch (keyCode) {
        case KEY_CODE.RIGHT:
            spaceship.rightPressed = true;
            break;
        case KEY_CODE.LEFT:
            spaceship.leftPressed = true;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onWindowResize);

window.addEventListener("keydown", keyDown);
window.addEventListener("keyup", keyUp);

if (window.DeviceMotionEvent) {
    function deviceMotion(event) {
        const acc = event.accelerationIncludingGravity;

        // TODO: prototype - works only for portrait mode
        if (acc.x > 1) {
            spaceship.rightPressed = true;
        } else if (acc.x < -1) {
            spaceship.leftPressed = true;
        } else {
            spaceship.rightPressed = false;
            spaceship.leftPressed = false;
        }
    }

    function touchend() {
        if (!spaceship.missles.cooldown) {
            spaceship.missles.push(new Missile(spaceship.mesh.position));
            scene.add(spaceship.missles[spaceship.missles.length - 1].mesh);    // TODO: rethink that

            spaceship.missles.cooldown = spaceship.missles.maxCooldown;
        }
    }

    window.addEventListener('devicemotion', deviceMotion);
    window.addEventListener("touchend", touchend);
}
