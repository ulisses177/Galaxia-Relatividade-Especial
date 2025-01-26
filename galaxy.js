
// Seeded random number generator
class RandomGenerator {
    constructor(seed = 42) {
        this.seed = seed;
    }

    random() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }
}
class GalaxyGenerator {
    constructor(options = {}, randomGen) {
        this.randomGen = randomGen || new RandomGenerator();
        this.centerDensity = options.centerDensity || 30;
        this.peripheryDensity = options.peripheryDensity || 0.25;
        this.galaxyRadius = options.galaxyRadius || 50000;
        this.armSpread = options.armSpread || 0.5;
        this.armCount = options.armCount || 4;
        this.armTwist = options.armTwist || 2 * Math.PI;
    }
    calculateDensity(x, y, z) {
        const distanceFromCenter = Math.sqrt(x*x + y*y + z*z);
        const normalizedDistance = distanceFromCenter / this.galaxyRadius;
        return this.centerDensity * Math.exp(-normalizedDistance * 3);
    }
    generateStars(totalStars = 10000) {
        const stars = [];
        for (let i = 0; i < totalStars; i++) {
            const r = this.randomGen.random() * this.galaxyRadius;
            const theta = this.randomGen.random() * 2 * Math.PI;
            const phi = Math.acos(1 - 2 * this.randomGen.random());
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            const density = this.calculateDensity(x, y, z);
            const starProbability = this.randomGen.random() < (density / this.centerDensity);
            if (starProbability) {
                const spectralType = this.generateSpectralType();
                stars.push({
                    x, y, z, 
                    spectralType,
                    color: this.getStarColor(spectralType)
                });
            }
        }
        return stars;
    }
    generateSpectralType() {
        const types = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
        const probabilities = [0.00003, 0.003, 0.1, 0.3, 0.4, 0.2, 0.07];
        
        let random = this.randomGen.random();
        for (let i = 0; i < types.length; i++) {
            if (random < probabilities[i]) return types[i];
            random -= probabilities[i];
        }
        return 'M';
    }
    getStarColor(spectralType) {
        const colorMap = {
            'O': 0x8C97FF,
            'B': 0x9BB0FF,
            'A': 0xCAD7FF,
            'F': 0xFFFFF0,
            'G': 0xFFF4B3,
            'K': 0xFFD2A1,
            'M': 0xFF9A71
        };
        return colorMap[spectralType] || 0xFFFFFF;
    }
}
// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 100000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Physics variables
const velocity = new THREE.Vector3(0, 0, 0);
const position = new THREE.Vector3(0, 0, 0);
const c = 1.0;
const acceleration = 0.01;
// Camera control variables
let pitch = 0;
let yaw = 0;
let isMouseDown = false;
let previousMousePosition = { x: 0, y: 0 };
function createStar(x, y, z, color, size = 2) {
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const star = new THREE.Mesh(geometry, material);
    star.basePosition = new THREE.Vector3(x, y, z);
    star.position.copy(star.basePosition);
    star.baseMaterial = material;
    star.frustumCulled = false;
    scene.add(star);
    return star;
}
// Initialize galaxy
const randomGen = new RandomGenerator(42);
const galaxyGenerator = new GalaxyGenerator({}, randomGen);
const galaxyData = galaxyGenerator.generateStars();
const stars = galaxyData.map(star => createStar(star.x, star.y, star.z, star.color));
// Input handling
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);
renderer.domElement.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    
    const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y
    };
    const mouseSensitivity = 0.005;
    yaw -= deltaMove.x * mouseSensitivity;
    pitch -= deltaMove.y * mouseSensitivity;
    pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    previousMousePosition = { x: e.clientX, y: e.clientY };
});
document.addEventListener('mouseup', () => {
    isMouseDown = false;
});
// Relativistic effects functions
function dopplerShift(relativeVelocity) {
    const beta = relativeVelocity / c;
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    const factor = gamma * (1 - beta);
    
    let r = 1, b = 1;
    const intensity = factor > 1 ? 1/(factor*factor) : 1;
    
    if (factor > 1) {
        b = 1/factor;
    } else {
        r = factor;
    }
    
    return {
        color: new THREE.Color(r, r, b),
        intensity: intensity
    };
}
function lorentzTransform(basePos, vel, pos) {
    const v = vel.length();
    const gamma = v > 0 ? 1 / Math.sqrt(1 - (v * v) / (c * c)) : 1;
    
    const relativePos = new THREE.Vector3().copy(basePos).sub(pos);
    const direction = vel.clone().normalize();
    
    const parallel = direction.clone().multiplyScalar(relativePos.dot(direction));
    const perpendicular = relativePos.clone().sub(parallel);
    const contracted = parallel.multiplyScalar(gamma).add(perpendicular.divideScalar(gamma));
    
    const relativeVel = vel.dot(relativePos.normalize());
    
    return { position: contracted, relativeVel: relativeVel };
}
function updateMovement() {
    // Create rotation matrices for pitch and yaw
    const rotationMatrix = new THREE.Matrix4();
    const pitchMatrix = new THREE.Matrix4().makeRotationX(pitch);
    const yawMatrix = new THREE.Matrix4().makeRotationY(yaw);
    rotationMatrix.multiplyMatrices(yawMatrix, pitchMatrix);
    // Create direction vector based on key presses
    const moveDirection = new THREE.Vector3();
    if(keys['ArrowUp']) moveDirection.z -= acceleration;
    if(keys['ArrowDown']) moveDirection.z += acceleration;
    if(keys['ArrowRight']) moveDirection.x += acceleration;
    if(keys['ArrowLeft']) moveDirection.x -= acceleration;
    if(keys['w']) moveDirection.y += acceleration;
    if(keys['s']) moveDirection.y -= acceleration;
    // Apply camera rotation to movement direction
    moveDirection.applyMatrix4(rotationMatrix);
    
    // Add to velocity
    velocity.add(moveDirection);
    // Limit speed to light speed
    const speed = velocity.length();
    if(speed > c) velocity.multiplyScalar(c/speed);
}
// Minimap setup
const minimapSize = 200; // Slightly larger
const minimapRenderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true // Enable transparency
});
minimapRenderer.setSize(minimapSize, minimapSize);
minimapRenderer.setClearColor(0x000000, 0.3); // Semi-transparent background
// Style the minimap container
const minimapContainer = document.createElement('div');
minimapContainer.style.position = 'absolute';
minimapContainer.style.bottom = '20px';
minimapContainer.style.right = '20px';
minimapContainer.style.width = `${minimapSize}px`;
minimapContainer.style.height = `${minimapSize}px`;
minimapContainer.style.background = 'rgba(0, 0, 0, 0.5)';
minimapContainer.style.borderRadius = '50%';
minimapContainer.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.5)';
minimapContainer.style.overflow = 'hidden';
minimapContainer.appendChild(minimapRenderer.domElement);
document.body.appendChild(minimapContainer);
const minimapScene = new THREE.Scene();
// Top-down orthographic camera
const minimapCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100000);
minimapCamera.position.set(0, 50000, 0); // Position high above
minimapCamera.lookAt(0, 0, 0);
// Create ship indicator for minimap
const shipIndicator = new THREE.Group();
// Main ship dot (smaller and brighter)
const shipDot = new THREE.Mesh(
    new THREE.CircleGeometry(galaxyGenerator.galaxyRadius * 0.01, 32),
    new THREE.MeshBasicMaterial({ 
        color: 0x4CAF50, // Material Design green
        transparent: true,
        opacity: 1.0
    })
);
shipDot.rotation.x = -Math.PI / 2;
// Direction indicator (more pronounced arrow)
const directionArrow = new THREE.Mesh(
    new THREE.ConeGeometry(
        galaxyGenerator.galaxyRadius * 0.008, // base
        galaxyGenerator.galaxyRadius * 0.02,  // height
        32
    ),
    new THREE.MeshBasicMaterial({ 
        color: 0x4CAF50,
        transparent: true,
        opacity: 0.8
    })
);
directionArrow.position.z = galaxyGenerator.galaxyRadius * 0.015;
directionArrow.rotation.x = -Math.PI / 2;
// Add a ring around the ship for better visibility
const shipRing = new THREE.Mesh(
    new THREE.RingGeometry(
        galaxyGenerator.galaxyRadius * 0.012,
        galaxyGenerator.galaxyRadius * 0.015,
        32
    ),
    new THREE.MeshBasicMaterial({
        color: 0x4CAF50,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    })
);
shipRing.rotation.x = -Math.PI / 2;
shipIndicator.add(shipDot);
shipIndicator.add(directionArrow);
shipIndicator.add(shipRing);
minimapScene.add(shipIndicator);
// Create galaxy representation for minimap
const galaxyShape = new THREE.Group();
// Central bulge
const bulge = new THREE.Mesh(
    new THREE.CircleGeometry(galaxyGenerator.galaxyRadius * 0.2, 64),
    new THREE.MeshBasicMaterial({ 
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.4
    })
);
bulge.rotation.x = -Math.PI / 2;
galaxyShape.add(bulge);
// Spiral arms
for (let i = 0; i < galaxyGenerator.armCount; i++) {
    const arm = new THREE.BufferGeometry();
    const points = [];
    const startAngle = (i * 2 * Math.PI) / galaxyGenerator.armCount;
    
    for (let r = 0; r < galaxyGenerator.galaxyRadius; r += galaxyGenerator.galaxyRadius/100) {
        const angle = startAngle + (r / galaxyGenerator.galaxyRadius) * galaxyGenerator.armTwist;
        points.push(new THREE.Vector3(
            r * Math.cos(angle),
            0,
            r * Math.sin(angle)
        ));
    }
    
    arm.setFromPoints(points);
    const armLine = new THREE.Line(
        arm,
        new THREE.LineBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.2
        })
    );
    galaxyShape.add(armLine);
}
minimapScene.add(galaxyShape);
// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    updateMovement();
    position.add(velocity);
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;
    // Update main view
    stars.forEach(star => {
        const transformed = lorentzTransform(star.basePosition, velocity, position);
        star.position.copy(transformed.position);
        
        const doppler = dopplerShift(transformed.relativeVel);
        star.material.color.copy(doppler.color);
        star.material.opacity = doppler.intensity;
    });
    // Update minimap
    const speed = velocity.length();
    const speedRatio = speed / c;
    
    // Dynamic zoom based on speed (inverted logic - zoom out as we go faster)
    const baseZoom = galaxyGenerator.galaxyRadius * 0.5; // Start more zoomed in
    const zoom = baseZoom / (1 + speedRatio * 2); // Divide instead of multiply to zoom out
    minimapCamera.left = -zoom;
    minimapCamera.right = zoom;
    minimapCamera.top = zoom;
    minimapCamera.bottom = -zoom;
    minimapCamera.updateProjectionMatrix();
    // Update ship position and rotation in minimap
    // Project the 3D position onto the 2D minimap plane (ignore Y coordinate)
    shipIndicator.position.set(position.x, 0, position.z);
    
    // Calculate direction from velocity for the arrow
    if (velocity.length() > 0.001) {
        // Project velocity onto XZ plane for minimap rotation
        const angle = Math.atan2(velocity.x, velocity.z);
        shipIndicator.rotation.y = angle;
    }
    // Render both views
    renderer.render(scene, camera);
    minimapRenderer.render(minimapScene, minimapCamera);
    // Update speed info
    const info = `Velocidade: ${(speed/c).toFixed(3)}c
X: ${velocity.x.toFixed(3)}
Y: ${velocity.y.toFixed(3)}
Z: ${velocity.z.toFixed(3)}`;
    document.getElementById('info').textContent = info;
}
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    minimapRenderer.setSize(minimapSize, minimapSize);
});
// Start simulation
animate();