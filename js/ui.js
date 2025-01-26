class UI {
    constructor() {
        this.setupDialog();
        this.setupHUD();
        this.setupUIVisibility();
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

        // Update info display
        const speed = Player.velocity.length();
        const gamma = Core.calculateTimeDilation(Player.velocity);
        
        this.infoDisplay.textContent = `Velocidade: ${(speed/Core.c).toFixed(3)}c
Tempo da Nave: ${Core.formatTime(properTime)}
Tempo da Galáxia: ${Core.formatTime(coordinateTime)}
Fator γ: ${gamma.toFixed(3)}`;
    }

    update(camera) {
        this.updateHUD(camera);
    }

    setupUIVisibility() {
        // Define a deadzone de 20% do tamanho da tela no centro
        const deadzoneSize = 0.2;
        
        document.addEventListener('mousemove', (e) => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const deadzoneWidth = window.innerWidth * deadzoneSize;
            const deadzoneHeight = window.innerHeight * deadzoneSize;

            // Verifica se o mouse está fora da deadzone
            const isOutsideDeadzone = 
                Math.abs(e.clientX - centerX) > deadzoneWidth / 2 ||
                Math.abs(e.clientY - centerY) > deadzoneHeight / 2;

            // Adiciona ou remove a classe para controlar a visibilidade
            document.body.classList.toggle('ui-hidden', isOutsideDeadzone);
        });
    }
}

// Create and export UI instance
window.UI = new UI();
