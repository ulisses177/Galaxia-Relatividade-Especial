    class UI {
        constructor() {
            this.setupDialog();
            this.setupHUD();
            this.setupUIVisibility();
            this.lastNearbyStarMessage = null;
            this.starProximityThreshold = 50; // 10x maior para corresponder à nova escala
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
                    text: "Toque e arraste para olhar ao redor. Toque nas estrelas para navegar pela galáxia.",
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
                    // Star is behind camera, hide it
                    hudElement.style.display = 'none';
                }
            });

            // Verificar proximidade com estrelas
            let nearestStar = null;
            let minDistance = Infinity;

            this.starHUDs.forEach((hudElement, star) => {
                const distance = Player.position.distanceTo(star.position);
                if (distance < this.starProximityThreshold && distance < minDistance) {
                    nearestStar = star;
                    minDistance = distance;
                }
            });

            // Mostrar mensagem da estrela mais próxima
            if (nearestStar && this.lastNearbyStarMessage !== nearestStar) {
                this.lastNearbyStarMessage = nearestStar;
                const starMessage = {
                    text: `${nearestStar.name}\n${nearestStar.description}`,
                    portrait: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Ccircle cx='25' cy='25' r='20' fill='%23" + 
                        (nearestStar.name === "Sol" ? "FFD700" : 
                         nearestStar.name === "Sagittarius A*" ? "000000" : "4CAF50") + 
                        "'/%3E%3C/svg%3E"
                };
                this.showMessage(starMessage);
            } else if (!nearestStar) {
                this.lastNearbyStarMessage = null;
                if (this.dialogBox.classList.contains('visible')) {
                    this.dialogBox.classList.remove('visible');
                    this.dialogBox.classList.add('hidden');
                }
            }

            // Update info display
            const speed = Player.velocity.length();
            const gamma = Core.calculateTimeDilation(Player.velocity);
            
            this.infoDisplay.textContent = `Velocidade: ${(speed/Core.c).toFixed(3)}c
    Fator γ: ${gamma.toFixed(3)}`;
        }

        update(camera) {
            this.updateHUD(camera);
        }

        setupUIVisibility() {
            // Aumentar a deadzone para 40% do tamanho da tela
            const deadzoneSize = 0.4;
            let isUIVisible = true;
            
            // Função auxiliar para verificar se está fora da deadzone
            const checkDeadzone = (x, y) => {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const deadzoneWidth = window.innerWidth * deadzoneSize;
                const deadzoneHeight = window.innerHeight * deadzoneSize;

                return Math.abs(x - centerX) > deadzoneWidth / 2 ||
                       Math.abs(y - centerY) > deadzoneHeight / 2;
            };

            // Toggle UI visibility with single click
            document.addEventListener('click', (e) => {
                // Ignore clicks on dialog box or star HUDs
                if (e.target.closest('#dialogBox') || e.target.closest('.fixed-star-hud')) {
                    return;
                }
                
                isUIVisible = !isUIVisible;
                document.body.classList.toggle('ui-hidden', !isUIVisible);
            });

            // Double click to disable autopilot
            let lastClickTime = 0;
            document.addEventListener('click', (e) => {
                const currentTime = Date.now();
                if (currentTime - lastClickTime < 300) { // 300ms for double click
                    if (Player.currentAutopilot) {
                        Player.currentAutopilot = null;
                        Player.selectedStar = null;
                        Player.velocity.set(0, 0, 0);
                    }
                    e.preventDefault();
                }
                lastClickTime = currentTime;
            });

            // Mouse movement deadzone
            document.addEventListener('mousemove', (e) => {
                if (!isUIVisible) return; // Don't check deadzone if UI is hidden
                const isOutsideDeadzone = checkDeadzone(e.clientX, e.clientY);
                document.body.classList.toggle('ui-hidden', isOutsideDeadzone);
            });

            // Touch events
            document.addEventListener('touchmove', (e) => {
                if (!isUIVisible) return; // Don't check deadzone if UI is hidden
                const touch = e.touches[0];
                const isOutsideDeadzone = checkDeadzone(touch.clientX, touch.clientY);
                document.body.classList.toggle('ui-hidden', isOutsideDeadzone);
            });

            // Reset UI visibility on touch end if it was hidden by deadzone
            document.addEventListener('touchend', () => {
                if (!isUIVisible) return; // Don't reset if UI was hidden by click
                document.body.classList.remove('ui-hidden');
            });
        }
    }

    // Create and export UI instance
    window.UI = new UI();
