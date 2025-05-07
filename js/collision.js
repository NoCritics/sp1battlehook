// Collision detection system

class CollisionSystem {
    constructor() {
        // Cache for recent collision checks to improve performance
        this.collisionCache = new Map();
        this.cacheTimeout = 100; // ms before invalidating cache
        this.lastCacheClear = 0;
        
        // Pre-compute frequently used values
        this.sqrt3 = Math.sqrt(3);
        
        // Debug mode for collision visualization
        this.debug = false;
    }

    // Update method to be called each frame
    update(currentTime) {
        // Clear collision cache periodically
        if (currentTime - this.lastCacheClear > this.cacheTimeout) {
            this.collisionCache.clear();
            this.lastCacheClear = currentTime;
        }
    }
    
    // Debug drawing for collision areas
    drawDebug(ctx) {
        if (!this.debug) return;
        
        // Nothing to draw if no debug mode
    }

    // Optimized collision detection using a cache
    circleCollision(x1, y1, r1, x2, y2, r2) {
        // Quick rejection test - if objects are far apart, return false immediately
        // This avoids expensive calculations and key generation for definite misses
        const dx = x2 - x1;
        const dy = y2 - y1;
        const minDist = r1 + r2;
        
        // Square comparison is faster than using sqrt for distance
        if (dx * dx + dy * dy > minDist * minDist) {
            return false;
        }
        
        // For likely hits, create a unique key for this collision pair
        // Round to integers to increase cache hits (minor approximation)
        const key = `${Math.floor(x1)},${Math.floor(y1)},${r1},${Math.floor(x2)},${Math.floor(y2)},${r2}`;
        
        // Check if result is in cache
        if (this.collisionCache.has(key)) {
            return this.collisionCache.get(key);
        }
        
        // Calculate exact collision
        const dist = Math.sqrt(dx * dx + dy * dy); // Only do sqrt here when necessary
        const result = dist < minDist;
        
        // Cache the result
        this.collisionCache.set(key, result);
        
        return result;
    }

    // Check if a point is inside a circle (optimized)
    pointInCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        // Square comparison is faster than using sqrt
        return (dx * dx + dy * dy) <= (radius * radius);
    }

    // Check if a point is inside a hexagon
    pointInHexagon(px, py, hx, hy, radius, rotation) {
        // Transform point to hexagon's local coordinate system
        const dx = px - hx;
        const dy = py - hy;
        
        // Rotate point around hexagon center
        const rotatedX = dx * Math.cos(-rotation) - dy * Math.sin(-rotation);
        const rotatedY = dx * Math.sin(-rotation) + dy * Math.cos(-rotation);
        
        // Check if point is inside hexagon
        const q = (this.sqrt3 * rotatedX) / 3;
        const r = ((-rotatedX / 3) + (this.sqrt3 * rotatedY) / 3);
        
        // Calculate Manhattan distance in hexagon coordinates
        const hexDist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
        return hexDist <= radius / 2;
    }

    // Check if a point is behind the shield (safe from projectiles)
    isPointBehindShield(px, py, player, shieldAngle, shieldArc) {
        // Get angle between player and point
        const pointAngle = angleBetweenPoints(player.x, player.y, px, py);
        
        // Calculate angle difference, accounting for the circular nature of angles
        let angleDiff = Math.abs(pointAngle - shieldAngle);
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }
        
        // Point is behind shield if angle difference is within half the shield arc
        return angleDiff <= shieldArc / 2;
    }

    // Check if projectile hits shield with smoother detection
    projectileHitsShield(projectile, player) {
        // Don't check shield if player is invulnerable
        if (player.isInvulnerable) return false;
        
        // Shield properties
        const shieldDistance = player.radius * 1.2; // Gap between player and shield
        const shieldAngle = player.shieldAngle;
        const shieldArc = Math.PI / 2; // Shield covers 90 degrees (one side + partial coverage of adjacent sides)
        const shieldWidth = player.radius * 1.5;
        const shieldThickness = player.radius * 0.4;
        
        // Get pulse factor for shield thickness variation
        const pulseTime = performance.now() / 200;
        const pulseFactor = 0.2 * Math.sin(pulseTime) + 1.0;
        const actualThickness = shieldThickness * pulseFactor;
        
        // Shield inner and outer radius with pulsing
        const shieldInnerRadius = player.radius + shieldDistance - actualThickness/2;
        const shieldOuterRadius = shieldInnerRadius + actualThickness;
        
        // Check if projectile is in shield's radial distance
        const distToPlayer = distance(projectile.x, projectile.y, player.x, player.y);
        if (distToPlayer < shieldInnerRadius || distToPlayer > shieldOuterRadius) {
            return false;
        }
        
        // Get angle between player and projectile
        const projectileAngle = angleBetweenPoints(player.x, player.y, projectile.x, projectile.y);
        
        // Calculate angle difference, accounting for the circular nature of angles
        let angleDiff = Math.abs(projectileAngle - shieldAngle);
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }
        
        // Add slight forgiveness to shield angle coverage (makes it slightly easier to block)
        const shieldArcWithForgiveness = shieldArc * 1.1;
        
        // Projectile hits shield if angle difference is within half the shield arc (with forgiveness)
        return angleDiff <= shieldArcWithForgiveness / 2;
    }

    // Check if hook hits enemy with improved hit detection
    hookHitsEnemy(hook, enemy) {
        // IMPROVED: Basic circle collision is now sufficient - no angle check required
        // This allows the hook to hit enemies even when clustered together
        return this.circleCollision(hook.x, hook.y, hook.hitboxRadius, enemy.x, enemy.y, enemy.radius);
        
        /* Original angle-based code removed to fix the hook collision issue
        // If basic collision passes, do a more accurate check
        // Check angle between hook direction and hook-to-enemy direction
        const hookAngle = Math.atan2(hook.targetY - hook.startY, hook.targetX - hook.startX);
        const enemyAngle = Math.atan2(enemy.y - hook.x, enemy.x - hook.x);
        
        // Calculate angle difference
        let angleDiff = Math.abs(hookAngle - enemyAngle);
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }
        
        // Only hit if enemy is mostly in front of the hook
        return angleDiff < Math.PI / 2;
        */
    }

    // Apply knockback effect to nearby enemies - OPTIMIZED FOR PERFORMANCE
    applyKnockback(centerX, centerY, enemies, radius, force) {
        let knockbackApplied = false;
        
        // Skip all calculations if no enemies
        if (enemies.length === 0) return knockbackApplied;
        
        // Optimization: Collect enemies within radius without creating additional objects
        // Uses a quick initial distance estimate to reduce expensive calculations
        const enemiesInRange = [];
        const radiusSquared = radius * radius;
        
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            // Quick distance check using square distance
            const dx = enemy.x - centerX;
            const dy = enemy.y - centerY;
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= radiusSquared) {
                // Only sqrt when necessary
                const dist = Math.sqrt(distSquared);
                if (dist <= radius) {
                    enemiesInRange.push({ enemy, dist });
                    knockbackApplied = true;
                }
            }
        }
        
        // Return early if no enemies in range
        if (enemiesInRange.length === 0) return knockbackApplied;
        
        // Sort enemies by distance to center point (closer enemies first)
        // Only sort if there are multiple enemies
        if (enemiesInRange.length > 1) {
            enemiesInRange.sort((a, b) => a.dist - b.dist);
        }
        
        // Only apply detailed visual effects to the closest enemies
        const maxDetailedEffects = Math.min(3, enemiesInRange.length); // Reduced from 5 to 3
        const shockwaveCreated = false;
        
        for (let i = 0; i < enemiesInRange.length; i++) {
            const { enemy, dist } = enemiesInRange[i];
            
            // Calculate base knockback direction
            const baseAngle = angleBetweenPoints(centerX, centerY, enemy.x, enemy.y);
            
            // Add variation to the angle
            const angleVariation = randomRange(-0.5, 0.5);
            
            // Apply more angle variation to enemies that are closer together
            let extraVariation = 0;
            
            // Check proximity to other enemies to add extra variation
            // Only do this for closer enemies to save performance
            if (i < maxDetailedEffects) {
                for (let j = 0; j < Math.min(3, enemiesInRange.length); j++) {
                    if (i !== j) { // Don't compare with self
                        const otherEnemy = enemiesInRange[j].enemy;
                        const proximity = distance(enemy.x, enemy.y, otherEnemy.x, otherEnemy.y);
                        
                        // If enemies are very close, add more angle variation
                        if (proximity < enemy.radius * 3) {
                            extraVariation += (0.3 * (1 - proximity / (enemy.radius * 3)));
                        }
                    }
                }
            }
            
            // Apply final angle with variation
            const angle = baseAngle + angleVariation + randomRange(-extraVariation, extraVariation);
            
            // Base knockback force with distance falloff
            let knockbackForce = force * (1 - dist / radius); 
            
            // Add variation to the knockback force (±20%)
            knockbackForce *= randomRange(0.8, 1.2);
            
            // Apply knockback force
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            enemy.velocity.x = cosAngle * knockbackForce * 1.5;
            enemy.velocity.y = sinAngle * knockbackForce * 1.5;
            
            // Set knockback state
            enemy.isKnockedBack = true;
            enemy.knockbackDuration = enemy.knockbackMaxDuration;
            
            // Create visual effect for knockback if effectsSystem is available
            if (window.effectsSystem) {
                const isCloseEnemy = (i < maxDetailedEffects);
                
                if (isCloseEnemy) {
                    // Full effects only for closest enemies
                    window.effectsSystem.createExplosion(
                        enemy.x, 
                        enemy.y, 
                        '#ff8800', 
                        enemy.radius * 0.8
                    );
                    
                    // Add trail particles showing knockback direction - reduced count
                    const particleCount = Math.min(3, Math.ceil(5 * (1 - i/maxDetailedEffects)));
                    if (particleCount > 0) {
                        for (let j = 0; j < particleCount; j++) {
                            const offsetX = enemy.x + cosAngle * (enemy.radius * 0.5) * j;
                            const offsetY = enemy.y + sinAngle * (enemy.radius * 0.5) * j;
                            
                            createParticles(
                                offsetX,
                                offsetY,
                                '#ff8800',
                                1, // Reduced particle count
                                2,
                                window.effectsSystem.ctx,
                                window.effectsSystem.particles
                            );
                        }
                    }
                }
                
                // Create a shockwave effect at the center of the knockback - only once
                if (i === 0) {
                    window.effectsSystem.createExplosion(
                        centerX,
                        centerY,
                        '#ffffff',
                        radius * 0.5
                    );
                }
                
                // Add impact line effect - but only for closer enemies
                if (isCloseEnemy) {
                    window.effectsSystem.createEnergyBeam(
                        centerX,
                        centerY,
                        enemy.x,
                        enemy.y,
                        '#ffffff',
                        2,
                        15
                    );
                }
            }
        }
        
        return knockbackApplied;
    }

    // Check if a projectile hits player (and not the shield)
    projectileHitsPlayer(projectile, player) {
        // If player is invulnerable, no hit
        if (player.isInvulnerable) return false;
        
        // Check circle collision first
        if (!this.circleCollision(projectile.x, projectile.y, projectile.radius, 
                                player.x, player.y, player.radius)) {
            return false;
        }
        
        // Then check if projectile is blocked by shield
        if (this.projectileHitsShield(projectile, player)) {
            return false;
        }
        
        // Projectile hits player
        return true;
    }
}

// Global instance
let collisionSystem;