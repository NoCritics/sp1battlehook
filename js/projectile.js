// Projectile system

class Projectile {
    constructor(x, y, angle, speed, isEnemyProjectile = true) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.radius = 8; // Mid-size projectile
        this.isEnemyProjectile = isEnemyProjectile;
        this.color = isEnemyProjectile ? '#ff3333' : '#33aaff';
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        this.active = true;
        this.trailCounter = 0;
        
        // Add pulse animation
        this.pulsePhase = Math.random() * Math.PI * 2; // Random starting phase
        this.pulseSpeed = 5 + Math.random() * 2; // Slightly varied pulse speed
        this.baseRadius = this.radius;
        
        // Calculate lifetime based on map size (for auto-cleanup of missed shots)
        this.lifetime = 10000; // 10 seconds default
    }

    update(mapWidth, mapHeight, deltaTime = 0.016) {
        // Scale with delta time for consistent movement regardless of framerate
        const timeScale = deltaTime * 60; // Normalize to 60fps
        
        // Move projectile
        this.x += this.velocity.x * timeScale;
        this.y += this.velocity.y * timeScale;
        
        // Update pulse animation
        this.pulsePhase += this.pulseSpeed * deltaTime;
        const pulseFactor = 0.2 * Math.sin(this.pulsePhase) + 1.0;
        this.radius = this.baseRadius * pulseFactor;
        
        // Reduce lifetime
        this.lifetime -= deltaTime * 1000;
        if (this.lifetime <= 0) {
            this.active = false;
        }
        
        // Create trail effect with delta time-based frequency
        this.trailCounter += deltaTime * 60;
        if (this.trailCounter >= 2 && window.effectsSystem) {
            window.effectsSystem.createHookTrailEffect(this.x, this.y, this.color);
            this.trailCounter = 0;
        }
        
        // Check if out of bounds
        if (this.x < 0 || this.x > mapWidth || this.y < 0 || this.y > mapHeight) {
            this.active = false;
        }
    }

    draw(ctx) {
        // Glow effect with intensity based on pulse
        const glowIntensity = 8 + (this.radius - this.baseRadius) * 2;
        createNeonEffect(ctx, this.color, glowIntensity);
        
        // Draw projectile
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Inner glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = this.isEnemyProjectile ? '#ff8888' : '#88ddff';
        ctx.fill();
        
        // Add subtle directional indicator to clarify motion
        if (this.speed > 0) {
            const tailLength = this.radius * 1.5;
            const tailWidth = this.radius * 0.4;
            
            ctx.beginPath();
            ctx.moveTo(
                this.x - Math.cos(this.angle) * tailLength,
                this.y - Math.sin(this.angle) * tailLength
            );
            ctx.lineTo(
                this.x - Math.cos(this.angle) * tailLength / 2,
                this.y - Math.sin(this.angle) * tailLength / 2
            );
            ctx.lineWidth = tailWidth;
            ctx.strokeStyle = this.isEnemyProjectile ? '#ff5555' : '#55aaff';
            ctx.stroke();
        }
        
        clearNeonEffect(ctx);
    }
}

class GrapplingHook {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.angle = angleBetweenPoints(x, y, targetX, targetY);
        this.speed = 20; // Increased from 15 - High speed
        this.maxDistance = 800; // Increased from 600 - Long range
        this.hitboxRadius = 15; // Big hitbox
        this.state = 'extending'; // 'extending', 'retracting', 'pulling', 'idle'
        this.hitEnemy = null;
        this.hookSize = 12;
        this.color = '#00aaff';
        this.velocity = {
            x: Math.cos(this.angle) * this.speed,
            y: Math.sin(this.angle) * this.speed
        };
        
        // Track previous positions for collision detection
        this.previousPositions = [];
        this.maxPreviousPositions = 3;
        
        // Better visual effects
        this.pulsePhase = 0;
        this.pulseSpeed = 8;
        this.chainSegments = [];
        this.numChainSegments = 8;
        
        // Make line thickness pulse
        this.baseLineWidth = 3;
        
        // Spawn particles at creation
        if (window.effectsSystem) {
            for (let i = 0; i < 10; i++) {
                const angle = this.angle + randomRange(-0.5, 0.5);
                window.effectsSystem.createHookTrailEffect(
                    this.x + Math.cos(angle) * 5,
                    this.y + Math.sin(angle) * 5,
                    this.color
                );
            }
        }
    }

    update(player, deltaTime = 0.016) {
        // Update pulse animation
        this.pulsePhase += this.pulseSpeed * deltaTime;
        
        // Scale movement with delta time for consistent speed
        const timeScale = deltaTime * 60; // Normalize to 60fps
        
        // Store current position before updating
        if (this.state === 'extending') {
            this.previousPositions.unshift({x: this.x, y: this.y});
            
            // Limit the number of previous positions
            if (this.previousPositions.length > this.maxPreviousPositions) {
                this.previousPositions.pop();
            }
        }
        
        switch (this.state) {
            case 'extending':
                // Move hook forward with time scaling
                this.x += this.velocity.x * timeScale;
                this.y += this.velocity.y * timeScale;
                
                // Create trail effect with delta time-based frequency
                if (window.effectsSystem && Math.random() < 0.3 * deltaTime * 60) {
                    window.effectsSystem.createHookTrailEffect(this.x, this.y, this.color);
                }
                
                // Check if hook has reached maximum distance
                if (distance(this.startX, this.startY, this.x, this.y) >= this.maxDistance) {
                    this.state = 'retracting';
                    // Spawn particles when changing direction
                    if (window.effectsSystem) {
                        window.effectsSystem.createExplosion(this.x, this.y, this.color, 15);
                    }
                }
                break;
                
            case 'retracting':
                // Calculate direction back to player
                const angleToPlayer = angleBetweenPoints(this.x, this.y, player.x, player.y);
                
                // Move hook back to player with time scaling
                this.velocity.x = Math.cos(angleToPlayer) * this.speed * 1.5;
                this.velocity.y = Math.sin(angleToPlayer) * this.speed * 1.5;
                this.x += this.velocity.x * timeScale;
                this.y += this.velocity.y * timeScale;
                
                // Create trail effect with delta time-based frequency
                if (window.effectsSystem && Math.random() < 0.3 * deltaTime * 60) {
                    window.effectsSystem.createHookTrailEffect(this.x, this.y, this.color);
                }
                
                // Check if hook has returned close enough to player
                if (distance(player.x, player.y, this.x, this.y) <= player.radius) {
                    this.state = 'idle';
                    // Spawn particles when hook returns
                    if (window.effectsSystem) {
                        window.effectsSystem.createExplosion(player.x, player.y, this.color, 10);
                    }
                }
                break;
                
            case 'pulling':
                // Hook has hit an enemy, pull player toward enemy
                // (Player movement is handled in the player class, we just update hook position)
                if (this.hitEnemy && this.hitEnemy.active) {
                    this.x = this.hitEnemy.x;
                    this.y = this.hitEnemy.y;
                    
                    // Create connecting electricity/energy effect between player and hooked enemy
                    if (window.effectsSystem && Math.random() < 0.5 * deltaTime * 60) {
                        // Create lightning-like particles along the hook path
                        const distanceToEnemy = distance(player.x, player.y, this.hitEnemy.x, this.hitEnemy.y);
                        const particleCount = Math.floor(distanceToEnemy / 30);
                        
                        for (let i = 0; i < particleCount; i++) {
                            const t = i / particleCount;
                            const jitterX = (Math.random() - 0.5) * 20;
                            const jitterY = (Math.random() - 0.5) * 20;
                            const x = lerp(player.x, this.hitEnemy.x, t) + jitterX;
                            const y = lerp(player.y, this.hitEnemy.y, t) + jitterY;
                            
                            window.effectsSystem.createHookTrailEffect(x, y, '#ffffff');
                        }
                    }
                } else {
                    // If enemy is gone or no longer active, start retracting
                    this.state = 'retracting';
                    this.hitEnemy = null;
                }
                break;
                
            case 'idle':
                // Hook is inactive
                this.x = player.x;
                this.y = player.y;
                break;
        }
        
        // Update chain segments for smoother animation
        this.updateChainSegments(player);
    }
    
    // New method to handle chain segment positioning
    updateChainSegments(player) {
        // Only calculate chain segments when hook is visible
        if (this.state === 'idle') return;
        
        // Calculate chain segment positions
        this.chainSegments = [];
        
        // Get start and end positions
        const startX = player.x;
        const startY = player.y;
        const endX = this.x;
        const endY = this.y;
        
        // Create curved chain effect
        for (let i = 0; i <= this.numChainSegments; i++) {
            const t = i / this.numChainSegments;
            
            // Calculate base position (straight line)
            const baseX = lerp(startX, endX, t);
            const baseY = lerp(startY, endY, t);
            
            // Add sine wave displacement for chain curve
            const dist = distance(startX, startY, endX, endY);
            const displacement = dist * 0.05 * Math.sin(t * Math.PI); // Arch in the middle
            
            // Calculate perpendicular vector for displacement direction
            const perpAngle = this.angle + Math.PI/2;
            const displaceX = Math.cos(perpAngle) * displacement;
            const displaceY = Math.sin(perpAngle) * displacement;
            
            // Add some randomness for chain jitter
            const jitterAmount = (this.state === 'pulling') ? 5 : 2;
            const jitterX = (Math.random() - 0.5) * jitterAmount;
            const jitterY = (Math.random() - 0.5) * jitterAmount;
            
            // Store final segment position
            this.chainSegments.push({
                x: baseX + displaceX + jitterX,
                y: baseY + displaceY + jitterY
            });
        }
    }

    draw(ctx) {
        if (this.state === 'idle') return;
        
        // Calculate line width with pulse effect
        const pulseFactor = 0.3 * Math.sin(this.pulsePhase) + 1.0;
        const lineWidth = this.baseLineWidth * pulseFactor;
        
        // Draw energy chain segments (improved visual effect)
        if (this.chainSegments.length > 0 && 
           (this.state === 'extending' || this.state === 'retracting' || this.state === 'pulling')) {
            
            // Enhanced glow for the chain
            createNeonEffect(ctx, this.color, 8 * pulseFactor);
            
            // Draw chain as a path with tension curve
            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            
            // Draw through all chain segments
            for (const segment of this.chainSegments) {
                ctx.lineTo(segment.x, segment.y);
            }
            
            ctx.strokeStyle = this.color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            
            // Draw energy nodes along the chain
            for (let i = 1; i < this.chainSegments.length - 1; i += 2) {
                const segment = this.chainSegments[i];
                const nodeSize = 2 + Math.sin(this.pulsePhase + i * 0.5) * 1;
                
                ctx.beginPath();
                ctx.arc(segment.x, segment.y, nodeSize, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }
            
            clearNeonEffect(ctx);
        }
        
        // Draw hook with enhanced effects
        createNeonEffect(ctx, this.color, 12 * pulseFactor);
        
        // Hook head base
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.hookSize * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Hook inner glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.hookSize * 0.6 * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = '#88ddff';
        ctx.fill();
        
        // Draw hook barbs/claws for catching enemies (when pulling)
        if (this.state === 'pulling' && this.hitEnemy) {
            const barbLength = this.hookSize * 1.2;
            const barbWidth = this.hookSize * 0.4;
            const barbAngle = Math.PI / 4; // 45 degrees
            
            // Angle from hook to enemy
            const hookAngle = angleBetweenPoints(this.x, this.y, this.startX, this.startY);
            
            // Draw three barbs
            for (let i = 0; i < 3; i++) {
                const rotAngle = hookAngle + (i * Math.PI * 2 / 3);
                
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(
                    this.x + Math.cos(rotAngle) * barbLength,
                    this.y + Math.sin(rotAngle) * barbLength
                );
                ctx.lineWidth = barbWidth;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }
        }
        
        clearNeonEffect(ctx);
        
        // Add a bright energy core in the center
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.hookSize * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // DEBUG: Draw hitbox for hook (helpful for visualizing collision area)
        /*
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.hitboxRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        */
    }

    cancel() {
        this.state = 'retracting';
    }

    hit(enemy) {
        this.state = 'pulling';
        this.hitEnemy = enemy;
        
        // Create impact effect
        if (window.effectsSystem) {
            // Add explosion at hit point
            window.effectsSystem.createExplosion(enemy.x, enemy.y, '#00aaff', 20);
            
            // Add floating text
            window.effectsSystem.createFloatingText(
                enemy.x, 
                enemy.y, 
                'HOOKED!', 
                '#ffffff', 
                18
            );
            
            // Create particles
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = randomRange(2, 5);
                const distance = randomRange(0, enemy.radius);
                
                const particleX = enemy.x + Math.cos(angle) * distance;
                const particleY = enemy.y + Math.sin(angle) * distance;
                
                window.effectsSystem.particles.push({
                    x: particleX,
                    y: particleY,
                    radius: randomRange(2, 4),
                    color: '#00aaff',
                    velocity: {
                        x: Math.cos(angle) * speed,
                        y: Math.sin(angle) * speed
                    },
                    life: randomRange(20, 40),
                    maxLife: 40,
                    draw() {
                        const alpha = this.life / this.maxLife;
                        window.effectsSystem.ctx.globalAlpha = alpha;
                        createNeonEffect(window.effectsSystem.ctx, this.color, 10 * alpha);
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
                        this.velocity.x *= Math.pow(0.95, timeScale);
                        this.velocity.y *= Math.pow(0.95, timeScale);
                        return this.life > 0;
                    }
                });
            }
        }
    }
}

// Projectiles array will be initialized in the game.js file