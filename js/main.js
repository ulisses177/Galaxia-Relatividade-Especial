// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 100000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Initialize galaxy
const randomGen = new RandomGenerator(42);
const galaxyGenerator = new GalaxyGenerator({
    centerDensity: 30,
    peripheryDensity: 30,
    galaxyRadius: 5000,
    armSpread: 0.5,
    armCount: 4,
    armTwist: 2 * Math.PI
}, randomGen);

const galaxyData = galaxyGenerator.generateStars(2000) // Especifica número de estrelas

// Create stars
const stars = galaxyData.map(star => {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
        color: star.color,
        transparent: true,
        opacity: 1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.basePosition = new THREE.Vector3(star.x, star.y, star.z);
    mesh.position.copy(mesh.basePosition);
    mesh.baseMaterial = material.clone();
    
    // Configure frustum culling
    const distanceFromCenter = Math.sqrt(star.x*star.x + star.y*star.y + star.z*star.z);
    const isInCenterOrArms = distanceFromCenter < galaxyGenerator.galaxyRadius * 0.2 || 
                            isInSpiralArm(star.x, star.y, star.z, galaxyGenerator);
    
    mesh.frustumCulled = !(star.spectralType === 'O' && isInCenterOrArms);
    
    scene.add(mesh);
    return mesh;
});

// Add fixed stars to scene
FIXED_STARS.forEach(star => {
    const geometry = new THREE.SphereGeometry(5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(star.position);
    star.mesh = mesh; // Armazenar referência do mesh na estrela
    scene.add(mesh);
});

// Setup player controls
Player.setupMouseControls(renderer);

// Time tracking
let startTime = Date.now();
let properTime = 0;
let coordinateTime = 0;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update player movement
    Player.updateMovement();
    Player.position.add(Player.velocity);

    // Calculate time dilation
    const currentTime = Date.now();
    const speed = Player.velocity.length();
    const speedRatio = speed / Core.c;
    
    // Dynamic time scale
    let dynamicTimeScale = Core.BASE_TIME_SCALE * Core.GALAXY_SCALE_FACTOR;
    if (speedRatio < 0.1) {
        const transitionFactor = speedRatio / 0.1;
        dynamicTimeScale = Core.BASE_TIME_SCALE + 
            (dynamicTimeScale - Core.BASE_TIME_SCALE) * transitionFactor;
    }

    const deltaMs = (currentTime - startTime) * dynamicTimeScale;
    const gamma = Core.calculateTimeDilation(Player.velocity);
    
    // Update times
    coordinateTime += deltaMs;
    properTime += deltaMs / gamma;
    startTime = currentTime;

    // Update camera
    camera.rotation.x = Player.pitch;
    camera.rotation.y = Player.yaw;
    camera.position.copy(Player.position);

    // Update star positions with relativistic effects
    stars.forEach(star => {
        const transformed = Core.lorentzTransform(star.basePosition, Player.velocity, Player.position);
        star.position.copy(transformed.position);
        
        const doppler = Core.dopplerShift(transformed.relativeVel);
        star.material.color.copy(doppler.color);
        star.material.opacity = doppler.intensity;
    });

    // Aplicar efeito Doppler às estrelas fixas
    FIXED_STARS.forEach(star => {
        const transformed = Core.lorentzTransform(star.position, Player.velocity, Player.position);
        const doppler = Core.dopplerShift(-transformed.relativeVel);
        
        // Atualizar cor e brilho da estrela fixa
        if (star.mesh) {
            star.mesh.material.color.copy(doppler.color);
            star.mesh.material.opacity = doppler.intensity;
        }
    });

    // Update UI
    if (window.UI && typeof window.UI.update === 'function') {
        window.UI.update(camera);
    }

    // Render scene
    renderer.render(scene, camera);
}

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Helper function for spiral arms
function isInSpiralArm(x, y, z, galaxyGen) {
    const r = Math.sqrt(x*x + z*z);
    const theta = Math.atan2(z, x);
    
    for (let i = 0; i < galaxyGen.armCount; i++) {
        const startAngle = (i * 2 * Math.PI) / galaxyGen.armCount;
        const expectedTheta = startAngle + (r / galaxyGen.galaxyRadius) * galaxyGen.armTwist;
        const angleDiff = Math.abs(((theta - expectedTheta + Math.PI) % (2 * Math.PI)) - Math.PI);
        
        if (angleDiff < galaxyGen.armSpread) {
            return true;
        }
    }
    return false;
}

// Start the simulation
animate();

// Make time variables available globally for UI
window.properTime = properTime;
window.coordinateTime = coordinateTime;

// Após criar Core.scene ...
Player.init(Core.scene);
