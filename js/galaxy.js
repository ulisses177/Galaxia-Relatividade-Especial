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

class FixedStar {
    constructor(name, x, y, z, spectralType, description) {
        this.name = name;
        this.position = new THREE.Vector3(x, y, z);
        this.spectralType = spectralType;
        this.description = description;
    }
}

// Define fixed stars data
const FIXED_STARS = [
    new FixedStar(
        "Sagittarius A*", 
        0, 0, 0, 
        'O', 
        "Buraco negro supermassivo no centro da Via Láctea"
    ),
    new FixedStar(
        "Sol", 
        -400, 0, 1300,
        'G', 
        "Nossa estrela"
    ),
    new FixedStar(
        "Proxima Centauri",
        -411, 0, 1310,
        'M',
        "Estrela mais próxima do Sol, parte do sistema Alpha Centauri"
    ),
    new FixedStar(
        "Betelgeuse",
        -800, 10, 1600,
        'M',
        "Supergigante vermelha na constelação de Órion"
    ),
    new FixedStar(
        "Sirius",
        -420, 5, 1400,
        'A',
        "Estrela mais brilhante no céu noturno terrestre"
    ),
    new FixedStar(
        "Vega",
        -300, 8, 1100,
        'A',
        "Uma das estrelas mais brilhantes vistas da Terra"
    ),
    new FixedStar(
        "Antares",
        -200, -5, 900,
        'M',
        "Supergigante vermelha no coração da constelação de Escorpião"
    )
];

class GalaxyGenerator {
    constructor(options = {}, randomGen) {
        this.randomGen = randomGen || new RandomGenerator(42);
        this.galaxyRadius = options.galaxyRadius || 200000;
        this.diskHeight = 1000;
    }

    generateStars(totalStars = 2500000) {
        const stars = [];
        
        for (let i = 0; i < totalStars; i++) {
            const r = Math.sqrt(this.randomGen.random()) * this.galaxyRadius;
            const theta = this.randomGen.random() * 2 * Math.PI;
            
            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);
            
            const y = (this.randomGen.random() - 0.5) * this.diskHeight;
            
            const spectralType = this.generateSpectralType();
            stars.push({
                x, y, z,
                spectralType,
                color: this.getStarColor(spectralType),
                size: this.randomGen.random() * 0.5 + 0.5
            });
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
