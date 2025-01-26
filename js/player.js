// Classe Player para gerenciar estado e controles
class PlayerController {
    constructor() {
        this.position = new THREE.Vector3(-400, 0, 1300);
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
        this.lastClickTime = 0;
        this.doubleClickDelay = 300; // milissegundos entre clicks para considerar double click

        // Adicionar propriedades para a nave e bolha
        this.shipMesh = null;
        this.bubbleMesh = null;
    }

    // Método para ser chamado depois que Core.scene estiver disponível
    init(scene) {
        this.scene = scene;
        this.camera = window.camera;
        this.initShipAndBubble();
        this.setupMouseControls(Core.renderer);
    }

    initShipAndBubble() {
        // Criar geometria da nave (pirâmide fina)
        const shipGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, 2, 0,    // ponta
            -0.5, -1, 0.5,  // base
            0.5, -1, 0.5,
            0.5, -1, -0.5,
            -0.5, -1, -0.5
        ]);
        const indices = new Uint16Array([
            0, 1, 2,  // face frontal
            0, 2, 3,  // face direita
            0, 3, 4,  // face traseira
            0, 4, 1,  // face esquerda
            1, 3, 2,  // base 1
            1, 4, 3   // base 2
        ]);
        shipGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        shipGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
        shipGeometry.computeVertexNormals();

        // Material da nave
        const shipMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.8,
            depthTest: false
        });

        // Criar a nave
        this.shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
        this.shipMesh.scale.set(3, 3, 3);
        this.shipMesh.renderOrder = 999;
        this.scene.add(this.shipMesh);

        // Criar a bolha relativística
        const bubbleGeometry = new THREE.SphereGeometry(5, 32, 32);
        const bubbleMaterial = new THREE.MeshBasicMaterial({
            color: 0x4444ff,
            wireframe: true,
            transparent: true,
            opacity: 0.2,
            depthTest: false
        });

        this.bubbleMesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        this.bubbleMesh.renderOrder = 998;
        this.scene.add(this.bubbleMesh);
    }

    setupMouseControls(renderer) {
        let touchStartX = 0;
        let touchStartY = 0;

        // Double click handler
        const handleDoubleClick = () => {
            if (this.currentAutopilot) {
                this.currentAutopilot = null;
                this.selectedStar = null;
                this.currentAcceleration = 0;
                // Zerar a velocidade ao sair do autopilot
                this.velocity.set(0, 0, 0);
            }
        };

        // Mouse controls
        renderer.domElement.addEventListener('click', (e) => {
            const currentTime = new Date().getTime();
            const timeDiff = currentTime - this.lastClickTime;
            
            if (timeDiff < this.doubleClickDelay) {
                handleDoubleClick();
            }
            
            this.lastClickTime = currentTime;
        });

        renderer.domElement.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        renderer.domElement.addEventListener('mousemove', (e) => this.handleMovement(e));
        
        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        // Touch controls
        let lastTapTime = 0;
        renderer.domElement.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const timeDiff = currentTime - lastTapTime;
            
            if (timeDiff < this.doubleClickDelay) {
                handleDoubleClick();
                e.preventDefault(); // Prevenir zoom em dispositivos móveis
            }
            
            lastTapTime = currentTime;
            this.isMouseDown = false;
        });

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

        // Atualizar posição e rotação da nave e bolha
        if (this.shipMesh && this.bubbleMesh && this.camera) {
            // Posicionar objetos relativos à câmera
            const cameraDirection = new THREE.Vector3(0, 0, -1);
            cameraDirection.applyQuaternion(this.camera.quaternion);
            
            // Posicionar nave à frente da câmera
            this.shipMesh.position.copy(this.camera.position).add(cameraDirection.multiplyScalar(10));
            
            // Posicionar bolha na posição da câmera
            this.bubbleMesh.position.copy(this.camera.position);

            // Ajustar escala da bolha baseado na velocidade
            const bubbleScale = 1 + (gamma - 1) * 0.5;
            this.bubbleMesh.scale.set(bubbleScale, bubbleScale, bubbleScale);

            // Rotação da nave
            if (this.velocity.length() > 0.001) {
                const velocityDirection = this.velocity.clone().normalize();
                this.shipMesh.quaternion.setFromRotationMatrix(
                    new THREE.Matrix4().lookAt(
                        new THREE.Vector3(),
                        velocityDirection,
                        new THREE.Vector3(0, 1, 0)
                    )
                );
            } else {
                this.shipMesh.quaternion.copy(this.camera.quaternion);
            }
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
        this.maxSpeed = Core.c * 0.999;
        this.arrivalDistance = 100;
        this.stoppingDistance = 200;
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
const Player = new PlayerController();
window.Player = Player;
window.Player.Autopilot = Autopilot;
