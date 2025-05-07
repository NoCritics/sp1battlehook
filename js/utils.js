// Performance utilities

// Measure and track FPS
const fpsCounter = {
    frames: 0,
    lastTime: performance.now(),
    fps: 0,
    
    update() {
        this.frames++;
        const now = performance.now();
        const elapsed = now - this.lastTime;
        
        if (elapsed >= 1000) {
            this.fps = Math.round((this.frames * 1000) / elapsed);
            this.frames = 0;
            this.lastTime = now;
        }
        
        return this.fps;
    },
    
    draw(ctx, x, y) {
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${this.fps}`, x, y);
    }
};

// Function to pause execution for debugging
function pause(duration = 100) {
    const start = performance.now();
    while (performance.now() - start < duration) {
        // Busy-wait
    }
}// Color utilities

// Create a brighter version of a color
function brightenColor(color, factor = 1.5) {
    // Handle hex colors
    if (color.startsWith('#')) {
        // Convert to RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // Brighten and clamp
        const newR = Math.min(255, Math.floor(r * factor));
        const newG = Math.min(255, Math.floor(g * factor));
        const newB = Math.min(255, Math.floor(b * factor));
        
        // Convert back to hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    
    // Handle rgba colors
    if (color.startsWith('rgba')) {
        const parts = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (parts) {
            const r = parseInt(parts[1]);
            const g = parseInt(parts[2]);
            const b = parseInt(parts[3]);
            const a = parseFloat(parts[4]);
            
            // Brighten and clamp
            const newR = Math.min(255, Math.floor(r * factor));
            const newG = Math.min(255, Math.floor(g * factor));
            const newB = Math.min(255, Math.floor(b * factor));
            
            return `rgba(${newR}, ${newG}, ${newB}, ${a})`;
        }
    }
    
    // If color format not recognized, return original
    return color;
}

// Create a darker version of a color
function darkenColor(color, factor = 0.7) {
    return brightenColor(color, factor);
}

// Calculate a color between two colors based on ratio (0-1)
function lerpColor(color1, color2, ratio) {
    // Only supports hex for now
    if (!color1.startsWith('#') || !color2.startsWith('#')) {
        return color1;
    }
    
    // Convert to RGB
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    // Interpolate
    const r = Math.floor(r1 + (r2 - r1) * ratio);
    const g = Math.floor(g1 + (g2 - g1) * ratio);
    const b = Math.floor(b1 + (b2 - b1) * ratio);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}// Cached Sin and Cos to reduce Math calls
function cachedSin(angle) {
    // Round angle for caching
    const key = Math.round(angle * 100) / 100;
    
    if (calculationCache.sin.has(key)) {
        return calculationCache.sin.get(key);
    }
    
    const result = Math.sin(angle);
    calculationCache.sin.set(key, result);
    return result;
}

function cachedCos(angle) {
    // Round angle for caching
    const key = Math.round(angle * 100) / 100;
    
    if (calculationCache.cos.has(key)) {
        return calculationCache.cos.get(key);
    }
    
    const result = Math.cos(angle);
    calculationCache.cos.set(key, result);
    return result;
}// Define a simple cache for expensive calculations
const calculationCache = {
    distances: new Map(),
    angles: new Map(),
    sin: new Map(),
    cos: new Map()
};

// Periodically clear cache to prevent memory leaks
setInterval(() => {
    calculationCache.distances.clear();
    calculationCache.angles.clear();
    calculationCache.sin.clear();
    calculationCache.cos.clear();
}, 30000); // Clear every 30 seconds

// Converts degrees to radians
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

// Calculates distance between two points with caching
function distance(x1, y1, x2, y2) {
    // Round coordinates for cache key
    const rx1 = Math.round(x1);
    const ry1 = Math.round(y1);
    const rx2 = Math.round(x2);
    const ry2 = Math.round(y2);
    
    // Create cache key
    const key = `${rx1},${ry1},${rx2},${ry2}`;
    
    // Check if distance is cached
    if (calculationCache.distances.has(key)) {
        return calculationCache.distances.get(key);
    }
    
    // Calculate distance
    const result = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    
    // Cache the result
    calculationCache.distances.set(key, result);
    
    return result;
}

// Calculates angle between two points (in radians) with caching
function angleBetweenPoints(x1, y1, x2, y2) {
    // Round coordinates for cache key
    const rx1 = Math.round(x1);
    const ry1 = Math.round(y1);
    const rx2 = Math.round(x2);
    const ry2 = Math.round(y2);
    
    // Create cache key
    const key = `${rx1},${ry1},${rx2},${ry2}`;
    
    // Check if angle is cached
    if (calculationCache.angles.has(key)) {
        return calculationCache.angles.get(key);
    }
    
    // Calculate angle
    const result = Math.atan2(y2 - y1, x2 - x1);
    
    // Cache the result
    calculationCache.angles.set(key, result);
    
    return result;
}

// Linear interpolation function for smooth animations with delta time support
function lerp(start, end, amt, deltaTime = 1) {
    // Adjust amount based on delta time
    const adjustedAmt = Math.min(1, amt * deltaTime);
    return (1 - adjustedAmt) * start + adjustedAmt * end;
}

// Clamps a value between min and max
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Random number between min and max
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Random integer between min (inclusive) and max (inclusive)
function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Creates a neon glow effect on the canvas context with improved quality
function createNeonEffect(ctx, color, blurAmount = 20) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blurAmount;
    
    // For better quality on some browsers, add additional settings
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalCompositeOperation = 'lighter';
}

// Clears the neon effect
function clearNeonEffect(ctx) {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalCompositeOperation = 'source-over';
}

// Draw a hexagon with specified center (x,y) and radius with optimized rendering
function drawHexagon(ctx, x, y, radius, rotation = 0) {
    const sides = 6;
    ctx.beginPath();
    
    // Use cached sin/cos for better performance
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + rotation;
        const pX = x + cachedCos(angle) * radius;
        const pY = y + cachedSin(angle) * radius;
        if (i === 0) {
            ctx.moveTo(pX, pY);
        } else {
            ctx.lineTo(pX, pY);
        }
    }
    ctx.closePath();
}

// Draw a smiley face with more details and polish
function drawSmileyFace(ctx, x, y, radius) {
    // Face
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    const faceGradient = ctx.createRadialGradient(
        x - radius * 0.1, y - radius * 0.1, radius * 0.1, // Inner circle
        x, y, radius * 0.5 // Outer circle
    );
    faceGradient.addColorStop(0, '#ffffff');
    faceGradient.addColorStop(1, '#dddddd');
    ctx.fillStyle = faceGradient;
    ctx.fill();
    
    // Eye shadows
    const eyeOffsetX = radius * 0.2;
    const eyeOffsetY = radius * 0.1;
    ctx.beginPath();
    ctx.arc(x - eyeOffsetX, y - eyeOffsetY, radius * 0.15, 0, Math.PI * 2);
    ctx.arc(x + eyeOffsetX, y - eyeOffsetY, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fill();
    
    // Eyes
    const eyeRadius = radius * 0.1;
    const pupilOffset = radius * 0.03;
    
    // Blinking animation based on time
    let eyeSquish = 1;
    if (Math.floor(performance.now() / 3000) % 5 === 0) {
        const blinkPhase = (performance.now() % 3000) / 3000;
        if (blinkPhase > 0.95) {
            eyeSquish = Math.max(0.1, 1 - (blinkPhase - 0.95) * 20);
        }
    }
    
    // Left eye
    ctx.beginPath();
    ctx.ellipse(
        x - eyeOffsetX, 
        y - eyeOffsetY, 
        eyeRadius, 
        eyeRadius * eyeSquish, 
        0, 0, Math.PI * 2
    );
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Right eye
    ctx.beginPath();
    ctx.ellipse(
        x + eyeOffsetX, 
        y - eyeOffsetY, 
        eyeRadius, 
        eyeRadius * eyeSquish, 
        0, 0, Math.PI * 2
    );
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Eye highlights
    if (eyeSquish > 0.5) {
        ctx.beginPath();
        ctx.arc(x - eyeOffsetX + pupilOffset, y - eyeOffsetY - pupilOffset, eyeRadius * 0.3, 0, Math.PI * 2);
        ctx.arc(x + eyeOffsetX + pupilOffset, y - eyeOffsetY - pupilOffset, eyeRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
    
    // Smile
    ctx.beginPath();
    ctx.arc(x, y + radius * 0.1, radius * 0.3, 0, Math.PI);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = radius * 0.05;
    ctx.stroke();
    
    // Rosy cheeks
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y + radius * 0.1, radius * 0.15, 0, Math.PI * 2);
    ctx.arc(x + radius * 0.3, y + radius * 0.1, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
    ctx.fill();
}

// Generate a random position at one of the map corners with better distribution
function getRandomCornerPosition(mapWidth, mapHeight, padding) {
    const corner = randomInt(0, 3);
    let x, y;
    
    // Calculate mininum and maximum distances from the corner
    const minDist = padding;
    const maxDist = padding * 3;
    
    // Use a distribution that favors spawning closer to the corner
    const dist = minDist + Math.pow(Math.random(), 2) * (maxDist - minDist);
    const angle = Math.random() * Math.PI / 2; // 0 to 90 degrees for each corner
    
    switch(corner) {
        case 0: // Top-left
            x = padding + Math.cos(angle) * dist;
            y = padding + Math.sin(angle) * dist;
            break;
        case 1: // Top-right
            x = mapWidth - padding - Math.cos(angle) * dist;
            y = padding + Math.sin(angle) * dist;
            break;
        case 2: // Bottom-left
            x = padding + Math.cos(angle) * dist;
            y = mapHeight - padding - Math.sin(angle) * dist;
            break;
        case 3: // Bottom-right
            x = mapWidth - padding - Math.cos(angle) * dist;
            y = mapHeight - padding - Math.sin(angle) * dist;
            break;
    }
    
    return { x, y };
}

// Generate particle effects with delta time support
function createParticles(x, y, color, count, speed, ctx, particles, lifetime = 40) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = {
            x: cachedCos(angle) * randomRange(1, speed),
            y: cachedSin(angle) * randomRange(1, speed)
        };
        const radius = randomRange(2, 5);
        const life = randomRange(lifetime * 0.5, lifetime);
        
        particles.push({
            x,
            y,
            radius,
            color,
            velocity,
            life,
            maxLife: life,
            draw() {
                const alpha = this.life / this.maxLife;
                ctx.globalAlpha = alpha;
                createNeonEffect(ctx, this.color, 10 * alpha);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                clearNeonEffect(ctx);
                ctx.globalAlpha = 1;
            },
            update(deltaTime = 0.016) {
                const timeScale = deltaTime * 60;
                this.x += this.velocity.x * timeScale;
                this.y += this.velocity.y * timeScale;
                this.life -= timeScale;
                this.velocity.x *= Math.pow(0.95, timeScale);
                this.velocity.y *= Math.pow(0.95, timeScale);
                return this.life > 0;
            }
        });
    }
}
