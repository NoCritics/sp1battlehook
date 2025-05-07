# Hexagonal Shield Game

A modern, arcade-style browser game with neon visuals, where you defend yourself against waves of enemies using a shield and grappling hook mechanic.

## Game Overview

In this game, you control a hexagonal character that must survive waves of attacking enemies. Use your shield to block incoming projectiles and charge up your invulnerability mode, then use your grappling hook to defeat enemies during invulnerability.

![Game Screenshot](https://placeholder.com/game-screenshot.png)

## How to Play

1. **Movement**: Use WASD keys to move your character
2. **Shield**: Move your mouse to aim your shield and block enemy projectiles
3. **Blocking**: Block projectiles to charge your shield meter
4. **Invulnerability**: When your shield is fully charged, you become invulnerable and can use the grappling hook
5. **Grappling Hook**: During invulnerability, click to shoot your grappling hook at enemies
6. **Wave System**: Survive increasingly difficult waves of enemies

## Game Mechanics

- **Shield Blocking**: Position your shield (blue arc) to block incoming red projectiles
- **Shield Charging**: Each block adds to your shield charge (shown in the UI)
- **Invulnerability Mode**: At full charge, you become invulnerable for 10 seconds
- **Grappling Hook**: During invulnerability, you can pull yourself toward enemies to destroy them
- **Knockback**: Destroying enemies creates a knockback effect that pushes nearby enemies away
- **Wave System**: Enemies come in waves with short breaks between waves
- **Difficulty Scaling**: Both enemy count and enemy speed increases as you progress

## Controls

- **W**: Move up
- **A**: Move left
- **S**: Move down
- **D**: Move right
- **Mouse Movement**: Aim shield
- **Left Mouse Button**: Shoot grappling hook (during invulnerability only)
- **P or ESC**: Pause game
- **G**: Toggle grid display

## Technical Details

The game is built using vanilla JavaScript and HTML5 Canvas, with no external dependencies. It features:

- Smooth animations with delta time-based movement
- Particle effects system
- Collision detection
- Visual neon effects
- Performance optimizations
- Wave-based enemy spawning system

## Development Notes

The game architecture follows these principles:

- **Game Loop**: Handles the main update and draw cycle
- **Entity System**: Player, enemies, projectiles are separate classes
- **Collision System**: Handles various collision types
- **Effects System**: Manages particle effects, explosions, etc.
- **Utils**: Common utility functions for calculations and drawing

## Performance Optimizations

- Delta time-based animations for consistent speed across devices
- Collision caching to reduce redundant calculations
- Efficient particle system with pooling
- Optimized drawing operations with single-path techniques
- Function caching for expensive trigonometric calculations

## Planned Features

- Sound effects and music
- Power-ups and special abilities
- More enemy types with different behaviors
- Boss battles
- Local high score storage

## Credits

Game developed as a vanilla JavaScript exercise, inspired by classic arcade games and modern neon aesthetics.

## License

This project is available under the MIT License. Feel free to use, modify, and distribute as needed.

---

Enjoy the game and try to achieve the highest score by surviving as many waves as possible!
