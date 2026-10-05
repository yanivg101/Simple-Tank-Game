import { Position, Wall } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const TANK_WIDTH = 40;
export const TANK_HEIGHT = 40;
export const TANK_SPEED = 3;
export const TANK_ROTATION_SPEED = 0.1;
export const TANK_MAX_HP = 100;

export const BULLET_SPEED = 8;
export const BULLET_DAMAGE = 20;
export const BULLET_RADIUS = 5;
export const SHOOT_COOLDOWN = 300;

export const WALL_WIDTH = 24;
export const WALL_HEIGHT = 24;
export const WALL_HP = 60;
export const FIRE_WALL_HP = 180;

export const POWERUP_RADIUS = 18;
export const POWERUP_DURATION = 10000;
export const POWERUP_LIFETIME = 15000;
export const POWERUP_SPAWN_CHANCE = 0.003;

export const MISSILE_SPEED = 6;
export const MISSILE_DAMAGE = 40;
export const MISSILE_RADIUS = 8;
export const MISSILE_EXPLOSION_RADIUS = 60;
export const MISSILE_COOLDOWN = 10000;
export const MISSILE_LOCK_TIME = 2000;

export const BOUNCE_FIRST_DAMAGE = 0.75;
export const BOUNCE_SECOND_DAMAGE = 0.5;
export const BOUNCE_FIRST_RADIUS = 0.9;
export const BOUNCE_SECOND_RADIUS = 0.8;

export const GAME_DURATION = 180000;
export const SURVIVAL_DURATION = 60000;
export const RESPAWN_DELAY = 2000;

export const COLORS = {
  player: '#4CAF50',
  playerDark: '#388E3C',
  ai: '#F44336',
  aiDark: '#D32F2F',
  bullet: '#FFD700',
  wall: '#757575',
  wallDamaged: '#5D4037',
  wallBorder: '#424242',
  wallIndestructible: '#4A4A6A',
  wallIndestructibleBorder: '#2A2A4A',
  powerUpHealth: '#22C55E',
  powerUpSpeed: '#3B82F6',
  powerUpRapidFire: '#F59E0B',
  powerUpShield: '#8B5CF6',
  powerUpSlow: '#EF4444',
  powerUpConfuse: '#EC4899',
  powerUpMissile: '#FF6B6B',
  powerUpBounce: '#06B6D4',
  background: '#1a1a2e',
  grid: '#16213e',
  text: '#FFFFFF',
  hud: 'rgba(0, 0, 0, 0.7)',
};

interface Map {
  name: string;
  walls: Omit<Wall, 'id'>[];
  playerSpawn: Position;
  aiSpawn: Position;
  isRandom?: boolean;
}

function generateRandomWalls(): Omit<Wall, 'id'>[] {
  const walls: Omit<Wall, 'id'>[] = [];
  const gridSize = 50;
  
  const specialZone1 = { xMin: 50, xMax: 150, yMin: 50, yMax: 150 };
  const specialZone2 = { xMin: 650, xMax: 750, yMin: 450, yMax: 550 };
  
  for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
      if (Math.random() < 0.15) {
        const inSpawnZone = (
          (x >= specialZone1.xMin && x <= specialZone1.xMax && y >= specialZone1.yMin && y <= specialZone1.yMax) ||
          (x >= specialZone2.xMin && x <= specialZone2.xMax && y >= specialZone2.yMin && y <= specialZone2.yMax)
        );
        
        if (!inSpawnZone) {
          const rand = Math.random();
          const isDestructible = rand > 0.15;
          const requiresFire = !isDestructible && rand > 0.08;
          const isIndestructible = rand < 0.08;
          
          walls.push({
            position: { x, y },
            width: WALL_WIDTH,
            height: WALL_HEIGHT,
            hp: isIndestructible ? WALL_HP * 999 : requiresFire ? FIRE_WALL_HP : WALL_HP,
            maxHp: isIndestructible ? WALL_HP * 999 : requiresFire ? FIRE_WALL_HP : WALL_HP,
            isDestructible: isDestructible,
            requiresFirePowerUp: requiresFire,
          });
        }
      }
    }
  }
  
  return walls;
}

export const MAPS: Map[] = [
  {
    name: 'Open Arena',
    playerSpawn: { x: 100, y: 100 },
    aiSpawn: { x: 700, y: 500 },
    walls: [
      { position: { x: 400, y: 300 }, width: 24, height: 100, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 200, y: 200 }, width: 60, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 600, y: 400 }, width: 60, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 350, y: 150 }, width: 24, height: 24, hp: WALL_HP * 999, maxHp: WALL_HP * 999, isDestructible: false, requiresFirePowerUp: false },
      { position: { x: 450, y: 400 }, width: 24, height: 24, hp: WALL_HP * 999, maxHp: WALL_HP * 999, isDestructible: false, requiresFirePowerUp: false },
      { position: { x: 250, y: 450 }, width: 100, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 550, y: 200 }, width: 100, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
    ],
  },
  {
    name: 'Maze',
    playerSpawn: { x: 60, y: 60 },
    aiSpawn: { x: 700, y: 500 },
    walls: [
      { position: { x: 150, y: 0 }, width: 24, height: 200, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 150, y: 280 }, width: 24, height: 320, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 300, y: 100 }, width: 24, height: 300, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 300, y: 480 }, width: 24, height: 120, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 450, y: 0 }, width: 24, height: 250, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 450, y: 330 }, width: 24, height: 270, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 600, y: 100 }, width: 24, height: 200, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 600, y: 380 }, width: 24, height: 220, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 225, y: 250 }, width: 24, height: 24, hp: WALL_HP * 999, maxHp: WALL_HP * 999, isDestructible: false, requiresFirePowerUp: false },
      { position: { x: 375, y: 350 }, width: 24, height: 24, hp: WALL_HP * 999, maxHp: WALL_HP * 999, isDestructible: false, requiresFirePowerUp: false },
      { position: { x: 525, y: 250 }, width: 24, height: 24, hp: WALL_HP * 999, maxHp: WALL_HP * 999, isDestructible: false, requiresFirePowerUp: false },
    ],
  },
  {
    name: 'Fortress',
    playerSpawn: { x: 100, y: 300 },
    aiSpawn: { x: 700, y: 300 },
    walls: [
      { position: { x: 380, y: 250 }, width: 24, height: 100, hp: WALL_HP * 999, maxHp: WALL_HP * 999, isDestructible: false, requiresFirePowerUp: false },
      { position: { x: 200, y: 150 }, width: 100, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 200, y: 415 }, width: 100, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 500, y: 150 }, width: 100, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 500, y: 415 }, width: 100, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 350, y: 100 }, width: 80, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 350, y: 460 }, width: 80, height: 24, hp: WALL_HP, maxHp: WALL_HP, isDestructible: true, requiresFirePowerUp: false },
      { position: { x: 150, y: 250 }, width: 24, height: 24, hp: WALL_HP * 999, maxHp: WALL_HP * 999, isDestructible: false, requiresFirePowerUp: false },
      { position: { x: 620, y: 250 }, width: 24, height: 24, hp: WALL_HP * 999, maxHp: WALL_HP * 999, isDestructible: false, requiresFirePowerUp: false },
    ],
  },
  {
    name: 'Chaos',
    playerSpawn: { x: 100, y: 300 },
    aiSpawn: { x: 700, y: 300 },
    walls: generateRandomWalls(),
    isRandom: true,
  },
];
