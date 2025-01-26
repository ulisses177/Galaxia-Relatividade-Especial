// Constantes físicas
const c = 1.0; // Velocidade da luz normalizada
const BASE_TIME_SCALE = 360; // 1 segundo real = 10 horas simuladas
const GALAXY_SCALE_FACTOR = 10; // Nossa galáxia está 100x menor

// Funções de física relativística
function calculateTimeDilation(velocity) {
    const speed = velocity.length();
    const beta = speed / c;
    return 1 / Math.sqrt(1 - beta * beta);
}

function lorentzTransform(basePos, vel, pos) {
    const v = vel.length();
    const gamma = v > 0 ? 1 / Math.sqrt(1 - (v * v) / (c * c)) : 1;
    
    const relativePos = new THREE.Vector3().subVectors(basePos, pos);
    const direction = vel.clone().normalize();
    
    const parallel = direction.clone().multiplyScalar(relativePos.dot(direction));
    const perpendicular = relativePos.clone().sub(parallel);
    const contracted = parallel.multiplyScalar(gamma).add(perpendicular.divideScalar(gamma));
    
    // Simplificar o cálculo da velocidade relativa
    const relativeVel = vel.length() * Math.cos(direction.angleTo(relativePos));
    
    return { 
        position: contracted, 
        relativeVel: relativeVel 
    };
}

function dopplerShift(relativeVelocity) {
    const beta = relativeVelocity / c;
    
    // Simplificar para usar apenas o fator beta diretamente
    let r = 1, g = 1, b = 1;
    
    if (beta > 0) { // Afastando
        r = 1;
        g = Math.max(0.2, 1 - beta);
        b = Math.max(0.2, 1 - beta * 2);
    } else { // Aproximando
        r = Math.max(0.2, 1 + beta);
        g = Math.max(0.2, 1 + beta * 0.5);
        b = 1;
    }
    
    return {
        color: new THREE.Color(r, g, b),
        intensity: 1.0
    };
}

// Funções de formatação de tempo
function formatTime(ms) {
    const hours = ms / 1000; // Convert to hours (based on TIME_SCALE)
    const days = hours / 24;
    const years = days / 365.25;
    const millennia = years / 1000;

    if (millennia >= 1) {
        return `${Math.floor(millennia)}mil ${Math.floor(years % 1000)}y ${Math.floor(days % 365.25)}d ${Math.floor(hours % 24)}:${Math.floor((hours * 60) % 60)}:${Math.floor((hours * 3600) % 60)}`;
    } else if (years >= 1) {
        return `${Math.floor(years)}y ${Math.floor(days % 365.25)}d ${Math.floor(hours % 24)}:${Math.floor((hours * 60) % 60)}:${Math.floor((hours * 3600) % 60)}`;
    } else if (days >= 1) {
        return `${Math.floor(days)}d ${padZero(Math.floor(hours % 24))}:${padZero(Math.floor((hours * 60) % 60))}:${padZero(Math.floor((hours * 3600) % 60))}`;
    }
    return `${padZero(Math.floor(hours))}:${padZero(Math.floor((hours * 60) % 60))}:${padZero(Math.floor((hours * 3600) % 60))}`;
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

// Exporta as funções e constantes
window.Core = {
    c,
    BASE_TIME_SCALE,
    GALAXY_SCALE_FACTOR,
    calculateTimeDilation,
    lorentzTransform,
    dopplerShift,
    formatTime,
    scene: null,  // Será definido em main.js
    renderer: null // Será definido em main.js
};
