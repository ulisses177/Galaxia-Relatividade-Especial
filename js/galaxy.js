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
    )
];

class GalaxyGenerator {
    constructor(options = {}, randomGen) {
        this.randomGen = randomGen || new RandomGenerator();
        this.centerDensity = options.centerDensity || 30;
        this.peripheryDensity = options.peripheryDensity || 4;
        this.galaxyRadius = options.galaxyRadius || 2500;
        this.armSpread = options.armSpread || 0.5;
        this.armCount = options.armCount || 4;
        this.armTwist = options.armTwist || 2 * Math.PI;
    }

    calculateDensity(x, y, z) {
        const distanceFromCenter = Math.sqrt(x*x + y*y + z*z);
        const normalizedDistance = distanceFromCenter / this.galaxyRadius;
        
        const theta = Math.atan2(z, x);
        const r = Math.sqrt(x*x + z*z);
        let inArm = false;
        
        for (let i = 0; i < this.armCount; i++) {
            const armAngle = (i * 2 * Math.PI) / this.armCount;
            const spiralAngle = armAngle + (r / this.galaxyRadius) * this.armTwist;
            const angleDiff = Math.abs(((theta - spiralAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
            
            if (angleDiff < this.armSpread) {
                inArm = true;
                break;
            }
        }
        
        let density = this.centerDensity * Math.exp(-normalizedDistance * 2);
        if (inArm) {
            density *= 1.5;
        }
        
        return Math.max(density, this.peripheryDensity);
    }

    generateStars(totalStars = 2000) {
        const stars = [];
        const maxTries = totalStars * 2;
        let tries = 0;

        const getRadialPosition = () => {
            const r = -Math.log(1 - this.randomGen.random() * 0.95) * (this.galaxyRadius * 0.3);
            return Math.min(r, this.galaxyRadius);
        };

        while (stars.length < totalStars && tries < maxTries) {
            tries++;
            
            const r = getRadialPosition();
            const theta = this.randomGen.random() * 2 * Math.PI;
            const phi = Math.acos(1 - 2 * this.randomGen.random());

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            const density = this.calculateDensity(x, y, z);
            let probability = Math.min(1.0, density / this.centerDensity);
            
            const theta2D = Math.atan2(z, x);
            const r2D = Math.sqrt(x*x + z*z);
            let inArm = false;
            
            for (let i = 0; i < this.armCount; i++) {
                const armAngle = (i * 2 * Math.PI) / this.armCount;
                const spiralAngle = armAngle + (r2D / this.galaxyRadius) * this.armTwist;
                const angleDiff = Math.abs(((theta2D - spiralAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
                
                if (angleDiff < this.armSpread) {
                    inArm = true;
                    break;
                }
            }

            if (inArm) {
                probability *= 1.5;
            }

            if (this.randomGen.random() < probability) {
                const spectralType = this.generateSpectralType();
                stars.push({
                    x, y, z,
                    spectralType,
                    color: this.getStarColor(spectralType)
                });
            }
        }

        console.log(`Generated ${stars.length} stars in ${tries} tries`);
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
