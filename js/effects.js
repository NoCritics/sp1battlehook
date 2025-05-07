// Visual effects and animation system

class EffectsSystem {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];
        this.explosions = [];
        this.floatingTexts = [];
        this.backgroundParticles = []; // New background particle system for ambient effects
        this.maxBackgroundParticles = 30; // Reduced from 50 to 30 for better performance
        
        // Add limits for other particle types
        this.maxParticles = 200; // Cap total particles
        this.maxExplosions = 10; // Cap total explosions
        
        // Performance optimization flag
        this.lowPerformanceMode = false;
        this.lastFpsCheck = 0;
        this.fpsCheckInterval = 1000; // Check FPS every second
        
        // Initialize background particles
        this.initBackgroundParticles();
    }
    
    // Create ambient background particles
    initBackgroundParticles() {
        const canvas = this.ctx.canvas;
        for (let i = 0; i < this.maxBackgroundParticles; i++) {
            this.createBackgroundParticle(canvas.width, canvas.height);
        }
    }

    // Check if we should add more particles based on performance
    canAddMoreParticles(particleType) {
        // If in low performance mode, be more strict about particle limits
        const performanceMultiplier = this.lowPerformanceMode ? 0.5 : 1;
        
        switch (particleType) {
            case 'particle':
                return this.particles.length < this.maxParticles * performanceMultiplier;
            case 'explosion':
                return this.explosions.length < this.maxExplosions * performanceMultiplier;
            case 'background':
                return this.backgroundParticles.length < this.maxBackgroundParticles * performanceMultiplier;
            default:
                return true;
        }
    }

    // New method for creating ambient background particles
    createBackgroundParticle(mapWidth, mapHeight) {
        const x = Math.random() * mapWidth;
        const y = Math.random() * mapHeight;
        
        this.backgroundParticles.push({
            x, y,
            radius: randomRange(1, 3),
            baseRadius: randomRange(1, 3),
            color: `rgba(${Math.floor(randomRange(0, 100))}, ${Math.floor(randomRange(100, 200))}, ${Math.floor(randomRange(200, 255))}, 0.5)`,
            velocity: {
                x: randomRange(-0.2, 0.2),
                y: randomRange(-0.2, 0.2)
            },
            life: randomRange(300, 600),
            maxLife: 600,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: randomRange(1, 3),
            draw() {
                // Pulse size and opacity with sin wave
                const pulseFactor = 0.2 * Math.sin(this.pulsePhase) + 1.0;
                const alpha = (this.life / this.maxLife) * 0.4 * pulseFactor;
                const ctx = window.effectsSystem.ctx;
                
                // Skip drawing if almost invisible
                if (alpha < 0.02) return;
                
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.baseRadius * pulseFactor, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.globalAlpha = 1;
            },
            update(deltaTime = 0.016) {
                const timeScale = deltaTime * 60;
                
                // Update position with delta time
                this.x += this.velocity.x * timeScale;
                this.y += this.velocity.y * timeScale;
                
                // Update pulse animation
                this.pulsePhase += this.pulseSpeed * deltaTime;
                
                // Update life
                this.life -= timeScale;
                
                // Wrap around screen
                if (this.x < -10) this.x = window.effectsSystem.ctx.canvas.width + 10;
                if (this.x > window.effectsSystem.ctx.canvas.width + 10) this.x = -10;
                if (this.y < -10) this.y = window.effectsSystem.ctx.canvas.height + 10;
                if (this.y > window.effectsSystem.ctx.canvas.height + 10) this.y = -10;
                
                return this.life > 0;
            }
        });
    }
    
    // Create a pulsating energy line between two points
    createEnergyBeam(startX, startY, endX, endY, color = '#00aaff', width = 3, duration = 30) {
        this.particles.push({
            startX, startY, endX, endY,
            width,
            color,
            life: duration,
            maxLife: duration,
            phase: 0,
            speed: 10 + Math.random() * 5,
            draw() {
                const alpha = this.life / this.maxLife;
                const ctx = window.effectsSystem.ctx;
                
                // Calculate pulse effect
                const pulseFactor = 0.3 * Math.sin(this.phase) + 1.0;
                const currentWidth = this.width * pulseFactor;
                
                ctx.globalAlpha = alpha * 0.8;
                createNeonEffect(ctx, this.color, 10 * alpha * pulseFactor);
                
                // Draw energy beam
                ctx.beginPath();
                ctx.moveTo(this.startX, this.startY);
                ctx.lineTo(this.endX, this.endY);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = currentWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
                
                // Add energy nodes along the line
                const dx = this.endX - this.startX;
                const dy = this.endY - this.startY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const numNodes = Math.max(2, Math.floor(dist / 30));
                
                for (let i = 0; i <= numNodes; i++) {
                    // Skip endpoints
                    if (i === 0 || i === numNodes) continue;
                    
                    const t = i / numNodes;
                    const nodeX = this.startX + dx * t;
                    const nodeY = this.startY + dy * t;
                    const jitter = 3 * Math.sin(this.phase * 2 + i);
                    
                    ctx.beginPath();
                    ctx.arc(nodeX + jitter, nodeY + jitter, currentWidth * 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                }
                
                clearNeonEffect(ctx);
                ctx.globalAlpha = 1;
            },
            update(deltaTime = 0.016) {
                const timeScale = deltaTime * 60;
                this.life -= timeScale;
                this.phase += this.speed * deltaTime;
                return this.life > 0;
            }
        });
    }

    update(deltaTime = 0.016) {
        // Check performance every second and adjust accordingly
        const now = performance.now();
        if (now - this.lastFpsCheck > this.fpsCheckInterval) {
            // If we have too many particles, enable low performance mode
            const totalParticles = this.particles.length + this.explosions.length + this.backgroundParticles.length;
            this.lowPerformanceMode = totalParticles > 250;
            this.lastFpsCheck = now;
        }
        
        // Maintain maximum particle limits - remove oldest first if over limit
        if (this.particles.length > this.maxParticles) {
            this.particles.splice(0, this.particles.length - this.maxParticles);
        }
        
        // Update particles with delta time
        this.particles = this.particles.filter(particle => {
            // Handle both particles with update(deltaTime) and legacy particles
            if (particle.updateWithDelta) {
                return particle.updateWithDelta(deltaTime);
            } else {
                return particle.update(deltaTime);
            }
        });
        
        // Update explosions with delta time
        this.explosions = this.explosions.filter(explosion => {
            explosion.update(deltaTime);
            return explosion.life > 0;
        });
        
        // Update floating texts with delta time
        this.floatingTexts = this.floatingTexts.filter(text => {
            text.update(deltaTime);
            return text.life > 0;
        });
        
        // Update background particles
        this.backgroundParticles = this.backgroundParticles.filter(particle => {
            return particle.update(deltaTime);
        });
        
        // Keep background particles replenished, but at varying rates based on performance
        const canvas = this.ctx.canvas;
        const replenishCount = this.lowPerformanceMode ? 
            Math.min(1, this.maxBackgroundParticles - this.backgroundParticles.length) : 
            Math.min(3, this.maxBackgroundParticles - this.backgroundParticles.length);
            
        for (let i = 0; i < replenishCount; i++) {
            this.createBackgroundParticle(canvas.width, canvas.height);
        }
    }

    draw() {
        // Draw background particles first (behind everything)
        this.backgroundParticles.forEach(particle => particle.draw());
        
        // Draw particles
        this.particles.forEach(particle => particle.draw());
        
        // Draw explosions
        this.explosions.forEach(explosion => explosion.draw());
        
        // Draw floating texts
        this.floatingTexts.forEach(text => text.draw());
    }

    createExplosion(x, y, color, size = 30) {
        // Skip if over the limit
        if (!this.canAddMoreParticles('explosion')) {
            // If we're at the limit, replace the oldest explosion
            if (this.explosions.length > 0) {
                this.explosions.shift(); // Remove oldest
            } else {
                return; // No room for new explosion
            }
        }
        
        // Add a bright flash at explosion center
        this.explosions.push({
            x, y,
            type: 'flash',
            radius: size * 0.4,
            color: '#ffffff',
            life: 10,
            maxLife: 10, 
            update(deltaTime = 0.016) {
                // Scale with delta time
                this.life -= deltaTime * 60;
            },
            draw() {
                const alpha = this.life / this.maxLife;
                
                window.effectsSystem.ctx.globalAlpha = alpha;
                createNeonEffect(window.effectsSystem.ctx, this.color, 30 * alpha);
                
                window.effectsSystem.ctx.beginPath();
                window.effectsSystem.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                window.effectsSystem.ctx.fillStyle = this.color;
                window.effectsSystem.ctx.fill();
                
                clearNeonEffect(window.effectsSystem.ctx);
                window.effectsSystem.ctx.globalAlpha = 1;
            }
        });
        
        // Skip secondary effects in low performance mode
        if (this.lowPerformanceMode && Math.random() < 0.5) {
            return;
        }
        
        // Main explosion ring
        this.explosions.push({
            x, y,
            radius: 0,
            maxRadius: size,
            color,
            life: 30,
            maxLife: 30,
            phase: 0, // For pulsing effect
            update(deltaTime = 0.016) {
                // Scale expansion and life with delta time
                const timeScale = deltaTime * 60;
                this.radius = this.maxRadius * (1 - this.life / this.maxLife);
                this.life -= timeScale;
                this.phase += deltaTime * 10;
                
                // Create particles at the explosion edge with delta time-based frequency
                // Reduce particle creation frequency in low performance mode
                const particleThreshold = window.effectsSystem.lowPerformanceMode ? 0.05 : 0.2;
                if (this.life > 0 && Math.random() < particleThreshold * deltaTime * 60) {
                    // Create fewer particles if many are already present
                    if (window.effectsSystem.canAddMoreParticles('particle')) {
                        const particleCount = Math.floor(window.effectsSystem.lowPerformanceMode ? 1 : 3 * deltaTime * 60);
                        createParticles(
                            this.x, 
                            this.y, 
                            this.color, 
                            particleCount, 
                            3, 
                            window.effectsSystem.ctx, 
                            window.effectsSystem.particles
                        );
                    }
                }
            },
            draw() {
                const alpha = this.life / this.maxLife;
                
                // Extra check to skip drawing near-invisible explosions
                if (alpha < 0.05) return;
                
                window.effectsSystem.ctx.globalAlpha = alpha;
                createNeonEffect(window.effectsSystem.ctx, this.color, 20 * alpha);
                
                window.effectsSystem.ctx.beginPath();
                window.effectsSystem.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                window.effectsSystem.ctx.strokeStyle = this.color;
                window.effectsSystem.ctx.lineWidth = 3;
                window.effectsSystem.ctx.stroke();
                
                clearNeonEffect(window.effectsSystem.ctx);
                window.effectsSystem.ctx.globalAlpha = 1;
            }
        });
    }

    createFloatingText(x, y, text, color, size = 20) {
        this.floatingTexts.push({
            x,
            y,
            text,
            color,
            size,
            velocity: {
                x: randomRange(-0.5, 0.5), // Add slight horizontal drift
                y: -2 - Math.random() * 1 // Randomize vertical speed slightly
            },
            life: 60,
            maxLife: 60,
            angle: randomRange(-0.1, 0.1), // Slight random tilt
            scale: 0, // Start small and grow
            targetScale: 1 + Math.random() * 0.3, // Random final size
            update(deltaTime = 0.016) {
                const timeScale = deltaTime * 60;
                
                // Update position with delta time
                this.x += this.velocity.x * timeScale;
                this.y += this.velocity.y * timeScale;
                
                // Gradually slow down
                this.velocity.y *= 0.97;
                
                // Update life with delta time
                this.life -= timeScale;
                
                // Grow to target scale quickly at first
                if (this.scale < this.targetScale) {
                    this.scale = Math.min(this.targetScale, this.scale + 0.1 * timeScale);
                }
                
                // Then shrink as it fades
                if (this.life < 20) {
                    this.scale *= 0.97;
                }
            },
            draw() {
                const alpha = this.life / this.maxLife;
                const ctx = window.effectsSystem.ctx;
                
                ctx.globalAlpha = alpha;
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.scale(this.scale, this.scale);
                
                // Set text style
                ctx.font = `bold ${this.size}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Draw text with glow
                createNeonEffect(ctx, this.color, 10 * alpha);
                ctx.fillStyle = this.color;
                ctx.fillText(this.text, 0, 0);
                
                // Draw text shadow/outline for better readability
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeText(this.text, 0, 0);
                
                clearNeonEffect(ctx);
                ctx.restore();
                ctx.globalAlpha = 1;
            }
        });
    }

    // Effect when shield blocks a projectile
    createShieldBlockEffect(x, y, angle) {
        // Create a spray of particles in the opposite direction
        const deflectionAngle = angle + Math.PI;
        for (let i = 0; i < 25; i++) { // Increased particle count
            const spreadAngle = deflectionAngle + randomRange(-0.7, 0.7); // Wider spread
            const speed = randomRange(3, 10); // Faster particles
            
            this.particles.push({
                x,
                y,
                radius: randomRange(2, 5),
                baseRadius: randomRange(2, 5), // Store the base size
                color: i % 2 === 0 ? '#ff5500' : '#ffdd00', // Alternate colors
                velocity: {
                    x: Math.cos(spreadAngle) * speed,
                    y: Math.sin(spreadAngle) * speed
                },
                life: randomRange(20, 40),
                maxLife: 40,
                pulsePhase: Math.random() * Math.PI * 2, // Random starting phase
                pulseSpeed: 10 + Math.random() * 5, // Pulse speed
                draw() {
                    const alpha = this.life / this.maxLife;
                    const ctx = window.effectsSystem.ctx;
                    
                    // Pulse the size and glow
                    const pulseFactor = 0.2 * Math.sin(this.pulsePhase) + 1.0;
                    const currentRadius = this.baseRadius * pulseFactor;
                    
                    ctx.globalAlpha = alpha;
                    createNeonEffect(ctx, this.color, 15 * alpha * pulseFactor);
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.fill();
                    
                    // Add a bright core
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, currentRadius * 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    
                    clearNeonEffect(ctx);
                    ctx.globalAlpha = 1;
                },
                update(deltaTime = 0.016) {
                    const timeScale = deltaTime * 60;
                    
                    // Update position with delta time
                    this.x += this.velocity.x * timeScale;
                    this.y += this.velocity.y * timeScale;
                    
                    // Update life
                    this.life -= timeScale;
                    
                    // Update pulse phase
                    this.pulsePhase += this.pulseSpeed * deltaTime;
                    
                    // Slow down over time
                    this.velocity.x *= Math.pow(0.95, timeScale);
                    this.velocity.y *= Math.pow(0.95, timeScale);
                    
                    return this.life > 0;
                }
            });
        }
        
        // Create a flash at impact point - larger and more dramatic
        this.createExplosion(x, y, '#ff8800', 25);
        
        // Add impact shockwave
        this.explosions.push({
            x, y,
            radius: 0,
            maxRadius: 40,
            color: '#ffffff',
            life: 20,
            maxLife: 20,
            update(deltaTime = 0.016) {
                const timeScale = deltaTime * 60;
                this.radius = this.maxRadius * (1 - this.life / this.maxLife);
                this.life -= timeScale;
            },
            draw() {
                const alpha = this.life / this.maxLife;
                const ctx = window.effectsSystem.ctx;
                
                ctx.globalAlpha = alpha * 0.7;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 3 * alpha;
                createNeonEffect(ctx, '#ffaa00', 10 * alpha);
                ctx.stroke();
                clearNeonEffect(ctx);
                ctx.globalAlpha = 1;
            }
        });
    }

    // Effect for player invulnerability
    createInvulnerabilityAura(player) {
        // Add aura particles based on delta time likelihood
        if (player.isInvulnerable) {
            // Calculate how long player has been invulnerable
            const invulnerableProgress = (performance.now() - player.invulnerabilityTime) / player.invulnerabilityDuration;
            
            // Particle frequency varies with invulnerability progress (more at start and end)
            const particleFrequency = 0.4 + 0.3 * Math.sin(invulnerableProgress * Math.PI * 2);
            
            // Probabilistically create particles
            if (Math.random() < particleFrequency) {
                // Create particles around player perimeter
                const angle = Math.random() * Math.PI * 2;
                const distance = player.radius * 1.2;
                const x = player.x + Math.cos(angle) * distance;
                const y = player.y + Math.sin(angle) * distance;
                
                // Color varies based on invulnerability time remaining
                const colorProgress = Math.min(1, invulnerableProgress * 2); // Pulse color intensity
                const color = colorProgress > 0.8 ? '#ffffff' : '#00aaff';
                
                this.particles.push({
                    x,
                    y,
                    radius: randomRange(3, 6),
                    baseRadius: randomRange(3, 6),
                    color,
                    velocity: {
                        x: Math.cos(angle) * randomRange(0.5, 2.0),
                        y: Math.sin(angle) * randomRange(0.5, 2.0)
                    },
                    life: randomRange(20, 40),
                    maxLife: 40,
                    pulsePhase: Math.random() * Math.PI * 2,
                    pulseSpeed: 8 + Math.random() * 4,
                    draw() {
                        const alpha = this.life / this.maxLife;
                        const ctx = window.effectsSystem.ctx;
                        
                        // Pulse size and glow intensity
                        const pulseFactor = 0.3 * Math.sin(this.pulsePhase) + 1.0;
                        const particleRadius = this.baseRadius * pulseFactor;
                        
                        ctx.globalAlpha = alpha * 0.8;
                        createNeonEffect(ctx, this.color, 15 * alpha * pulseFactor);
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, particleRadius, 0, Math.PI * 2);
                        ctx.fillStyle = this.color;
                        ctx.fill();
                        
                        // Bright inner core
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, particleRadius * 0.5, 0, Math.PI * 2);
                        ctx.fillStyle = '#ffffff';
                        ctx.fill();
                        
                        clearNeonEffect(ctx);
                        ctx.globalAlpha = 1;
                    },
                    update(deltaTime = 0.016) {
                        const timeScale = deltaTime * 60;
                        
                        // Update position with time scaling
                        this.x += this.velocity.x * timeScale;
                        this.y += this.velocity.y * timeScale;
                        
                        // Update life
                        this.life -= timeScale;
                        
                        // Update pulse animation
                        this.pulsePhase += this.pulseSpeed * deltaTime;
                        
                        // Gradually slow down
                        this.velocity.x *= Math.pow(0.95, timeScale);
                        this.velocity.y *= Math.pow(0.95, timeScale);
                        
                        return this.life > 0;
                    }
                });
            }
            
            // Occasionally create an energy wave around the player
            if (Math.random() < 0.02) {
                this.explosions.push({
                    x: player.x,
                    y: player.y,
                    radius: player.radius * 1.1,
                    maxRadius: player.radius * 2.5,
                    color: '#00aaff',
                    life: 20,
                    maxLife: 20,
                    update(deltaTime = 0.016) {
                        const timeScale = deltaTime * 60;
                        this.radius += 2 * timeScale;
                        this.life -= timeScale;
                    },
                    draw() {
                        const alpha = this.life / this.maxLife;
                        const ctx = window.effectsSystem.ctx;
                        
                        ctx.globalAlpha = alpha * 0.5;
                        createNeonEffect(ctx, this.color, 15 * alpha);
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 2 * alpha;
                        ctx.stroke();
                        clearNeonEffect(ctx);
                        ctx.globalAlpha = 1;
                    }
                });
            }
        }
    }

    // Effect for enemy death
    createEnemyDeathEffect(enemy) {
        // In low performance mode, reduce the effects
        if (this.lowPerformanceMode) {
            // Just create a single explosion instead of multiple
            this.createExplosion(enemy.x, enemy.y, '#ff3333', enemy.radius * 3);
            
            // Create fewer particles
            createParticles(
                enemy.x, 
                enemy.y, 
                '#ff3333', 
                15,  // Reduced count
                8,
                this.ctx, 
                this.particles
            );
            
            // Add minimal white fragments
            createParticles(
                enemy.x, 
                enemy.y, 
                '#ffffff', 
                5, 
                10, 
                this.ctx, 
                this.particles
            );
            
            // Still create text for satisfaction
            this.createFloatingText(
                enemy.x, 
                enemy.y - enemy.radius,
                'DESTROYED!', 
                '#ffffff', 
                24
            );
            
            return;
        }
        
        // Full effect for normal performance mode
        // Create larger primary explosion
        this.createExplosion(enemy.x, enemy.y, '#ff3333', enemy.radius * 4);
        
        // Create secondary explosion with slight delay for more impact
        setTimeout(() => {
            if (!this.lowPerformanceMode) { // Double-check performance mode before delayed effects
                this.createExplosion(enemy.x, enemy.y, '#ffaa00', enemy.radius * 3);
            }
        }, 100);
        
        // Create tertiary white flash explosion
        setTimeout(() => {
            if (!this.lowPerformanceMode) { // Double-check performance mode before delayed effects
                this.createExplosion(enemy.x, enemy.y, '#ffffff', enemy.radius * 2.5);
            }
        }, 200);
        
        // Create more intense particle burst - with adaptive particle count
        const particleMultiplier = Math.min(1, 200 / this.particles.length); // Scale down if too many particles
        const primaryCount = Math.floor(50 * particleMultiplier);
        
        createParticles(
            enemy.x, 
            enemy.y, 
            '#ff3333', 
            primaryCount,  
            8, 
            this.ctx, 
            this.particles
        );
        
        // Create secondary burst with different color
        const secondaryCount = Math.floor(30 * particleMultiplier);
        createParticles(
            enemy.x, 
            enemy.y, 
            '#ff8800', 
            secondaryCount, 
            6, 
            this.ctx, 
            this.particles
        );
        
        // Add white hot fragments
        const whiteCount = Math.floor(20 * particleMultiplier);
        createParticles(
            enemy.x, 
            enemy.y, 
            '#ffffff', 
            whiteCount, 
            10, 
            this.ctx, 
            this.particles
        );
        
        // Add energy ring effect
        this.createEnergyBeam(
            enemy.x - enemy.radius * 2, 
            enemy.y, 
            enemy.x + enemy.radius * 2, 
            enemy.y, 
            '#ff3333', 
            4, 
            30
        );
        
        // Create floating text for more impact
        this.createFloatingText(
            enemy.x, 
            enemy.y - enemy.radius,
            'DESTROYED!', 
            '#ffffff', 
            24
        );
    }

    // Hook trail effect with performance optimization
    createHookTrailEffect(x, y, color) {
        // Only create particles if not too many already exist
        if (!this.canAddMoreParticles('particle')) return;
        
        // Reduce creation chance in low performance mode
        if (this.lowPerformanceMode && Math.random() < 0.7) return;
        
        if (Math.random() < 0.3) {
            this.particles.push({
                x,
                y,
                radius: randomRange(2, 4),
                color,
                velocity: {
                    x: randomRange(-0.5, 0.5),
                    y: randomRange(-0.5, 0.5)
                },
                life: randomRange(10, 20),
                maxLife: 20,
                draw() {
                    const alpha = this.life / this.maxLife;
                    window.effectsSystem.ctx.globalAlpha = alpha * 0.7;
                    createNeonEffect(window.effectsSystem.ctx, this.color, 8 * alpha);
                    window.effectsSystem.ctx.beginPath();
                    window.effectsSystem.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    window.effectsSystem.ctx.fillStyle = this.color;
                    window.effectsSystem.ctx.fill();
                    clearNeonEffect(window.effectsSystem.ctx);
                    window.effectsSystem.ctx.globalAlpha = 1;
                },
                update(deltaTime = 0.016) {
                    const timeScale = deltaTime * 60;
                    this.x += this.velocity.x * timeScale;
                    this.y += this.velocity.y * timeScale;
                    this.life -= timeScale;
                    return this.life > 0;
                }
            });
        }
    }
}

// Global variable
let effectsSystem;