// Classe Player para gerenciar estado e controles
class PlayerController {
    constructor() {
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.maxAcceleration = 0.002;
        this.jerkFactor = 0.1;
        this.currentAcceleration = 0;
        this.pitch = 0;
        this.yaw = 0;
        this.isMouseDown = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.keys = {};
        this.currentAutopilot = null;
        this.selectedStar = null;

        // Bind methods
        this.setupMouseControls = this.setupMouseControls.bind(this);
        this.handleMovement = this.handleMovement.bind(this);
        this.updateMovement = this.updateMovement.bind(this);

        // Setup keyboard controls
        document.addEventListener('keydown', (e) => this.keys[e.key] = true);
        document.addEventListener('keyup', (e) => this.keys[e.key] = false);
    }

    setupMouseControls(renderer) {
        let touchStartX = 0;
        let touchStartY = 0;

        // Mouse controls
        renderer.domElement.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        renderer.domElement.addEventListener('mousemove', (e) => this.handleMovement(e));
        
        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        // Touch controls
        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isMouseDown = true;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                this.previousMousePosition = { x: touchStartX, y: touchStartY };
            }
        });

        renderer.domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                e.preventDefault();
                this.handleMovement(e.touches[0]);
            }
        });

        renderer.domElement.addEventListener('touchend', () => {
            this.isMouseDown = false;
        });
    }

    handleMovement(e) {
        if (!this.isMouseDown) return;
        
        const deltaMove = {
            x: e.clientX - this.previousMousePosition.x,
            y: e.clientY - this.previousMousePosition.y
        };

        const mouseSensitivity = 0.005;
        this.yaw -= deltaMove.x * mouseSensitivity;
        this.pitch -= deltaMove.y * mouseSensitivity;
        this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    updateMovement() {
        if (this.currentAutopilot && this.currentAutopilot.active) {
            const autopilotAcceleration = this.currentAutopilot.update(this.position, this.velocity);
            if (autopilotAcceleration) {
                const targetAccel = autopilotAcceleration.length();
                this.currentAcceleration = Math.min(
                    targetAccel,
                    this.currentAcceleration + this.jerkFactor * this.maxAcceleration
                );
                
                const normalizedAccel = autopilotAcceleration.normalize();
                this.velocity.add(normalizedAccel.multiplyScalar(this.currentAcceleration));
                
                const speed = this.velocity.length();
                if (speed > Core.c * 0.9999) {
                    this.velocity.multiplyScalar((Core.c * 0.9999)/speed);
                }
            } else {
                this.currentAutopilot = null;
                this.selectedStar = null;
                this.currentAcceleration = 0;
            }
            return;
        }

        const rotationMatrix = new THREE.Matrix4();
        const pitchMatrix = new THREE.Matrix4().makeRotationX(this.pitch);
        const yawMatrix = new THREE.Matrix4().makeRotationY(this.yaw);
        rotationMatrix.multiplyMatrices(yawMatrix, pitchMatrix);

        const moveDirection = new THREE.Vector3();
        if(this.keys['ArrowUp']) moveDirection.y -= 1;
        if(this.keys['ArrowDown']) moveDirection.y += 1;
        if(this.keys['ArrowRight']) moveDirection.x += 1;
        if(this.keys['ArrowLeft']) moveDirection.x -= 1;
        if(this.keys['w']) moveDirection.z -= 1;
        if(this.keys['s']) moveDirection.z += 1;

        if (moveDirection.length() > 0) {
            this.currentAcceleration = Math.min(
                this.maxAcceleration,
                this.currentAcceleration + this.jerkFactor * this.maxAcceleration
            );
            moveDirection.normalize();
            moveDirection.applyMatrix4(rotationMatrix);
            moveDirection.multiplyScalar(this.currentAcceleration);
            this.velocity.add(moveDirection);
        } else {
            this.currentAcceleration = Math.max(0, this.currentAcceleration - this.jerkFactor * this.maxAcceleration);
        }

        const speed = this.velocity.length();
        if(speed > Core.c * 0.99999) {
            this.velocity.multiplyScalar((Core.c * 0.99999)/speed);
        }
    }
}

// Classe Autopilot permanece a mesma
class Autopilot {
    constructor(target, currentPosition, currentVelocity) {
        this.target = target;
        this.currentPosition = currentPosition;
        this.currentVelocity = currentVelocity;
        this.active = true;
        this.maxSpeed = Core.c * 0.99;
        this.arrivalDistance = 40;
        this.stoppingDistance = 80;
    }

    update(position, velocity) {
        if (!this.active) return null;

        const toTarget = new THREE.Vector3().subVectors(this.target, position);
        const distance = toTarget.length();
        const direction = toTarget.normalize();
        
        if (distance < this.arrivalDistance && velocity.length() < 0.01) {
            this.active = false;
            return null;
        }

        const currentSpeed = velocity.length();
        const stopDistance = (currentSpeed * currentSpeed) / (2 * Player.maxAcceleration);
        
        if (distance < this.stoppingDistance || distance < stopDistance * 1.2) {
            const desiredSpeed = Math.sqrt(2 * Player.maxAcceleration * Math.max(0, distance - this.arrivalDistance));
            const currentDirection = velocity.clone().normalize();
            const brakingDirection = currentDirection.multiplyScalar(-1);
            
            return brakingDirection.multiplyScalar(Player.maxAcceleration);
        }
        
        if (currentSpeed < this.maxSpeed) {
            return direction.multiplyScalar(Player.maxAcceleration);
        }

        return new THREE.Vector3(0, 0, 0);
    }
}

// Criar e exportar a instância do Player
window.Player = new PlayerController();
window.Player.Autopilot = Autopilot;
