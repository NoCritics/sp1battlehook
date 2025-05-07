// Enemy system

class Enemy {
    constructor(x, y, mapWidth, mapHeight) {
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.barrelLength = this.radius * 0.8;
        this.color = '#ff3333'; // Red with glow
        this.aimAngle = 0;
        this.speed = 2.5; // Will be adjusted based on player speed
        this.lastShot = 0;
        this.shotCooldown = randomRange(1500, 3000); // Random cooldown between shots
        this.health = 1; // One-hit kill
        this.active = true;
        
        // Initialize velocity
        this.velocity = {
            x: 0,
            y: 0
        };
        
        // Add knockback properties
        this.isKnockedBack = false;
        this.knockbackDuration = 0;
        this.knockbackMaxDuration = 60; // Frames of knockback effect
        
        // Add initial delay before first shot
        this.spawnTime = performance.now();
        this.initialDelay = 1000; // 1 second delay before first shot
        
        // Visual enhancement properties
        this.phase = Math.random() * Math.PI * 2; // Random starting phase for animations
        this.innerRotation = Math.random() * Math.PI * 2; // Random rotation for inner parts
        this.rotationSpeed = 0.5 + Math.random() * 1.0; // Varied rotation speed
        
        // Create a unique variation for this enemy
        this.variation = Math.floor(Math.random() * 3); // 0, 1, or 2
        
        // Barrel oscillation properties
        this.barrelOscillation = 0;
        this.barrelOscillationSpeed = 0.05 + Math.random() * 0.05;
        this.barrelOscillationAmount = 0.15 + Math.random() * 0.1;
    }

    // Helper methods for drawing different inner patterns
    drawInnerCircles(ctx) {
        // Draw concentric circles
        for (let i = 0; i < 3; i++) {
            const radius = this.radius * (0.4 + i * 0.15);
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = i % 2 === 0 ? '#ff5555' : '#aa0000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw rotating dots on the circles
        for (let i = 0; i < 6; i++) {
            const angle = this.innerRotation + (i / 6) * Math.PI * 2;
            const radius = this.radius * 0.55;
            const dotX = this.x + Math.cos(angle) * radius;
            const dotY = this.y + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ff8800';
            ctx.fill();
        }
    }
    
    drawInnerCross(ctx) {
        // Draw rotating cross pattern
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.innerRotation);
        
        // Draw cross bars
        for (let i = 0; i < 2; i++) {
            const angle = i * Math.PI / 2; // 0 and 90 degrees
            const length = this.radius * 0.7;
            
            ctx.save();
            ctx.rotate(angle);
            
            ctx.beginPath();
            ctx.rect(-length, -4, length * 2, 8);
            ctx.fillStyle = '#aa0000';
            ctx.fill();
            
            // Add details to the cross bars
            for (let j = 0; j < 3; j++) {
                const dotX = -length + j * length;
                ctx.beginPath();
                ctx.arc(dotX, 0, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#ff8800';
                ctx.fill();
            }
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    drawInnerTriangles(ctx) {
        // Draw rotating triangular pattern
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw three rotating triangles
        for (let i = 0; i < 3; i++) {
            const angle = this.innerRotation + (i / 3) * Math.PI * 2;
            const radius = this.radius * 0.6;
            
            ctx.save();
            ctx.rotate(angle);
            
            // Draw triangle
            ctx.beginPath();
            ctx.moveTo(0, -radius * 0.5);
            ctx.lineTo(radius * 0.4, radius * 0.3);
            ctx.lineTo(-radius * 0.4, radius * 0.3);
            ctx.closePath();
            ctx.fillStyle = i % 2 === 0 ? '#ff3333' : '#aa0000';
            ctx.fill();
            
            // Add dot at the center of each triangle
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffff00';
            ctx.fill();
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    // Helper to draw a star (for stun effect)
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        
        // Add glow to the star
        createNeonEffect(ctx, color, 5);
        ctx.fillStyle = color;
        ctx.fill();
        clearNeonEffect(ctx);
    }

    update(player, currentTime, projectiles, mapWidth, mapHeight, deltaTime = 0.016) {
        // Scale with delta time for consistent movement regardless of framerate
        const timeScale = deltaTime * 60; // Normalize to 60fps
        
        // Cache commonly used variables
        const { x, y, radius } = this;
        
        // If knocked back, handle special knockback behavior
        if (this.isKnockedBack) {
            // Apply velocity with delta time
            this.x += this.velocity.x * timeScale;
            this.y += this.velocity.y * timeScale;
            
            // Decrement knockback duration with delta time
            this.knockbackDuration -= timeScale;
            if (this.knockbackDuration <= 0) {
                this.isKnockedBack = false;
            }
            
            // Apply a much slower velocity decay during knockback (with delta time)
            // Using a pre-calculated decay factor is more efficient
            const decayFactor = Math.pow(0.98, timeScale);
            this.velocity.x *= decayFactor;
            this.velocity.y *= decayFactor;
            
            // Create trail effect when knocked back - reduce particle creation frequency
            if (window.effectsSystem && Math.random() < 0.2 * deltaTime * 60) { // Reduced from 0.3 to 0.2
                const trailX = this.x - this.velocity.x * 0.5;
                const trailY = this.y - this.velocity.y * 0.5;
                window.effectsSystem.createHookTrailEffect(trailX, trailY, '#ff8800');
            }
        } else {
            // Calculate direction to player
            const angle = angleBetweenPoints(this.x, this.y, player.x, player.y);
            
            // Update aim angle (smooth tracking, adjusted for delta time)
            this.aimAngle = lerp(this.aimAngle, angle, 0.1 * timeScale);
            
            // Calculate normalized direction vector
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            
            // Set velocity based on player direction
            this.velocity.x = dx * this.speed;
            this.velocity.y = dy * this.speed;
            
            // Apply velocity with delta time
            this.x += this.velocity.x * timeScale;
            this.y += this.velocity.y * timeScale;
        }
        
        // Keep enemy within map bounds - using min/max is slightly faster than clamp
        this.x = Math.min(Math.max(this.x, radius), mapWidth - radius);
        this.y = Math.min(Math.max(this.y, radius), mapHeight - radius);
        
        // Handle shooting only if not knocked back and initial delay has passed
        const initialDelayPassed = (currentTime - this.spawnTime) > this.initialDelay;
        if (!this.isKnockedBack && initialDelayPassed && currentTime - this.lastShot > this.shotCooldown) {
            this.shoot(projectiles);
            this.lastShot = currentTime;
            this.shotCooldown = randomRange(1500, 3000); // Reset cooldown
        }
        
        // Animate parts (rotation, etc.)
        this.phase = (this.phase + deltaTime * 3) % (Math.PI * 2); // For pulsing effects
    }

    draw(ctx) {
        // Outer glow with pulsing effect
        const pulseAmount = 0.2 * Math.sin(this.phase) + 1.0;
        createNeonEffect(ctx, this.color, 15 * pulseAmount);
        
        // Draw enemy body (circle)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Create gradient fill for body
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.3,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#ff8888');
        gradient.addColorStop(0.6, this.color);
        gradient.addColorStop(1, '#aa0000');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Inner rotating mechanical parts (variation based on enemy type)
        this.innerRotation += 0.02 * (this.isKnockedBack ? 3 : 1); // Rotate faster when knocked back
        
        // Draw different inner patterns based on variation
        switch(this.variation) {
            case 0: // Concentric circles
                this.drawInnerCircles(ctx);
                break;
            case 1: // Cross pattern
                this.drawInnerCross(ctx);
                break;
            case 2: // Triangular pattern
                this.drawInnerTriangles(ctx);
                break;
        }
        
        // Draw energy core
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Update barrel oscillation for aiming effect
        this.barrelOscillation += this.barrelOscillationSpeed;
        const barrelAngle = this.aimAngle + Math.sin(this.barrelOscillation) * this.barrelOscillationAmount;
        
        // Draw barrel with updated angle and improved design
        const barrelEndX = this.x + Math.cos(barrelAngle) * (this.radius + this.barrelLength);
        const barrelEndY = this.y + Math.sin(barrelAngle) * (this.radius + this.barrelLength);
        const barrelWidth = this.radius * 0.4;
        
        // Calculate perpendicular points for barrel width
        const perpAngle = barrelAngle + Math.PI / 2;
        const p1x = this.x + Math.cos(perpAngle) * barrelWidth / 2;
        const p1y = this.y + Math.sin(perpAngle) * barrelWidth / 2;
        const p2x = this.x - Math.cos(perpAngle) * barrelWidth / 2;
        const p2y = this.y - Math.sin(perpAngle) * barrelWidth / 2;
        
        // Calculate barrel end points
        const b1x = barrelEndX + Math.cos(perpAngle) * barrelWidth / 2;
        const b1y = barrelEndY + Math.sin(perpAngle) * barrelWidth / 2;
        const b2x = barrelEndX - Math.cos(perpAngle) * barrelWidth / 2;
        const b2y = barrelEndY - Math.sin(perpAngle) * barrelWidth / 2;
        
        // Draw barrel with gradient
        const barrelGradient = ctx.createLinearGradient(this.x, this.y, barrelEndX, barrelEndY);
        barrelGradient.addColorStop(0, '#ff5555');
        barrelGradient.addColorStop(1, '#aa0000');
        
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(b1x, b1y);
        ctx.lineTo(b2x, b2y);
        ctx.lineTo(p2x, p2y);
        ctx.closePath();
        ctx.fillStyle = barrelGradient;
        ctx.fill();
        
        // Draw barrel end (muzzle)
        ctx.beginPath();
        ctx.arc(barrelEndX, barrelEndY, barrelWidth * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ff8800';
        ctx.fill();
        
        // Inner muzzle glow
        ctx.beginPath();
        ctx.arc(barrelEndX, barrelEndY, barrelWidth * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Add some aiming indicator
        const aimLineLength = 30;
        ctx.beginPath();
        ctx.moveTo(barrelEndX, barrelEndY);
        ctx.lineTo(
            barrelEndX + Math.cos(barrelAngle) * aimLineLength,
            barrelEndY + Math.sin(barrelAngle) * aimLineLength
        );
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]); // Dashed line
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
        
        // If enemy is knocked back, add some visual effects
        if (this.isKnockedBack) {
            // Draw stun effect (stars or sparks)
            for (let i = 0; i < 3; i++) {
                const angle = (this.phase + i * Math.PI * 2 / 3) % (Math.PI * 2);
                const distance = this.radius * 1.3;
                const starX = this.x + Math.cos(angle) * distance;
                const starY = this.y + Math.sin(angle) * distance;
                
                // Draw star
                this.drawStar(ctx, starX, starY, 5, 3, 6, '#ffff00');
            }
        }
        
        // Show charging indicator when about to shoot
        if (performance.now() - this.lastShot > this.shotCooldown * 0.8 && !this.isKnockedBack) {
            const chargeRatio = Math.min(1, (performance.now() - this.lastShot - this.shotCooldown * 0.8) / (this.shotCooldown * 0.2));
            
            // Draw charge indicator
            ctx.beginPath();
            ctx.arc(barrelEndX, barrelEndY, barrelWidth * 0.8 * chargeRatio, 0, Math.PI * 2);
            const chargeColor = `rgba(255, ${Math.floor(255 - 200 * chargeRatio)}, 0, ${0.7 * chargeRatio})`;
            createNeonEffect(ctx, chargeColor, 10 * chargeRatio);
            ctx.fillStyle = chargeColor;
            ctx.fill();
            clearNeonEffect(ctx);
        }
        
        // Clean up effects
        clearNeonEffect(ctx);
    }

    shoot(projectiles) {
        // Get barrel angle with oscillation
        const barrelAngle = this.aimAngle + Math.sin(this.barrelOscillation) * this.barrelOscillationAmount;
        
        // Create a new projectile from barrel end
        const barrelEndX = this.x + Math.cos(barrelAngle) * (this.radius + this.barrelLength);
        const barrelEndY = this.y + Math.sin(barrelAngle) * (this.radius + this.barrelLength);
        
        // Create main projectile
        projectiles.push(new Projectile(
            barrelEndX, 
            barrelEndY, 
            barrelAngle, 
            7, // Medium speed
            true // Enemy projectile
        ));
        
        // Create muzzle flash effect with more particles and variety
        if (window.effectsSystem) {
            // Create muzzle flash
            window.effectsSystem.createExplosion(barrelEndX, barrelEndY, '#ff8800', 15);
            
            // Add particles for more dramatic effect
            for (let i = 0; i < 12; i++) {
                const spreadAngle = barrelAngle + randomRange(-0.4, 0.4);
                const speed = randomRange(1, 4);
                const particleSize = randomRange(2, 5);
                
                // Alternate colors for more visual interest
                const color = i % 3 === 0 ? '#ff8800' : (i % 3 === 1 ? '#ffff00' : '#ff3300');
                
                window.effectsSystem.particles.push({
                    x: barrelEndX,
                    y: barrelEndY,
                    radius: particleSize,
                    color: color,
                    velocity: {
                        x: Math.cos(spreadAngle) * speed,
                        y: Math.sin(spreadAngle) * speed
                    },
                    life: randomRange(15, 30),
                    maxLife: 30,
                    draw() {
                        const alpha = this.life / this.maxLife;
                        effectsSystem.ctx.globalAlpha = alpha;
                        createNeonEffect(effectsSystem.ctx, this.color, 10 * alpha);
                        effectsSystem.ctx.beginPath();
                        effectsSystem.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        effectsSystem.ctx.fillStyle = this.color;
                        effectsSystem.ctx.fill();
                        clearNeonEffect(effectsSystem.ctx);
                        effectsSystem.ctx.globalAlpha = 1;
                    },
                    update(deltaTime = 0.016) {
                        const timeScale = deltaTime * 60;
                        this.x += this.velocity.x * timeScale;
                        this.y += this.velocity.y * timeScale;
                        this.life -= timeScale;
                        this.velocity.x *= Math.pow(0.9, timeScale);
                        this.velocity.y *= Math.pow(0.9, timeScale);
                        return this.life > 0;
                    }
                });
            }
            
            // Add recoil effect
            const recoilAngle = barrelAngle + Math.PI; // Opposite direction
            this.velocity.x += Math.cos(recoilAngle) * 1.0; // Small recoil
            this.velocity.y += Math.sin(recoilAngle) * 1.0;
        }
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            this.active = false;
            
            // Add some secondary particles when destroyed
            if (window.effectsSystem) {
                // Create energy burst
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = randomRange(3, 7);
                    const distance = randomRange(0, this.radius * 0.8);
                    
                    // Position particles throughout the enemy body
                    const particleX = this.x + Math.cos(angle) * distance;
                    const particleY = this.y + Math.sin(angle) * distance;
                    
                    window.effectsSystem.particles.push({
                        x: particleX,
                        y: particleY,
                        radius: randomRange(3, 6),
                        color: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? '#ff8800' : '#ff3333'),
                        velocity: {
                            x: Math.cos(angle) * speed,
                            y: Math.sin(angle) * speed
                        },
                        life: randomRange(30, 60),
                        maxLife: 60,
                        draw() {
                            const alpha = this.life / this.maxLife;
                            effectsSystem.ctx.globalAlpha = alpha;
                            createNeonEffect(effectsSystem.ctx, this.color, 10 * alpha);
                            effectsSystem.ctx.beginPath();
                            effectsSystem.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                            effectsSystem.ctx.fillStyle = this.color;
                            effectsSystem.ctx.fill();
                            clearNeonEffect(effectsSystem.ctx);
                            effectsSystem.ctx.globalAlpha = 1;
                        },
                        update(deltaTime = 0.016) {
                            const timeScale = deltaTime * 60;
                            this.x += this.velocity.x * timeScale;
                            this.y += this.velocity.y * timeScale;
                            this.life -= timeScale;
                            this.radius *= Math.pow(0.97, timeScale);
                            this.velocity.x *= Math.pow(0.95, timeScale);
                            this.velocity.y *= Math.pow(0.95, timeScale);
                            return this.life > 0;
                        }
                    });
                }
            }
        }
        return this.active;
    }
}

class EnemyManager {
    constructor(mapWidth, mapHeight) {
        this.enemies = [];
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.spawnInterval = 3000; // 3 seconds between enemy spawns
        this.lastSpawnTime = 0;
        this.maxEnemies = 10; // Maximum number of enemies at once
        
        // Enhanced properties
        this.waveSystem = true; // Enable wave-based spawning
        this.currentWave = 1;
        this.enemiesPerWave = 5; // Initial enemies per wave
        this.enemiesRemainingInWave = this.enemiesPerWave;
        this.waveCooldown = 5000; // Time between waves
        this.waveActive = false;
        this.waveStartTime = 0;
        
        // Difficulty scaling
        this.difficultyMultiplier = 1.0;
        this.gameTime = 0;
    }

    update(player, currentTime, projectiles, deltaTime = 0.016) {
        // Update game time
        this.gameTime += deltaTime;
        
        // Update difficulty based on game time
        this.difficultyMultiplier = 1.0 + Math.min(2.0, this.gameTime / 60); // Increases up to 3x over 2 minutes
        
        // Handle wave-based spawning
        if (this.waveSystem) {
            this.updateWaveSystem(currentTime);
        } else {
            // Original spawning system
            if (currentTime - this.lastSpawnTime > this.spawnInterval && 
                this.enemies.length < this.maxEnemies) {
                this.spawnEnemy();
                this.lastSpawnTime = currentTime;
                
                // Gradually decrease spawn interval as game progresses (up to a limit)
                this.spawnInterval = Math.max(1000, this.spawnInterval - 50);
                
                // Increase max enemies over time (up to a limit)
                if (currentTime > 60000) { // After 1 minute
                    this.maxEnemies = Math.min(20, 10 + Math.floor(currentTime / 30000));
                }
            }
        }
        
        // Update existing enemies with delta time
        this.enemies.forEach(enemy => {
            enemy.speed = player.speed / 2.5 * this.difficultyMultiplier; // Enemies get faster over time
            enemy.update(player, currentTime, projectiles, this.mapWidth, this.mapHeight, deltaTime);
        });
        
        // Remove inactive enemies
        const previousEnemyCount = this.enemies.length;
        this.enemies = this.enemies.filter(enemy => enemy.active);
        
        // If enemies were removed and we're in wave mode, update remaining count
        if (this.waveSystem && previousEnemyCount > this.enemies.length) {
            const enemiesRemoved = previousEnemyCount - this.enemies.length;
            this.enemiesRemainingInWave = Math.max(0, this.enemiesRemainingInWave - enemiesRemoved);
            
            // Check if wave is complete
            if (this.waveActive && this.enemiesRemainingInWave === 0 && this.enemies.length === 0) {
                this.waveActive = false;
                this.lastSpawnTime = currentTime; // Start cooldown
                
                // Show wave complete message
                if (window.effectsSystem) {
                    window.effectsSystem.createFloatingText(
                        this.mapWidth / 2,
                        this.mapHeight / 2,
                        `WAVE ${this.currentWave} COMPLETE!`,
                        '#00aaff',
                        32
                    );
                }
            }
        }
    }

    updateWaveSystem(currentTime) {
        if (this.waveActive) {
            // Wave is active, spawn enemies until we've spawned all for this wave
            if (this.enemiesRemainingInWave > 0 && 
                currentTime - this.lastSpawnTime > this.spawnInterval && 
                this.enemies.length < this.maxEnemies) {
                
                this.spawnEnemy();
                this.lastSpawnTime = currentTime;
                this.enemiesRemainingInWave--;
            }
        } else {
            // Between waves, wait for cooldown
            if (currentTime - this.lastSpawnTime >= this.waveCooldown) {
                // Start next wave
                this.currentWave++;
                this.waveActive = true;
                this.waveStartTime = currentTime;
                
                // Increase enemies per wave
                this.enemiesPerWave = Math.floor(5 + this.currentWave * 1.5);
                this.enemiesRemainingInWave = this.enemiesPerWave;
                
                // Decrease spawn interval for higher waves (more rapid spawning)
                this.spawnInterval = Math.max(500, 3000 - (this.currentWave - 1) * 200);
                
                // Show new wave message
                if (window.effectsSystem) {
                    window.effectsSystem.createFloatingText(
                        this.mapWidth / 2,
                        this.mapHeight / 2,
                        `WAVE ${this.currentWave} INCOMING!`,
                        '#ff5500',
                        36
                    );
                    
                    // Create wave start effect
                    window.effectsSystem.createExplosion(
                        this.mapWidth / 2,
                        this.mapHeight / 2,
                        '#ff5500',
                        100
                    );
                }
            } else if (currentTime - this.lastSpawnTime >= this.waveCooldown - 3000 && 
                      this.enemies.length === 0) {
                // Show warning 3 seconds before next wave
                // Only create one text message per second with no sub-second checks
                const secondsRemaining = Math.ceil((this.waveCooldown - (currentTime - this.lastSpawnTime)) / 1000);
                
                // Calculate the exact time since last spawn in seconds (with decimal places)
                const timeSinceSpawnInSeconds = (currentTime - this.lastSpawnTime) / 1000;
                
                // Only show message if we just crossed into a new second value
                // This ensures only one message per second
                if (Math.floor(timeSinceSpawnInSeconds) !== Math.floor(timeSinceSpawnInSeconds - 0.1) && 
                    secondsRemaining <= 3) {
                    
                    if (window.effectsSystem) {
                        // Clear any existing countdown messages first
                        window.effectsSystem.floatingTexts = window.effectsSystem.floatingTexts.filter(
                            text => !text.text.includes("NEXT WAVE IN")
                        );
                        
                        window.effectsSystem.createFloatingText(
                            this.mapWidth / 2,
                            this.mapHeight / 2,
                            `NEXT WAVE IN ${secondsRemaining}s`,
                            '#ffff00',
                            30
                        );
                    }
                }
            }
        }
    }

    draw(ctx) {
        this.enemies.forEach(enemy => enemy.draw(ctx));
        
        // Draw wave indicator if wave system is active
        if (this.waveSystem) {
            // Small UI in the top-right to show wave info
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Wave: ${this.currentWave}`, this.mapWidth - 20, 30);
            
            if (this.waveActive) {
                ctx.fillText(`Enemies Remaining: ${this.enemiesRemainingInWave + this.enemies.length}`, this.mapWidth - 20, 55);
            } else {
                const timeToNextWave = Math.max(0, Math.ceil((this.waveCooldown - (performance.now() - this.lastSpawnTime)) / 1000));
                ctx.fillText(`Next Wave: ${timeToNextWave}s`, this.mapWidth - 20, 55);
            }
        }
    }

    spawnEnemy() {
        const spawnPos = getRandomCornerPosition(this.mapWidth, this.mapHeight, 100);
        const enemy = new Enemy(spawnPos.x, spawnPos.y, this.mapWidth, this.mapHeight);
        
        // Apply difficulty scaling to enemy properties
        enemy.speed *= this.difficultyMultiplier;
        enemy.shotCooldown /= this.difficultyMultiplier; // Shoot more frequently
        
        this.enemies.push(enemy);
        
        // Create spawn effect
        if (window.effectsSystem) {
            window.effectsSystem.createExplosion(spawnPos.x, spawnPos.y, '#ff3333', 30);
            
            // Create teleport-in effect
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = enemy.radius * 1.2;
                const particleX = spawnPos.x + Math.cos(angle) * distance;
                const particleY = spawnPos.y + Math.sin(angle) * distance;
                
                window.effectsSystem.createHookTrailEffect(particleX, particleY, '#ff3333');
            }
        }
    }

    // Clear all enemies (for game reset)
    clear() {
        this.enemies = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 3000;
        this.maxEnemies = 10;
        
        // Reset wave system
        this.currentWave = 1;
        this.enemiesPerWave = 5;
        this.enemiesRemainingInWave = this.enemiesPerWave;
        this.waveActive = false;
        this.gameTime = 0;
        this.difficultyMultiplier = 1.0;
    }
}

// The enemy manager will be initialized in the game.js file