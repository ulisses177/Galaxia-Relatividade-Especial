class UI {
    constructor() {
        this.minimapSize = 250;
        this.expandedMinimapSize = Math.min(window.innerWidth, window.innerHeight) * 0.8;
        this.isMinimapExpanded = false;
        this.setupMinimap();
        this.setupDialog();
        this.setupHUD();
        this.setupMinimapInteraction();
    }

    setupMinimap() {
        // Minimap container
        this.minimapContainer = document.getElementById('minimapContainer');
        
        // Minimap renderer
        this.minimapRenderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.minimapRenderer.setSize(this.minimapSize, this.minimapSize);
        this.minimapContainer.appendChild(this.minimapRenderer.domElement);

        // Minimap scene
        this.minimapScene = new THREE.Scene();
        
        // Minimap camera (orthographic for 2D view)
        this.minimapCamera = new THREE.OrthographicCamera(
            -this.minimapSize, this.minimapSize,
            this.minimapSize, -this.minimapSize,
            1, 1000
        );
        this.minimapCamera.position.set(0, 100, 0);
        this.minimapCamera.lookAt(0, 0, 0);

        // Ship indicator
        const shipGeometry = new THREE.ConeGeometry(10, 20, 3);
        const shipMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.shipIndicator = new THREE.Mesh(shipGeometry, shipMaterial);
        this.minimapScene.add(this.shipIndicator);

        // Add grid for reference
        const gridHelper = new THREE.GridHelper(5000, 50);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.minimapScene.add(gridHelper);
    }

    setupMinimapInteraction() {
        this.minimapContainer.addEventListener('click', (e) => {
            if (this.isMinimapExpanded) {
                this.handleMinimapClick(e);
            }
        });

        // Expand/collapse on hover for desktop
        this.minimapContainer.addEventListener('mouseenter', () => this.expandMinimap());
        this.minimapContainer.addEventListener('mouseleave', () => this.collapseMinimap());

        // Expand/collapse on touch for mobile
        this.minimapContainer.addEventListener('touchstart', (e) => {
            if (!this.isMinimapExpanded) {
                e.preventDefault();
                this.expandMinimap();
            }
        });

        // Add close button for mobile
        this.closeButton = document.createElement('button');
        this.closeButton.textContent = '×';
        this.closeButton.className = 'minimap-close';
        this.closeButton.style.display = 'none';
        this.minimapContainer.appendChild(this.closeButton);

        this.closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.collapseMinimap();
        });
    }

    expandMinimap() {
        if (this.isMinimapExpanded) return;
        
        this.isMinimapExpanded = true;
        this.minimapContainer.classList.add('expanded');
        this.closeButton.style.display = 'block';
        
        this.minimapRenderer.setSize(this.expandedMinimapSize, this.expandedMinimapSize);
        this.updateMinimapCamera();
        
        // Adiciona overlay com instruções
        if (!this.minimapOverlay) {
            this.minimapOverlay = document.createElement('div');
            this.minimapOverlay.className = 'minimap-overlay';
            this.minimapOverlay.textContent = 'Toque em qualquer ponto para definir destino';
            this.minimapContainer.appendChild(this.minimapOverlay);
        }
        this.minimapOverlay.style.display = 'block';
    }

    collapseMinimap() {
        if (!this.isMinimapExpanded) return;
        
        this.isMinimapExpanded = false;
        this.minimapContainer.classList.remove('expanded');
        this.closeButton.style.display = 'none';
        
        this.minimapRenderer.setSize(this.minimapSize, this.minimapSize);
        this.updateMinimapCamera();
        
        if (this.minimapOverlay) {
            this.minimapOverlay.style.display = 'none';
        }
    }

    handleMinimapClick(event) {
        const rect = this.minimapRenderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const z = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        
        // Convert click coordinates to world position
        const worldX = x * this.minimapCamera.right;
        const worldZ = z * this.minimapCamera.top;
        
        // Create target position
        const targetPosition = new THREE.Vector3(worldX, 0, worldZ);
        
        // Create new autopilot
        Player.currentAutopilot = new Player.Autopilot(
            targetPosition,
            Player.position.clone(),
            Player.velocity.clone()
        );
        
        // Visual feedback
        this.createDestinationMarker(targetPosition);
    }

    createDestinationMarker(position) {
        if (this.destinationMarker) {
            this.minimapScene.remove(this.destinationMarker);
        }

        const markerGeometry = new THREE.RingGeometry(15, 20, 32);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            side: THREE.DoubleSide
        });
        this.destinationMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.destinationMarker.position.copy(position);
        this.destinationMarker.rotation.x = Math.PI / 2;
        this.minimapScene.add(this.destinationMarker);
    }

    updateMinimapCamera() {
        const size = this.isMinimapExpanded ? this.expandedMinimapSize : this.minimapSize;
        const zoom = this.isMinimapExpanded ? 1.5 : 1;
        
        this.minimapCamera.left = -size * zoom;
        this.minimapCamera.right = size * zoom;
        this.minimapCamera.top = size * zoom;
        this.minimapCamera.bottom = -size * zoom;
        this.minimapCamera.updateProjectionMatrix();
    }

    setupHUD() {
        // Info display
        this.infoDisplay = document.getElementById('info');
        
        // Fixed stars HUD elements
        this.starHUDs = new Map();
        FIXED_STARS.forEach(star => {
            const hudElement = document.createElement('div');
            hudElement.className = 'fixed-star-hud';
            hudElement.innerHTML = `
                <span class="name">${star.name}</span>
                <span class="distance">Calculando...</span>
            `;
            
            // Adiciona evento de toque/clique para ativar autopilot
            hudElement.addEventListener('click', () => {
                Player.currentAutopilot = new Player.Autopilot(
                    star.position.clone(),
                    Player.position.clone(),
                    Player.velocity.clone()
                );
                Player.selectedStar = star;
            });
            
            document.body.appendChild(hudElement);
            this.starHUDs.set(star, hudElement);
        });
    }

    setupDialog() {
        this.messages = [
            {
                text: "Bem-vindo à Simulação da Galáxia Relativística!",
                portrait: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Ccircle cx='25' cy='25' r='20' fill='%234CAF50'/%3E%3C/svg%3E"
            },
            {
                text: "Toque e arraste para olhar ao redor. Toque no minimapa para navegar pela galáxia.",
                portrait: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Ccircle cx='25' cy='25' r='20' fill='%234CAF50'/%3E%3C/svg%3E"
            },
            {
                text: "Observe os efeitos relativísticos conforme sua velocidade aumenta!",
                portrait: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Ccircle cx='25' cy='25' r='20' fill='%234CAF50'/%3E%3C/svg%3E"
            }
        ];
        
        this.currentMessageIndex = 0;
        this.dialogBox = document.getElementById('dialogBox');
        this.dialogText = document.getElementById('dialogText');
        this.dialogPortrait = document.getElementById('dialogPortrait');
        
        this.dialogBox.addEventListener('click', () => this.advanceDialog());
        this.showMessage(this.messages[0]);
        this.currentMessageIndex = 1;
    }

    showMessage(message) {
        this.dialogText.textContent = message.text;
        this.dialogPortrait.src = message.portrait;
        this.dialogBox.classList.remove('hidden');
        this.dialogBox.classList.add('visible');
    }

    advanceDialog() {
        if (this.currentMessageIndex < this.messages.length) {
            this.showMessage(this.messages[this.currentMessageIndex]);
            this.currentMessageIndex++;
        } else {
            this.dialogBox.classList.remove('visible');
            this.dialogBox.classList.add('hidden');
        }
    }

    updateHUD(camera) {
        // Update fixed stars HUD
        this.starHUDs.forEach((hudElement, star) => {
            const screenPosition = star.position.clone().project(camera);
            
            // Calculate proper distance with relativistic effects
            const distance = star.position.clone().sub(Player.position).length();
            const gamma = Core.calculateTimeDilation(Player.velocity);
            const properDistance = distance / gamma;
            
            if (screenPosition.z < 1) {
                // Star is in front of camera
                const margin = 100;
                let x = (screenPosition.x + 1) * window.innerWidth / 2;
                let y = (-screenPosition.y + 1) * window.innerHeight / 2;
                
                x = Math.max(margin, Math.min(window.innerWidth - margin, x));
                y = Math.max(margin, Math.min(window.innerHeight - margin, y));
                
                hudElement.style.display = 'block';
                hudElement.style.left = `${x}px`;
                hudElement.style.top = `${y}px`;
                hudElement.style.transform = 'translate(-50%, -50%)';
                
                hudElement.querySelector('.distance').textContent = 
                    `${(properDistance / 1000).toFixed(1)} kly`;
                
                // Update visual state for autopilot
                if (Player.currentAutopilot?.active && 
                    Player.selectedStar === star) {
                    hudElement.style.borderColor = '#FFC107';
                    hudElement.style.boxShadow = '0 0 15px #FFC107';
                } else {
                    hudElement.style.borderColor = '#4CAF50';
                    hudElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                }
            } else {
                // Star is behind camera, show at screen edge with arrow
                const angle = Math.atan2(screenPosition.y, screenPosition.x);
                const margin = 100;
                const x = window.innerWidth/2 + Math.cos(angle) * (window.innerWidth/2 - margin);
                const y = window.innerHeight/2 - Math.sin(angle) * (window.innerHeight/2 - margin);
                
                hudElement.style.display = 'block';
                hudElement.style.left = `${x}px`;
                hudElement.style.top = `${y}px`;
                hudElement.style.transform = `translate(-50%, -50%) rotate(${angle * 180/Math.PI}deg)`;
            }
        });

        // Update info display
        const speed = Player.velocity.length();
        const gamma = Core.calculateTimeDilation(Player.velocity);
        
        this.infoDisplay.textContent = `Velocidade: ${(speed/Core.c).toFixed(3)}c
Tempo da Nave: ${Core.formatTime(properTime)}
Tempo da Galáxia: ${Core.formatTime(coordinateTime)}
Fator γ: ${gamma.toFixed(3)}`;
    }

    update(camera) {
        // Update ship position in minimap
        this.shipIndicator.position.set(Player.position.x, 0, Player.position.z);
        
        // Update ship rotation in minimap
        if (Player.velocity.length() > 0.001) {
            const angle = Math.atan2(Player.velocity.x, Player.velocity.z);
            this.shipIndicator.rotation.y = angle;
        }

        // Render minimap
        this.minimapRenderer.render(this.minimapScene, this.minimapCamera);
        
        // Update HUD elements
        this.updateHUD(camera);
    }
}

// Create and export UI instance
window.UI = new UI();
