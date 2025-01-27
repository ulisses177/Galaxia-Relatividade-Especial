    class UI {
        constructor() {
            this.hudElements = new Map();
            this.lastUpdate = 0;
            this.updateInterval = 1000 / 30; // 30 fps for UI updates
            this.lastNearbyStarMessage = null;
            this.setupDialog();
            this.setupHUD();
            this.setupUIVisibility();
        }

        setupDialog() {
            this.messages = [
                {
                    text: "Bem-vindo à Simulação da Galáxia Relativística!",
                    portrait: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Ccircle cx='25' cy='25' r='20' fill='%234CAF50'/%3E%3C/svg%3E"
                },
                {
                    text: "Toque e arraste para olhar ao redor. Toque nas estrelas para navegar pela galáxia.",
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

        setupHUD() {
            FIXED_STARS.forEach(star => {
                const hudElement = document.createElement('div');
                hudElement.className = 'fixed-star-hud';
                hudElement.innerHTML = `
                    <span class="name">${star.name}</span>
                    <span class="distance"></span>
                `;
                
                hudElement.addEventListener('click', () => {
                    Player.currentAutopilot = new Player.Autopilot(
                        star.position.clone(),
                        Player.position.clone(),
                        Player.velocity.clone()
                    );
                    Player.selectedStar = star;
                    this.showMessage({
                        text: `Navegando para ${star.name}. ${star.description}`,
                        portrait: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Ccircle cx='25' cy='25' r='20' fill='%234CAF50'/%3E%3C/svg%3E"
                    });
                });
                
                document.body.appendChild(hudElement);
                this.hudElements.set(star, hudElement);
            });
        }

        updateHUD(camera) {
            const halfWidth = window.innerWidth / 2;
            const halfHeight = window.innerHeight / 2;
            
            if (!this._frustum) {
                this._frustum = new THREE.Frustum();
                this._projScreenMatrix = new THREE.Matrix4();
                this._screenPosition = new THREE.Vector3();
            }

            this._projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

            this.hudElements.forEach((hudElement, star) => {
                this._screenPosition.copy(star.position).project(camera);
                
                const x = (this._screenPosition.x + 1) * halfWidth;
                const y = (-this._screenPosition.y + 1) * halfHeight;
                
                if (this._screenPosition.z < 1) {
                    const distance = star.position.distanceTo(Player.position) / GALAXY_SCALE_FACTOR;
                    hudElement.querySelector('.distance').textContent = `${distance.toFixed(2)} anos-luz`;
                    
                    if (x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight) {
                        hudElement.style.display = 'block';
                        hudElement.style.left = `${x}px`;
                        hudElement.style.top = `${y}px`;
                        hudElement.style.transform = 'translate(-50%, -50%)';
                    } else {
                        hudElement.style.display = 'none';
                    }
                } else {
                    hudElement.style.display = 'none';
                }
            });
        }

        update(camera) {
            const now = performance.now();
            if (now - this.lastUpdate < this.updateInterval) {
                return;
            }
            this.lastUpdate = now;

            const velocity = Player.velocity.length();
            const gamma = 1 / Math.sqrt(1 - (velocity * velocity) / (Core.c * Core.c));
            
            const newInfo = `Velocidade: ${(velocity/Core.c*100).toFixed(1)}% c\nFator γ: ${gamma.toFixed(3)}`;
            if (this._lastInfo !== newInfo) {
                document.getElementById('info').textContent = newInfo;
                this._lastInfo = newInfo;
            }
            
            this.updateHUD(camera);
        }

        setupUIVisibility() {
            let ticking = false;
            const deadzoneSize = 0.2;
            const halfWidth = window.innerWidth / 2;
            const halfHeight = window.innerHeight / 2;
            const deadzoneWidth = window.innerWidth * deadzoneSize;
            const deadzoneHeight = window.innerHeight * deadzoneSize;

            document.addEventListener('mousemove', (e) => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        const isOutsideDeadzone = 
                            Math.abs(e.clientX - halfWidth) > deadzoneWidth / 2 &&
                            Math.abs(e.clientY - halfHeight) > deadzoneHeight / 2;
                        
                        // Não esconde a UI se o mouse estiver sobre elementos interativos
                        const isOverInteractive = e.target.closest('.fixed-star-hud, #dialogBox');
                        if (!isOverInteractive) {
                            document.body.classList.toggle('ui-hidden', isOutsideDeadzone);
                        }
                        
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        }
    }

    // Create and export UI instance
    window.UI = new UI();
