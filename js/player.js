// Player class and controls

class Player {
    constructor(x, y, mapWidth, mapHeight) {
        this.x = x;
        this.y = y;
        this.radius = 30;
        this.color = '#00aaff'; // Blue with glow
        this.speed = 6.5;
        this.velocity = {
            x: 0,
            y: 0
        };
        this.rotation = 0; // Hexagon rotation
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        
        // Shield properties
        this.shieldAngle = 0;
        this.shieldDistance = this.radius * 1.2; // Gap between player and shield
        this.shieldWidth = this.radius * 1.5;
        this.shieldThickness = this.radius * 0.4;
        this.shieldCharge = 0;
        this.maxShieldCharge = 6;
        
        // Invulnerability
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        this.invulnerabilityDuration = 10000; // 10 seconds
        
        // Hook properties
        this.hook = null;
        this.isHookActive = false;
        
        // Input tracking
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        this.mousePosition = {
            x: 0,
            y: 0
        };
        
        // Stats
        this.score = 0;
        this.isAlive = true;
    }

    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = true;
            }
        });
        
        window.addEventListener('keyup', e => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = false;
            }
        });
        
        // Mouse events
        window.addEventListener('mousemove', e => {
            // Calculate mouse position relative to canvas
            const canvas = document.getElementById('gameCanvas');
            const rect = canvas.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left;
            this.mousePosition.y = e.clientY - rect.top;
        });
        
        window.addEventListener('mousedown', e => {
            // Left click to fire hook when invulnerable
            if (e.button === 0 && this.isInvulnerable && !this.isHookActive) {
                this.fireHook();
            }
        });
        
        window.addEventListener('mouseup', e => {
            // Release hook
            if (e.button === 0 && this.isHookActive) {
                this.cancelHook();
            }
        });
    }

    update(currentTime, enemies, deltaTime = 0.016) {
        if (!this.isAlive) return;
        
        // Scale movement with delta time for consistent speed
        const timeScale = deltaTime * 60; // Normalize to 60fps
        
        // Handle movement
        const inputVector = { x: 0, y: 0 };
        
        if (this.keys.w) inputVector.y -= 1;
        if (this.keys.s) inputVector.y += 1;
        if (this.keys.a) inputVector.x -= 1;
        if (this.keys.d) inputVector.x += 1;
        
        // Normalize input vector if moving diagonally
        const inputLength = Math.sqrt(inputVector.x * inputVector.x + inputVector.y * inputVector.y);
        if (inputLength > 0) {
            inputVector.x /= inputLength;
            inputVector.y /= inputLength;
        }
        
        // Apply input to velocity - with SAFETY CHECK for null hook
        if (this.hook && this.isHookActive && this.hook.state === 'pulling') {
            // If being pulled by hook, override normal movement
            const pullAngle = angleBetweenPoints(this.x, this.y, this.hook.x, this.hook.y);
            this.velocity.x = Math.cos(pullAngle) * this.speed * 2.5; // Faster when pulling
            this.velocity.y = Math.sin(pullAngle) * this.speed * 2.5;
        } else {
            // Normal movement
            this.velocity.x = inputVector.x * this.speed;
            this.velocity.y = inputVector.y * this.speed;
        }
        
        // Apply velocity with delta time
        this.x += this.velocity.x * timeScale;
        this.y += this.velocity.y * timeScale;
        
        // Keep player within map bounds
        this.x = clamp(this.x, this.radius, this.mapWidth - this.radius);
        this.y = clamp(this.y, this.radius, this.mapHeight - this.radius);
        
        // Rotate hexagon slowly over time for aesthetic (use delta time)
        this.rotation += 0.01 * timeScale;
        
        // Update shield angle based on mouse position
        this.shieldAngle = angleBetweenPoints(this.x, this.y, this.mousePosition.x, this.mousePosition.y);
        
        // Check invulnerability status
        if (this.isInvulnerable) {
            if (currentTime - this.invulnerabilityTime >= this.invulnerabilityDuration) {
                this.isInvulnerable = false;
                
                // If hook is still active, cancel it
                if (this.isHookActive) {
                    this.cancelHook();
                }
                
                // Create deactivation effect
                if (window.effectsSystem) {
                    window.effectsSystem.createExplosion(this.x, this.y, '#ffffff', this.radius * 1.5);
                    window.effectsSystem.createFloatingText(this.x, this.y - this.radius * 2, 'SHIELD MODE', '#ffffff', 20);
                }
            }
            
            // Create invulnerability aura effect
            if (window.effectsSystem) {
                window.effectsSystem.createInvulnerabilityAura(this);
            }
        }
        
        // Update hook if active - WITH MUCH BETTER ERROR HANDLING
        if (this.isHookActive && this.hook) {
            try {
                // Save the hook's previous position before updating
                const prevX = this.hook.x;
                const prevY = this.hook.y;
                
                // Update hook position
                this.hook.update(this, deltaTime);
                
                // Check for hook collision with enemies
                if (this.hook.state === 'extending') {
                    // IMPROVED: Use a sweeping collision test for fast-moving hooks
                    // This ensures we don't miss enemies between frames
                    
                    // Calculate distance moved in this frame
                    const movedX = this.hook.x - prevX;
                    const movedY = this.hook.y - prevY;
                    const distMoved = Math.sqrt(movedX * movedX + movedY * movedY);
                    
                    // For each enemy, check collision along the hook's path
                    for (let i = 0; i < enemies.length; i++) {
                        // First check direct hit with current position (still needed for slow-moving hooks)
                        if (collisionSystem.hookHitsEnemy(this.hook, enemies[i])) {
                            this.hook.hit(enemies[i]);
                            break;
                        }
                        
                        // If hook moved significantly, do a sweeping collision test
                        if (distMoved > enemies[i].radius) {
                            // Check if hook trajectory intersects with enemy
                            // Calculate closest point on the trajectory line to the enemy center
                            const t = ((enemies[i].x - prevX) * movedX + (enemies[i].y - prevY) * movedY) / 
                                    (movedX * movedX + movedY * movedY);
                            
                            // Clamp t to the range [0, 1] to stay on the line segment
                            const clampedT = Math.max(0, Math.min(1, t));
                            
                            // Calculate closest point
                            const closestX = prevX + clampedT * movedX;
                            const closestY = prevY + clampedT * movedY;
                            
                            // Calculate distance from enemy center to the closest point
                            const dist = distance(enemies[i].x, enemies[i].y, closestX, closestY);
                            
                            // If distance is less than the sum of radii, we have a hit
                            if (dist <= this.hook.hitboxRadius + enemies[i].radius) {
                                this.hook.hit(enemies[i]);
                                break;
                            }
                            
                            // Also check if hook passed close to enemy by comparing distance moved to enemy radius
                            // This handles very fast hooks that might skip over enemies entirely
                            if (dist < enemies[i].radius * 2) {
                                // Do an additional check to make sure we're actually getting closer to the enemy
                                // Calculate distance from the enemy to both the start and end points
                                const distStart = distance(enemies[i].x, enemies[i].y, prevX, prevY);
                                const distEnd = distance(enemies[i].x, enemies[i].y, this.hook.x, this.hook.y);
                                
                                // If we're getting closer then further, the hook passed by the enemy
                                if (distStart > dist && distEnd > dist) {
                                    this.hook.hit(enemies[i]);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Check if player has reached a hooked enemy
                if (this.hook.state === 'pulling' && this.hook.hitEnemy) {
                    // Safety check if enemy still exists and is active
                    if (!this.hook.hitEnemy || !this.hook.hitEnemy.active) {
                        this.hook.hitEnemy = null;
                        this.hook.state = 'retracting';
                        return;
                    }
                    
                    const dist = distance(this.x, this.y, this.hook.hitEnemy.x, this.hook.hitEnemy.y);
                    if (dist <= this.radius + this.hook.hitEnemy.radius) {
                        // Capture enemy position before destroying it
                        const enemyX = this.hook.hitEnemy.x;
                        const enemyY = this.hook.hitEnemy.y;
                        const enemyRadius = this.hook.hitEnemy.radius;
                        
                        // Destroy the enemy
                        const hitEnemy = this.hook.hitEnemy;
                        hitEnemy.takeDamage();
                        this.score++;
                        
                        // Clear the enemy reference before anything else
                        this.hook.hitEnemy = null;
                        
                        // Create death effect
                        if (window.effectsSystem) {
                            window.effectsSystem.createEnemyDeathEffect({
                                x: enemyX,
                                y: enemyY,
                                radius: enemyRadius
                            });
                            
                            // Show score popup
                            window.effectsSystem.createFloatingText(
                                enemyX, 
                                enemyY, 
                                '+1', 
                                '#ffffff', 
                                24
                            );
                        }
                        
                        // Apply knockback to nearby enemies with stronger effect
                        if (collisionSystem) {
                            const knockbackApplied = collisionSystem.applyKnockback(
                                enemyX, 
                                enemyY, 
                                enemies, 
                                250, // Increased knockback radius from 150
                                30   // Increased knockback force from 20
                            );
                            
                            // Trigger screen shake if knockback was applied
                            if (knockbackApplied && window.game) {
                                window.game.startScreenShake(600, 30); // Increased screen shake effect for more impact
                            }
                        }
                        
                        // Reset hook
                        this.cancelHook();
                    }
                }
                
                // Check if hook has returned or is idle
                if (this.hook && this.hook.state === 'idle') {
                    this.isHookActive = false;
                    this.hook = null;
                }
            } catch (error) {
                // Error recovery - if something goes wrong, just reset the hook state
                console.error("Error in hook logic:", error);
                this.isHookActive = false;
                this.hook = null;
            }
        }
    }

    draw(ctx) {
        if (!this.isAlive) return;
        
        // Apply glow effect
        createNeonEffect(ctx, this.color, 15);
        
        // Create a pulsing effect for the player
        const pulseTime = performance.now() / 500;
        const pulseFactor = 0.1 * Math.sin(pulseTime) + 1.0;
        const pulseRadius = this.radius * pulseFactor;
        
        // Draw player (hexagon) with pulse effect
        drawHexagon(ctx, this.x, this.y, pulseRadius, this.rotation);
        
        // Create gradient fill for hexagon
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, pulseRadius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.6, this.color);
        gradient.addColorStop(1, '#0080cc');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Inner glow with pulse effect
        drawHexagon(ctx, this.x, this.y, pulseRadius * 0.7, this.rotation);
        ctx.fillStyle = '#88ddff';
        ctx.fill();
        
        // Draw energy core
        drawHexagon(ctx, this.x, this.y, pulseRadius * 0.3, this.rotation * 1.5); // Rotate inner core faster
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Draw smiley face if not invulnerable, otherwise draw energy pattern
        if (!this.isInvulnerable) {
            drawSmileyFace(ctx, this.x, this.y, pulseRadius * 0.5);
        } else {
            // Draw energy pattern when invulnerable - small glowing orbs rotating around center
            const orbCount = 6;
            const orbRadius = pulseRadius * 0.15;
            const orbDistance = pulseRadius * 0.35;
            
            for (let i = 0; i < orbCount; i++) {
                const orbAngle = (i / orbCount) * Math.PI * 2 + performance.now() / 500;
                const orbX = this.x + Math.cos(orbAngle) * orbDistance;
                const orbY = this.y + Math.sin(orbAngle) * orbDistance;
                
                ctx.beginPath();
                ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                
                // Add connecting lines between orbs
                const nextI = (i + 1) % orbCount;
                const nextAngle = (nextI / orbCount) * Math.PI * 2 + performance.now() / 500;
                const nextX = this.x + Math.cos(nextAngle) * orbDistance;
                const nextY = this.y + Math.sin(nextAngle) * orbDistance;
                
                ctx.beginPath();
                ctx.moveTo(orbX, orbY);
                ctx.lineTo(nextX, nextY);
                ctx.strokeStyle = '#88ddff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        
        // Draw shield if not in hook mode
        if (!this.isInvulnerable) {
            this.drawShield(ctx);
        } else if (!this.isHookActive) {
            // Draw hook direction indicator when invulnerable and hook is not active
            this.drawHookIndicator(ctx);
        }
        
        // Draw hook if active
        if (this.isHookActive && this.hook) {
            this.hook.draw(ctx);
        }
        
        // Clear glow effect
        clearNeonEffect(ctx);
    }

    drawHookIndicator(ctx) {
        // Get angle to mouse position
        const angle = angleBetweenPoints(this.x, this.y, this.mousePosition.x, this.mousePosition.y);
        
        // Calculate end point of the indicator
        const indicatorLength = this.radius * 1.5; // Length of the hook direction indicator (shortened by 2x)
        const endX = this.x + Math.cos(angle) * indicatorLength;
        const endY = this.y + Math.sin(angle) * indicatorLength;
        
        // Draw pulsing hook indicator
        const time = performance.now() / 300; // Using time for pulse effect
        const pulseScale = 1 + 0.3 * Math.sin(time); // Increased pulse effect
        
        // Calculate remaining invulnerability time
        const remainingTime = Math.ceil((this.invulnerabilityTime + this.invulnerabilityDuration - performance.now()) / 1000);
        const timeRatio = remainingTime / (this.invulnerabilityDuration / 1000);
        
        // Color changes based on remaining time
        const hookColor = timeRatio < 0.3 ? '#ff5500' : '#00aaff';
        
        // Draw energy field around player
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.3 * pulseScale, 0, Math.PI * 2);
        createNeonEffect(ctx, hookColor, 15 * pulseScale);
        ctx.strokeStyle = hookColor;
        ctx.lineWidth = 2 * pulseScale;
        ctx.stroke();
        
        // Draw arrow line with gradient
        const gradient = ctx.createLinearGradient(this.x, this.y, endX, endY);
        gradient.addColorStop(0, hookColor);
        gradient.addColorStop(1, '#ffffff');
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4 * pulseScale;
        createNeonEffect(ctx, hookColor, 15 * pulseScale);
        ctx.stroke();
        
        // Draw arrowhead with enhanced glow
        const arrowSize = 12 * pulseScale;
        const arrowAngle = Math.PI / 6; // 30 degrees
        
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle - arrowAngle),
            endY - arrowSize * Math.sin(angle - arrowAngle)
        );
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle + arrowAngle),
            endY - arrowSize * Math.sin(angle + arrowAngle)
        );
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Draw hook icon at the end with pulsing effect
        ctx.beginPath();
        ctx.arc(endX, endY, 10 * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = hookColor;
        ctx.fill();
        
        // Inner glow for hook icon
        ctx.beginPath();
        ctx.arc(endX, endY, 5 * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Add "CLICK TO HOOK" text near the cursor with shadow for better visibility
        const labelText = remainingTime < 3 ? 'HOOK ENDING SOON!' : 'CLICK TO HOOK';
        const labelColor = remainingTime < 3 ? '#ff5500' : '#ffffff';
        
        ctx.font = `bold ${16 * pulseScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw text shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(labelText, endX + 2, endY - 20 + 2);
        
        // Draw main text
        ctx.fillStyle = labelColor;
        ctx.fillText(labelText, endX, endY - 20);
        
        // Add remaining time counter
        ctx.font = `bold ${14 * pulseScale}px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${remainingTime}s`, endX, endY + 20);
        
        clearNeonEffect(ctx);
    }

    drawShield(ctx) {
        // Don't draw shield when invulnerable
        if (this.isInvulnerable) return;
        
        // Calculate shield position
        const shieldX = this.x + Math.cos(this.shieldAngle) * this.shieldDistance;
        const shieldY = this.y + Math.sin(this.shieldAngle) * this.shieldDistance;
        
        // Shield properties
        const shieldArc = Math.PI / 2; // 90 degrees (one side + partial coverage)
        
        // Apply shield glow
        let shieldColor = this.color;
        
        // If shield has charge, make it brighter
        if (this.shieldCharge > 0) {
            const chargeRatio = this.shieldCharge / this.maxShieldCharge;
            shieldColor = `rgba(${100 + 155 * chargeRatio}, ${155 + 100 * chargeRatio}, 255, 1)`;
        }
        
        // Create pulsing effect for the shield
        const pulseTime = performance.now() / 200;
        const pulseFactor = 0.2 * Math.sin(pulseTime) + 1.0;
        const pulseAmount = 10 + this.shieldCharge + (5 * pulseFactor);
        
        createNeonEffect(ctx, shieldColor, pulseAmount);
        
        // Draw shield arc
        ctx.beginPath();
        ctx.arc(
            this.x, 
            this.y, 
            this.shieldDistance + this.shieldThickness / 2, 
            this.shieldAngle - shieldArc / 2, 
            this.shieldAngle + shieldArc / 2
        );
        ctx.lineWidth = this.shieldThickness * pulseFactor;
        ctx.strokeStyle = shieldColor;
        ctx.stroke();
        
        // Draw charge indicator on shield
        if (this.shieldCharge > 0) {
            const chargeRatio = this.shieldCharge / this.maxShieldCharge;
            
            // Draw charge fill with gradient
            const gradient = ctx.createLinearGradient(
                this.x + Math.cos(this.shieldAngle - shieldArc / 2) * this.shieldDistance,
                this.y + Math.sin(this.shieldAngle - shieldArc / 2) * this.shieldDistance,
                this.x + Math.cos(this.shieldAngle - shieldArc / 2 + shieldArc * chargeRatio) * this.shieldDistance, 
                this.y + Math.sin(this.shieldAngle - shieldArc / 2 + shieldArc * chargeRatio) * this.shieldDistance
            );
            
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#88ddff');
            
            ctx.beginPath();
            ctx.arc(
                this.x, 
                this.y, 
                this.shieldDistance + this.shieldThickness / 2, 
                this.shieldAngle - shieldArc / 2, 
                this.shieldAngle - shieldArc / 2 + shieldArc * chargeRatio
            );
            ctx.lineWidth = this.shieldThickness * pulseFactor * 1.2; // Slightly larger than base shield
            ctx.strokeStyle = gradient;
            ctx.stroke();
            
            // Add charge indicator text
            const textAngle = this.shieldAngle;
            const textDistance = this.shieldDistance + this.shieldThickness + 15;
            const textX = this.x + Math.cos(textAngle) * textDistance;
            const textY = this.y + Math.sin(textAngle) * textDistance;
            
            // Only show if more than 10% charged
            if (chargeRatio > 0.1) {
                ctx.save();
                ctx.translate(textX, textY);
                ctx.rotate(textAngle + Math.PI/2);
                
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${this.shieldCharge}/${this.maxShieldCharge}`, 0, 0);
                
                ctx.restore();
            }
        }
        
        // Add some particles around shield for visual effect
        if (window.effectsSystem && Math.random() < 0.1) {
            const particleAngle = this.shieldAngle + randomRange(-shieldArc/2, shieldArc/2);
            const particleDistance = this.shieldDistance + randomRange(-this.shieldThickness/2, this.shieldThickness/2);
            const particleX = this.x + Math.cos(particleAngle) * particleDistance;
            const particleY = this.y + Math.sin(particleAngle) * particleDistance;
            
            window.effectsSystem.createHookTrailEffect(particleX, particleY, shieldColor);
        }
        
        clearNeonEffect(ctx);
    }

    blockProjectile(projectile) {
        // Increment shield charge
        this.shieldCharge++;
        
        // Create shield block effect
        if (window.effectsSystem) {
            window.effectsSystem.createShieldBlockEffect(
                projectile.x, 
                projectile.y,
                projectile.angle
            );
            
            // Show charge gain message with dynamic color based on charge level
            const chargeRatio = this.shieldCharge / this.maxShieldCharge;
            const chargeColor = chargeRatio > 0.8 ? '#ffffff' : 
                               chargeRatio > 0.5 ? '#bbffff' : '#88ddff';
            
            // Show different messages based on charge level
            let message = `+1 Shield`;
            if (chargeRatio > 0.9) {
                message = 'SHIELD READY!';
            } else if (chargeRatio > 0.6) {
                message = `ALMOST READY! ${this.shieldCharge}/${this.maxShieldCharge}`;
            }
            
            window.effectsSystem.createFloatingText(
                projectile.x, 
                projectile.y, 
                message, 
                chargeColor, 
                chargeRatio > 0.8 ? 20 : 16
            );
            
            // Add some particles in player direction
            const angle = angleBetweenPoints(projectile.x, projectile.y, this.x, this.y);
            for (let i = 0; i < 5; i++) {
                const spreadAngle = angle + randomRange(-0.3, 0.3);
                const distance = randomRange(10, 30);
                const particleX = projectile.x + Math.cos(spreadAngle) * distance;
                const particleY = projectile.y + Math.sin(spreadAngle) * distance;
                
                window.effectsSystem.createHookTrailEffect(particleX, particleY, chargeColor);
            }
        }
        
        // Check if shield is fully charged
        if (this.shieldCharge >= this.maxShieldCharge) {
            this.activateInvulnerability();
        }
    }

    activateInvulnerability() {
        this.isInvulnerable = true;
        this.shieldCharge = 0;
        this.invulnerabilityTime = performance.now();
        
        if (window.effectsSystem) {
            // Create larger, more dramatic activation effect
            window.effectsSystem.createExplosion(this.x, this.y, '#00aaff', this.radius * 5);
            
            // Add secondary explosion for more impact
            setTimeout(() => {
                if (window.effectsSystem) {
                    window.effectsSystem.createExplosion(this.x, this.y, '#ffffff', this.radius * 3);
                }
            }, 150);
            
            // Create particles bursting outward
            const particleCount = 40;
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const speed = 5 + Math.random() * 3;
                const distance = this.radius * 1.2;
                
                const particleX = this.x + Math.cos(angle) * distance;
                const particleY = this.y + Math.sin(angle) * distance;
                
                window.effectsSystem.particles.push({
                    x: particleX,
                    y: particleY,
                    radius: randomRange(3, 6),
                    color: i % 2 === 0 ? '#00aaff' : '#ffffff',
                    velocity: {
                        x: Math.cos(angle) * speed,
                        y: Math.sin(angle) * speed
                    },
                    life: randomRange(30, 60),
                    maxLife: 60,
                    draw() {
                        const alpha = this.life / this.maxLife;
                        window.effectsSystem.ctx.globalAlpha = alpha;
                        createNeonEffect(window.effectsSystem.ctx, this.color, 15 * alpha);
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
            
            // Show activation message
            window.effectsSystem.createFloatingText(
                this.x, 
                this.y - this.radius * 2, 
                'INVULNERABLE!', 
                '#ffffff', 
                30
            );
            
            // Add screen shake effect
            if (window.game) {
                window.game.startScreenShake(500, 20);
            }
            
            // Add a secondary smaller message
            setTimeout(() => {
                if (window.effectsSystem) {
                    window.effectsSystem.createFloatingText(
                        this.x, 
                        this.y - this.radius, 
                        'HOOK MODE ACTIVATED', 
                        '#88ddff', 
                        18
                    );
                }
            }, 300);
        }
        
        // Play sound effect (placeholder for future audio implementation)
        // this.playSound('invulnerability_activate');
    }

    fireHook() {
        if (!this.isInvulnerable || this.isHookActive) return;
        
        // Create new hook
        this.hook = new GrapplingHook(
            this.x, 
            this.y, 
            this.mousePosition.x, 
            this.mousePosition.y
        );
        
        this.isHookActive = true;
    }

    cancelHook() {
        if (!this.isHookActive) return;
        
        if (this.hook && this.hook.state === 'extending') {
            this.hook.cancel();
        } else {
            this.isHookActive = false;
            this.hook = null;
        }
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = { x: 0, y: 0 };
        this.rotation = 0;
        this.shieldCharge = 0;
        this.isInvulnerable = false;
        this.isHookActive = false;
        this.hook = null;
        this.score = 0;
        this.isAlive = true;
        
        // Don't trigger death effects during reset
        this.skipDeathAnimation = true;
        // Clear the flag after a short delay to allow for any pending game logic to complete
        setTimeout(() => {
            this.skipDeathAnimation = false;
        }, 100);
    }

    die() {
        if (!this.isAlive || this.skipDeathAnimation) return;
        
        this.isAlive = false;
        
        // Create death effect
        if (window.effectsSystem) {
            // Create multiple explosion waves with more particles and visual impact
            window.effectsSystem.createExplosion(this.x, this.y, '#00aaff', this.radius * 6);
            
            // Create player fragments
            const fragmentCount = 6; // One for each hexagon point
            for (let i = 0; i < fragmentCount; i++) {
                const angle = (i / fragmentCount) * Math.PI * 2;
                const distance = this.radius * 0.5;
                const fragmentX = this.x + Math.cos(angle) * distance;
                const fragmentY = this.y + Math.sin(angle) * distance;
                const fragmentSpeed = 3 + Math.random() * 2;
                const fragmentSize = this.radius * 0.3;
                const spinSpeed = randomRange(-0.1, 0.1);
                
                // Create fragment particle with rotation
                window.effectsSystem.particles.push({
                    x: fragmentX,
                    y: fragmentY,
                    angle: angle,
                    rotation: 0,
                    spinSpeed: spinSpeed,
                    size: fragmentSize,
                    color: '#00aaff',
                    velocity: {
                        x: Math.cos(angle) * fragmentSpeed,
                        y: Math.sin(angle) * fragmentSpeed
                    },
                    life: randomRange(60, 120),
                    maxLife: 120,
                    draw() {
                        const alpha = this.life / this.maxLife;
                        const ctx = window.effectsSystem.ctx;
                        
                        ctx.save();
                        ctx.translate(this.x, this.y);
                        ctx.rotate(this.rotation);
                        
                        // Draw fragment (small hexagon)
                        ctx.beginPath();
                        for (let j = 0; j < 6; j++) {
                            const fragmentAngle = (j / 6) * Math.PI * 2;
                            const fragmentX = Math.cos(fragmentAngle) * this.size;
                            const fragmentY = Math.sin(fragmentAngle) * this.size;
                            
                            if (j === 0) {
                                ctx.moveTo(fragmentX, fragmentY);
                            } else {
                                ctx.lineTo(fragmentX, fragmentY);
                            }
                        }
                        ctx.closePath();
                        
                        createNeonEffect(ctx, this.color, 10 * alpha);
                        ctx.fillStyle = this.color;
                        ctx.fill();
                        clearNeonEffect(ctx);
                        
                        ctx.restore();
                        ctx.globalAlpha = 1;
                    },
                    update(deltaTime = 0.016) {
                        const timeScale = deltaTime * 60;
                        
                        // Update position with delta time
                        this.x += this.velocity.x * timeScale;
                        this.y += this.velocity.y * timeScale;
                        
                        // Update rotation
                        this.rotation += this.spinSpeed * timeScale;
                        
                        // Update life
                        this.life -= timeScale;
                        
                        // Apply gravity
                        this.velocity.y += 0.05 * timeScale;
                        
                        // Slow down horizontally
                        this.velocity.x *= Math.pow(0.98, timeScale);
                        
                        return this.life > 0;
                    }
                });
            }
            
            // Add delayed secondary explosions for better visual effect
            setTimeout(() => {
                if (window.effectsSystem) {
                    window.effectsSystem.createExplosion(this.x, this.y, '#ffffff', this.radius * 8);
                    
                    // Emit energy particles
                    createParticles(this.x, this.y, '#ffffff', 50, 10, window.effectsSystem.ctx, window.effectsSystem.particles);
                }
            }, 200);
            
            setTimeout(() => {
                if (window.effectsSystem) {
                    window.effectsSystem.createExplosion(this.x, this.y, '#00aaff', this.radius * 10);
                }
            }, 400);
            
            // Create lots of particles with higher speed and more variety
            createParticles(this.x, this.y, this.color, 100, 15, window.effectsSystem.ctx, window.effectsSystem.particles);
            createParticles(this.x, this.y, '#ffffff', 50, 10, window.effectsSystem.ctx, window.effectsSystem.particles);
            
            // Show death message with animation
            window.effectsSystem.createFloatingText(
                this.x, 
                this.y - this.radius * 2, 
                'DESTROYED!', 
                '#ff3333', 
                40
            );
            
            // Add secondary messages
            setTimeout(() => {
                if (window.effectsSystem) {
                    window.effectsSystem.createFloatingText(
                        this.x, 
                        this.y, 
                        'GAME OVER', 
                        '#ffffff', 
                        32
                    );
                }
            }, 500);
        }
        
        // Add screen shake on death - stronger and longer
        if (window.game) {
            window.game.startScreenShake(1500, 40); // Stronger and longer screen shake on death
        }
    }
}

// The player will be initialized in the game.js file