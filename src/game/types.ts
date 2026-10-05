export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface Tank {
  id: string;
  position: Position;
  velocity: Velocity;
  rotation: number;
  barrelRotation: number;
  hp: number;
  maxHp: number;
  speed: number;
  isPlayer: boolean;
  lastShot: number;
  shootCooldown: number;
  width: number;
  height: number;
  activePowerUps: PowerUpEffect[];
  hasMissile: boolean;
  lastMissile?: number;
}

export interface Bullet {
  id: string;
  position: Position;
  velocity: Velocity;
  rotation: number;
  speed: number;
  damage: number;
  ownerId: string;
  isPlayerBullet: boolean;
  radius: number;
  bounces: number;
  maxBounces: number;
  originalDamage: number;
}

export interface Wall {
  id: string;
  position: Position;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  isDestructible: boolean;
  requiresFirePowerUp: boolean;
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  position: Position;
  radius: number;
  spawnTime: number;
}

export type PowerUpType = 'health' | 'speed' | 'rapidFire' | 'shield' | 'slow' | 'confuse' | 'missile' | 'bounce';

export interface PowerUpEffect {
  type: PowerUpType;
  expiresAt: number;
}

export interface Missile {
  id: string;
  position: Position;
  velocity: Velocity;
  rotation: number;
  speed: number;
  damage: number;
  ownerId: string;
  isPlayerMissile: boolean;
  radius: number;
  targetId: string | null;
  spawnTime: number;
}

export interface GameState {
  tanks: Tank[];
  bullets: Bullet[];
  walls: Wall[];
  powerUps: PowerUp[];
  playerScore: number;
  aiScore: number;
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  winner: 'player' | 'ai' | null;
}

export interface Map {
  name: string;
  walls: Omit<Wall, 'id'>[];
  playerSpawn: Position;
  aiSpawn: Position;
}

export interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}
