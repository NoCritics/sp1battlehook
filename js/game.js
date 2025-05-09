// Main game file

// Game class
class Game {
    constructor() {
        // Get canvas and context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Make canvas focusable for keyboard events
        this.canvas.tabIndex = 1;
        this.canvas.focus();
        
        // Set canvas size to window size
        this.resizeCanvas();
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.isPlayerDead = false; // Track if player is dead but animation is still playing
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.lastFrameTime = 0; // For delta time calculations
        this.fpsHistory = []; // For FPS tracking
        this.showGrid = true; // Toggle grid display
        
        // Screen shake effect
        this.screenShake = {
            duration: 0,
            intensity: 0,
            offsetX: 0,
            offsetY: 0,
            decay: 0.9 // Exponential decay for more natural screen shake
        };
        
        // Game objects
        this.player = null;
        this.enemyManager = null;
        this.projectiles = [];
        
        // Systems
        collisionSystem = new CollisionSystem();
        effectsSystem = new EffectsSystem(this.ctx);
        
        // Make effectsSystem available globally
        window.effectsSystem = effectsSystem;
        
        // Bind event listeners
        window.addEventListener('resize', () => this.resizeCanvas());
        document.getElementById('restart-button').addEventListener('click', () => this.restart());
        
        // Toggle grid with G key
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'g') {
                this.showGrid = !this.showGrid;
            }
            // Pause with ESC or P
            if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
                this.togglePause();
            }
        });
        
        // Initialize
        this.init();
    }

    // New method for pausing
    togglePause() {
        if (this.isPlayerDead) return; // Don't pause when game is over
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            // Draw pause screen once
            this.drawPauseScreen();
        }
    }
    
    // Draw pause overlay
    drawPauseScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Pause text
        this.ctx.font = '36px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        createNeonEffect(this.ctx, '#00aaff', 20);
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        // Instructions
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press ESC or P to resume', this.canvas.width / 2, this.canvas.height / 2 + 30);
        clearNeonEffect(this.ctx);
    }

    init() {
        // Create player in the middle of the screen
        this.player = new Player(
            this.canvas.width / 2, 
            this.canvas.height / 2,
            this.canvas.width,
            this.canvas.height
        );
        this.player.setupEventListeners();
        
        // Create enemy manager
        this.enemyManager = new EnemyManager(this.canvas.width, this.canvas.height);
        
        // Clear projectiles
        this.projectiles = [];
        
        // Reset score
        this.score = 0;
        this.updateScoreDisplay();
        
        // Hide game over screen
        document.getElementById('game-over').classList.add('hidden');
        
        // Reset timing variables
        this.lastFrameTime = 0;
        this.isPaused = false;
        
        // Start the game
        this.isRunning = true;
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    resizeCanvas() {
        // Set canvas size to window size with some padding
        const padding = 20;
        this.canvas.width = window.innerWidth - padding * 2;
        this.canvas.height = window.innerHeight - padding * 2;
        
        // Make canvas square
        const minDimension = Math.min(this.canvas.width, this.canvas.height);
        this.canvas.width = minDimension;
        this.canvas.height = minDimension;
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;
        
        // Calculate delta time for smoother animations
        const deltaTime = this.lastFrameTime ? (timestamp - this.lastFrameTime) / 1000 : 0.016;
        this.lastFrameTime = timestamp;
        
        // Track FPS with a rolling average
        const fps = deltaTime ? 1 / deltaTime : 60;
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 60) this.fpsHistory.shift();
        
        // Calculate average FPS
        const avgFps = this.fpsHistory.reduce((sum, value) => sum + value, 0) / this.fpsHistory.length;
        
        // Enable low performance mode if FPS is consistently below threshold
        const lowPerformanceThreshold = 40;
        if (avgFps < lowPerformanceThreshold && effectsSystem) {
            effectsSystem.lowPerformanceMode = true;
            
            // Also reduce grid detail in low performance mode
            this.showGrid = avgFps > 30; // Disable grid below 30 FPS
        } else if (effectsSystem) {
            effectsSystem.lowPerformanceMode = false;
        }
        
        // Cap delta time to prevent physics issues on very slow devices
        const maxDeltaTime = 0.1; // 10 FPS minimum
        const clampedDeltaTime = Math.min(deltaTime, maxDeltaTime);
        
        // Don't update if paused (but still draw)
        if (!this.isPaused) {
            // Clear the canvas only once per frame
            this.clearCanvas();
            
            // Update game objects with clamped delta time
            this.update(timestamp, clampedDeltaTime);
            
            // Draw game objects
            this.draw();
        } else {
            // Still draw when paused but with pause overlay
            this.clearCanvas();
            this.draw();
            this.drawPauseScreen();
        }
        
        // Request next frame
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    update(currentTime, deltaTime) {
        // Update screen shake
        this.updateScreenShake(deltaTime);
        
        // Update player if not dead
        if (!this.isPlayerDead) {
            this.player.update(currentTime, this.enemyManager.enemies, deltaTime);
        }
        
        // Only update enemies and check collisions if player is not dead
        if (!this.isPlayerDead) {
            // Update enemies
            this.enemyManager.update(this.player, currentTime, this.projectiles, deltaTime);
            
            // Update projectiles
            this.updateProjectiles(deltaTime);
            
            // Check collisions
            this.checkCollisions();
        } else {
            // Still update projectiles and effects when player is dead for smooth animation
            this.updateProjectiles(deltaTime);
        }
        
        // Update effects
        effectsSystem.update(deltaTime);
        
        // Update UI
        this.updateUI();
    }

    updateProjectiles(deltaTime) {
        // Batch update projectiles with deltaTime
        // Pre-calculate canvas boundaries to avoid repeated property access
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Use optimized for loop instead of forEach for better performance
        for (let i = 0; i < this.projectiles.length; i++) {
            this.projectiles[i].update(canvasWidth, canvasHeight, deltaTime);
        }
        
        // Remove inactive projectiles
        this.projectiles = this.projectiles.filter(projectile => projectile.active);
    }

    checkCollisions() {
        // Optimize player hit detection
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = this.player.radius;
        const shieldAngle = this.player.shieldAngle;
        
        // Use optimized for loop instead of forEach
        for (let i = 0; i < this.projectiles.length; i++) {
            const projectile = this.projectiles[i];
            
            // Only check enemy projectiles
            if (!projectile.isEnemyProjectile) continue;
            
            // Check shield block first
            if (collisionSystem.projectileHitsShield(projectile, this.player)) {
                this.player.blockProjectile(projectile);
                projectile.active = false;
                continue;
            }
            
            // Check player hit
            if (collisionSystem.projectileHitsPlayer(projectile, this.player)) {
                // Mark player as dead but keep the game running for animation
                this.isPlayerDead = true;
                this.player.die();
                projectile.active = false;
                
                // Delay game over to allow death animation to play
                setTimeout(() => {
                    this.gameOver();
                }, 1500); // 1.5 second delay for death animation
                
                break; // Exit loop early since player is dead
            }
        }
    }

    updateUI() {
        // Update score display
        this.score = this.player.score;
        this.updateScoreDisplay();
        
        // Update shield charge display
        let chargeText = `Shield Charge: ${this.player.shieldCharge}/${this.player.maxShieldCharge}`;
        if (this.player.isInvulnerable) {
            const remainingTime = Math.ceil((this.player.invulnerabilityDuration - 
                (performance.now() - this.player.invulnerabilityTime)) / 1000);
            chargeText = `INVULNERABLE! ${remainingTime}s`;
        }
        document.getElementById('shield-charge').textContent = chargeText;
        
        // Update high score display
        document.getElementById('high-score').textContent = `High Score: ${this.highScore}`;
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }

    draw() {
        // Apply screen shake to canvas context
        if (this.screenShake.duration > 0) {
            this.ctx.save();
            this.ctx.translate(this.screenShake.offsetX, this.screenShake.offsetY);
        }
        
        // Draw game objects in order of visual importance
        
        // Draw effects system background particles first
        if (effectsSystem && effectsSystem.backgroundParticles.length > 0) {
            effectsSystem.backgroundParticles.forEach(particle => particle.draw());
        }
        
        // Batch similar draw operations together
        
        // Draw projectiles - use standard for loop for better performance
        const projectileCount = this.projectiles.length;
        for (let i = 0; i < projectileCount; i++) {
            this.projectiles[i].draw(this.ctx);
        }
        
        // Draw enemies
        this.enemyManager.draw(this.ctx);
        
        // Draw player (always on top of enemies)
        this.player.draw(this.ctx);
        
        // Draw remaining effects (particles, explosions, text)
        if (effectsSystem) {
            // Draw particles
            effectsSystem.particles.forEach(particle => particle.draw());
            
            // Draw explosions
            effectsSystem.explosions.forEach(explosion => explosion.draw());
            
            // Draw floating texts (always on top)
            effectsSystem.floatingTexts.forEach(text => text.draw());
        }
        
        // Restore canvas context after screen shake
        if (this.screenShake.duration > 0) {
            this.ctx.restore();
        }
    }

    clearCanvas() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid for visual reference
        this.drawGrid();
    }

    drawGrid() {
        if (!this.showGrid) return;
        
        // In low performance mode, draw a simpler grid
        const isLowPerformance = effectsSystem && effectsSystem.lowPerformanceMode;
        const gridSize = isLowPerformance ? 100 : 50; // Larger grid cells in low performance mode
        const gridColor = isLowPerformance ? 'rgba(50, 50, 50, 0.2)' : 'rgba(50, 50, 50, 0.3)';
        
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        
        // Optimization: Draw grid with single path
        this.ctx.beginPath();
        
        // Draw vertical lines
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        
        this.ctx.stroke();
    }

    gameOver() {
        this.isRunning = false;
        this.isPlayerDead = false;
        
        // Update high score
        const newHighScore = this.score > this.highScore;
        if (newHighScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
            // Show new high score message
            document.getElementById('new-high-score').classList.remove('hidden');
        } else {
            document.getElementById('new-high-score').classList.add('hidden');
        }
        
        // Create and add verify score button if not already present
        if (!document.getElementById('verify-score-button')) {
            const verifyButton = document.createElement('button');
            verifyButton.id = 'verify-score-button';
            verifyButton.textContent = 'Verify Score with SP1';
            verifyButton.className = 'verify-button';
            verifyButton.addEventListener('click', () => this.verifyScore());
            
            const verificationStatus = document.createElement('div');
            verificationStatus.id = 'verification-status';
            verificationStatus.className = 'hidden';
            
            // Insert buttons into game-over div
            const gameOverElement = document.getElementById('game-over');
            gameOverElement.appendChild(verifyButton);
            gameOverElement.appendChild(verificationStatus);
        }
        
        // Show game over screen
        document.getElementById('final-score').textContent = `Final Score: ${this.score}`;
        document.getElementById('game-over').classList.remove('hidden');
    }

    // New method to verify score with SP1
    verifyScore() {
        // Show verification status
        const verificationStatus = document.getElementById('verification-status');
        verificationStatus.textContent = 'Preparing verification...';
        verificationStatus.classList.remove('hidden');
        
        // Hide verify button to prevent multiple clicks
        document.getElementById('verify-score-button').classList.add('hidden');
        
        // Submit the final score for verification
        submitScoreForVerification(this.score);
    }

    restart() {
        // Reset player
        this.player.reset(this.canvas.width / 2, this.canvas.height / 2);
        
        // Clear enemies
        this.enemyManager.clear();
        
        // Clear projectiles
        this.projectiles = [];
        
        // Hide game over screen
        document.getElementById('game-over').classList.add('hidden');
        
        // Reset score
        this.score = 0;
        this.updateScoreDisplay();
        
        // Reset timing variables
        this.lastFrameTime = 0;
        this.isPaused = false;
        
        // Start the game
        this.isRunning = true;
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    // Screen shake effect methods
    startScreenShake(duration = 300, intensity = 15) {
        this.screenShake.duration = duration;
        this.screenShake.intensity = intensity;
    }
    
    updateScreenShake(deltaTime) {
        if (this.screenShake.duration > 0) {
            // Use delta time for time-based decay instead of frame-based
            this.screenShake.duration -= deltaTime * 1000; 
            
            if (this.screenShake.duration <= 0) {
                this.screenShake.offsetX = 0;
                this.screenShake.offsetY = 0;
            } else {
                // Smoothly decay the intensity for more natural feeling
                const progress = this.screenShake.duration / 300;
                const intensity = this.screenShake.intensity * progress;
                
                // Use perlin noise or smoother random values for less jarring shake
                // We simulate this with a simpler approach that still feels smoother
                this.screenShake.offsetX = lerp(
                    this.screenShake.offsetX, 
                    (Math.random() * 2 - 1) * intensity, 
                    this.screenShake.decay * deltaTime * 10
                );
                this.screenShake.offsetY = lerp(
                    this.screenShake.offsetY, 
                    (Math.random() * 2 - 1) * intensity, 
                    this.screenShake.decay * deltaTime * 10
                );
            }
        }
    }
}

// Start the game when page is loaded
window.addEventListener('load', () => {
    window.game = new Game();
});