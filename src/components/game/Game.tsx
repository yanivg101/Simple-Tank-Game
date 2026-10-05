'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  checkTankWallCollision,
  checkBulletWallCollision,
  checkBulletTankCollision,
  checkTankPowerUpCollision,
} from '@/hooks/useCollision';
import { getAIDecision, clampPosition } from '@/game/ai/tankAI';
import { drawTank, drawBullet, drawWall, drawPowerUp, drawExplosion, drawMissile, drawSpawnBase } from '@/game/rendering';
import { soundManager } from '@/game/sound';
import { Tank, Bullet, Wall, PowerUp, PowerUpType, Missile } from '@/game/types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TANK_WIDTH,
  TANK_HEIGHT,
  TANK_SPEED,
  TANK_MAX_HP,
  BULLET_SPEED,
  BULLET_DAMAGE,
  BULLET_RADIUS,
  SHOOT_COOLDOWN,
  POWERUP_RADIUS,
  POWERUP_DURATION,
  POWERUP_SPAWN_CHANCE,
  GAME_DURATION,
  MAPS,
  COLORS,
  MISSILE_SPEED,
  MISSILE_DAMAGE,
  MISSILE_RADIUS,
  MISSILE_COOLDOWN,
  BOUNCE_FIRST_DAMAGE,
  BOUNCE_SECOND_DAMAGE,
  BOUNCE_FIRST_RADIUS,
  BOUNCE_SECOND_RADIUS,
  WALL_WIDTH,
  WALL_HEIGHT,
  WALL_HP,
  FIRE_WALL_HP,
  SURVIVAL_DURATION,
} from '@/game/constants';
import styles from '@/styles/Game.module.css';

interface GameProps {
  mapIndex: number;
  onGameOver: (winner: 'player' | 'ai' | null, playerScore: number, aiScore: number) => void;
  onMapChange?: (index: number) => void;
  gameMode?: 'battle' | 'survival';
  onGameModeChange?: (mode: 'battle' | 'survival') => void;
  difficulty?: 'normal' | 'hard';
  onDifficultyChange?: (diff: 'normal' | 'hard') => void;
  vfxVolume?: number;
  onVfxVolumeChange?: (volume: number) => void;
  musicVolume?: number;
  onMusicVolumeChange?: (volume: number) => void;
}

interface Explosion {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

interface BattleState {
  player: Tank;
  ai: Tank;
  bullets: Bullet[];
  missiles: Missile[];
  walls: Wall[];
  powerUps: PowerUp[];
  playerScore: number;
  aiScore: number;
  timeRemaining: number;
  isRunning: boolean;
  isGameOver: boolean;
  winner: 'player' | 'ai' | null;
}

interface SurvivalState {
  player: Tank;
  enemies: Tank[];
  bullets: Bullet[];
  missiles: Missile[];
  walls: Wall[];
  powerUps: PowerUp[];
  playerScore: number;
  timeRemaining: number;
  isRunning: boolean;
  isGameOver: boolean;
  wave: number;
  enemiesRemaining: number;
  spawnTimer: number;
  difficultyLevel: number;
  winner: 'player' | null;
}

export default function Game({ mapIndex, onGameOver, onMapChange, gameMode = 'battle', onGameModeChange, difficulty = 'normal', onDifficultyChange, vfxVolume = 0.5, onVfxVolumeChange, musicVolume = 0.5, onMusicVolumeChange }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const keysRef = useRef({ w: false, a: false, s: false, d: false });
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  
  const battleStateRef = useRef<BattleState | null>(null);
  const survivalStateRef = useRef<SurvivalState | null>(null);
  
  const explosionsRef = useRef<Explosion[]>([]);
  const lastShootRef = useRef(0);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const gameStartedRef = useRef(false);
  const gameEndedRef = useRef(false);
  const isPausedRef = useRef(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [displayState, setDisplayState] = useState({
    playerHp: TANK_MAX_HP,
    aiHp: TANK_MAX_HP,
    playerScore: 0,
    aiScore: 0,
    timeRemaining: GAME_DURATION,
    wave: 0,
    enemiesRemaining: 0,
  });

  const createTank = useCallback((id: string, x: number, y: number, rotation: number, isPlayer: boolean): Tank => ({
    id,
    position: { x, y },
    velocity: { vx: 0, vy: 0 },
    rotation,
    barrelRotation: rotation,
    hp: TANK_MAX_HP,
    maxHp: TANK_MAX_HP,
    speed: isPlayer ? TANK_SPEED : TANK_SPEED * 0.7,
    isPlayer,
    lastShot: 0,
    shootCooldown: isPlayer ? SHOOT_COOLDOWN : SHOOT_COOLDOWN * 1.5,
    width: TANK_WIDTH,
    height: TANK_HEIGHT,
    activePowerUps: [],
    hasMissile: false,
    lastMissile: 0,
  }), []);

  const isValidSpawnPosition = (x: number, y: number, walls: Wall[]): boolean => {
    const margin = 5;
    for (const wall of walls) {
      if (
        x < wall.position.x + wall.width + margin &&
        x + TANK_WIDTH + margin > wall.position.x &&
        y < wall.position.y + wall.height + margin &&
        y + TANK_HEIGHT + margin > wall.position.y
      ) {
        return false;
      }
    }
    return x > 0 && x < CANVAS_WIDTH - TANK_WIDTH && y > 0 && y < CANVAS_HEIGHT - TANK_HEIGHT;
  };

  const generateRandomWallsForGame = (): Omit<Wall, 'id'>[] => {
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
  };

  const initGame = useCallback(() => {
    const map = MAPS[mapIndex] || MAPS[0];
    let walls = map.walls.map((w, i) => ({ ...w, id: `wall-${i}` }));
    
    if (map.isRandom) {
      walls = generateRandomWallsForGame().map((w, i) => ({ ...w, id: `wall-${i}` }));
    }

    const findValidPlayerSpawn = (walls: Wall[]): { x: number; y: number } => {
      const positions = [
        { x: map.playerSpawn.x, y: map.playerSpawn.y },
        { x: 60, y: 60 },
        { x: 100, y: 100 },
        { x: 60, y: 300 },
        { x: 100, y: 200 },
      ];
      for (const pos of positions) {
        if (isValidSpawnPosition(pos.x, pos.y, walls)) {
          return pos;
        }
      }
      return { x: 60, y: 60 };
    };

    const findValidAISpawn = (walls: Wall[]): { x: number; y: number } => {
      const positions = [
        { x: map.aiSpawn.x, y: map.aiSpawn.y },
        { x: 700, y: 500 },
        { x: 740, y: 540 },
        { x: 700, y: 300 },
        { x: 740, y: 100 },
      ];
      for (const pos of positions) {
        if (isValidSpawnPosition(pos.x, pos.y, walls)) {
          return pos;
        }
      }
      return { x: 700, y: 500 };
    };

    if (gameMode === 'survival') {
      const playerSpawn = findValidPlayerSpawn(walls);
      survivalStateRef.current = {
        player: createTank('player', playerSpawn.x, playerSpawn.y, 0, true),
        enemies: [],
        bullets: [],
        missiles: [],
        walls,
        powerUps: [],
        playerScore: 0,
        timeRemaining: SURVIVAL_DURATION,
        isRunning: false,
        isGameOver: false,
        wave: 1,
        enemiesRemaining: 0,
        spawnTimer: 0,
        difficultyLevel: 1,
        winner: null,
      };
    } else {
      const playerSpawn = findValidPlayerSpawn(walls);
      const aiSpawn = findValidAISpawn(walls);
      battleStateRef.current = {
        player: createTank('player', playerSpawn.x, playerSpawn.y, 0, true),
        ai: createTank('ai', aiSpawn.x, aiSpawn.y, Math.PI, false),
        bullets: [],
        missiles: [],
        walls,
        powerUps: [],
        playerScore: 0,
        aiScore: 0,
        timeRemaining: GAME_DURATION,
        isRunning: false,
        isGameOver: false,
        winner: null,
      };
    }

    lastShootRef.current = 0;
    explosionsRef.current = [];
  }, [mapIndex, gameMode, createTank]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (isPausedRef.current) {
          setIsPaused(false);
          isPausedRef.current = false;
        } else if (gameStartedRef.current && !gameEndedRef.current) {
          setIsPaused(true);
          isPausedRef.current = true;
        }
        return;
      }
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keysRef.current.w = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keysRef.current.s = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keysRef.current.a = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keysRef.current.d = true;
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keysRef.current.w = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keysRef.current.s = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keysRef.current.a = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keysRef.current.d = false;
          break;
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    const handleMouseDown = (e: MouseEvent) => { 
      mouseRef.current.down = true;
      if (e.button === 2) {
        e.preventDefault();
        console.log('Right click - hasMissile:', gameMode === 'battle' ? battleStateRef.current?.player.hasMissile : survivalStateRef.current?.player.hasMissile);
        const now = Date.now();
        if (gameMode === 'battle' && battleStateRef.current?.player.hasMissile && battleStateRef.current?.isRunning && now - (battleStateRef.current.player.lastMissile || 0) > MISSILE_COOLDOWN) {
          const state = battleStateRef.current;
          const centerX = state.player.position.x + TANK_WIDTH / 2;
          const centerY = state.player.position.y + TANK_HEIGHT / 2;
          const aiCenterX = state.ai.position.x + state.ai.width / 2;
          const aiCenterY = state.ai.position.y + state.ai.height / 2;
          const rotation = Math.atan2(aiCenterY - centerY, aiCenterX - centerX);
          state.missiles.push({
            id: `missile-${now}`,
            position: { x: centerX, y: centerY },
            velocity: { vx: Math.cos(rotation) * MISSILE_SPEED, vy: Math.sin(rotation) * MISSILE_SPEED },
            rotation,
            speed: MISSILE_SPEED,
            damage: MISSILE_DAMAGE,
            ownerId: 'player',
            isPlayerMissile: true,
            radius: MISSILE_RADIUS,
            targetId: 'ai',
            spawnTime: now,
          });
          state.player.hasMissile = false;
          state.player.lastMissile = now;
          soundManager.playShoot();
        } else if (gameMode === 'survival' && survivalStateRef.current?.player.hasMissile && survivalStateRef.current?.isRunning && now - (survivalStateRef.current.player.lastMissile || 0) > MISSILE_COOLDOWN) {
          const state = survivalStateRef.current;
          const centerX = state.player.position.x + TANK_WIDTH / 2;
          const centerY = state.player.position.y + TANK_HEIGHT / 2;
          
          let closestEnemy = null;
          let closestDist = Infinity;
          for (const enemy of state.enemies) {
            const ex = enemy.position.x + enemy.width / 2;
            const ey = enemy.position.y + enemy.height / 2;
            const dist = Math.sqrt((ex - centerX) ** 2 + (ey - centerY) ** 2);
            if (dist < closestDist) {
              closestDist = dist;
              closestEnemy = { x: ex, y: ey };
            }
          }
          
          let rotation: number;
          if (closestEnemy) {
            rotation = Math.atan2(closestEnemy.y - centerY, closestEnemy.x - centerX);
          } else {
            rotation = state.player.barrelRotation;
          }
          
          state.missiles.push({
            id: `missile-${now}`,
            position: { x: centerX, y: centerY },
            velocity: { vx: Math.cos(rotation) * MISSILE_SPEED, vy: Math.sin(rotation) * MISSILE_SPEED },
            rotation,
            speed: MISSILE_SPEED,
            damage: MISSILE_DAMAGE,
            ownerId: 'player',
            isPlayerMissile: true,
            radius: MISSILE_RADIUS,
            targetId: 'closest',
            spawnTime: now,
          });
          state.player.hasMissile = false;
          state.player.lastMissile = now;
          soundManager.playShoot();
        }
      }
    };
    const handleMouseUp = () => { mouseRef.current.down = false; };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gameMode]);

  useEffect(() => {
    soundManager.setVFXVolume(vfxVolume);
    soundManager.setMusicVolume(musicVolume);
  }, [vfxVolume, musicVolume]);

  const handleVfxVolumeChange = (newVolume: number) => {
    onVfxVolumeChange?.(newVolume);
  };

  const handleMusicVolumeChange = (newVolume: number) => {
    onMusicVolumeChange?.(newVolume);
  };

  useEffect(() => {
    if (!gameStarted || gameEnded) {
      if (gameEnded) {
        if (winner === 'player') {
          soundManager.playMusic('victory');
        } else {
          soundManager.playMusic('defeat');
        }
      } else {
        soundManager.playMusic('menu');
      }
    } else {
      soundManager.playMusic('', gameMode, difficulty, mapIndex);
    }
    return () => {
      soundManager.stopMusic();
    };
  }, [gameStarted, gameMode, mapIndex, difficulty, gameEnded, winner]);

  const updateTankPowerUps = (tank: Tank) => {
    const now = Date.now();
    tank.activePowerUps = tank.activePowerUps.filter((p) => p.expiresAt > now);
    
    const hasSpeed = tank.activePowerUps.some((p) => p.type === 'speed');
    const hasSlow = tank.activePowerUps.some((p) => p.type === 'slow');
    tank.speed = hasSpeed ? TANK_SPEED * (tank.isPlayer ? 1.5 : 1.05) : hasSlow ? TANK_SPEED * (tank.isPlayer ? 0.5 : 0.35) : TANK_SPEED * (tank.isPlayer ? 1 : 0.7);
    
    tank.shootCooldown = tank.activePowerUps.some((p) => p.type === 'rapidFire') 
      ? SHOOT_COOLDOWN * (tank.isPlayer ? 0.5 : 0.75) 
      : SHOOT_COOLDOWN * (tank.isPlayer ? 1 : 1.5);
  };

  const applyPowerUp = (tank: Tank, powerUp: PowerUpType, now: number): boolean => {
    if (powerUp === 'health') {
      tank.hp = Math.min(tank.maxHp, tank.hp + 25);
      return true;
    }
    if (powerUp === 'missile') {
      tank.hasMissile = true;
      return true;
    }
    const isPositive = ['health', 'speed', 'rapidFire', 'shield', 'missile', 'bounce'].includes(powerUp);
    const isNegative = ['slow', 'confuse'].includes(powerUp);
    if (isPositive || isNegative) {
      tank.activePowerUps = [...tank.activePowerUps.filter((p) => p.type !== powerUp), { type: powerUp, expiresAt: now + POWERUP_DURATION }];
      return true;
    }
    return false;
  };

  const checkTankHit = (target: Tank, bullet: Bullet, state: any, isPlayerBullet: boolean, shooter?: Tank) => {
    if (target.hp <= 0) return false;
    const hasShield = target.activePowerUps.some((p) => p.type === 'shield');
    if (hasShield) return false;
    
    let damage = bullet.damage;
    if (shooter?.activePowerUps.some((p) => p.type === 'rapidFire')) {
      damage *= 2;
    }
    target.hp -= damage;
    if (isPlayerBullet && state.playerScore !== undefined) {
      state.playerScore += 10;
    } else if (!isPlayerBullet && (state as BattleState).aiScore !== undefined) {
      (state as BattleState).aiScore += 10;
    }
    return true;
  };

  const findValidSpawnPoint = (walls: Wall[]): { x: number; y: number } => {
    const candidates = [
      { x: 700, y: 100 },
      { x: 700, y: 300 },
      { x: 700, y: 500 },
      { x: 400, y: 50 },
      { x: 200, y: 50 },
      { x: 600, y: 200 },
      { x: 500, y: 400 },
      { x: 300, y: 150 },
      { x: 100, y: 500 },
    ];
    
    for (const point of candidates) {
      if (isValidSpawnPosition(point.x, point.y, walls)) {
        return point;
      }
    }
    
    for (let attempts = 0; attempts < 20; attempts++) {
      const x = Math.random() * (CANVAS_WIDTH - TANK_WIDTH - 100) + 50;
      const y = Math.random() * (CANVAS_HEIGHT - TANK_HEIGHT - 100) + 50;
      if (isValidSpawnPosition(x, y, walls)) {
        return { x, y };
      }
    }
    
    return { x: 700, y: 100 };
  };

  const render = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (gameMode === 'survival' && survivalStateRef.current) {
      renderSurvival(ctx);
    } else if (battleStateRef.current) {
      renderBattle(ctx);
    }
  }, [gameMode]);

  const renderBattle = (ctx: CanvasRenderingContext2D) => {
    const state = battleStateRef.current!;
    
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    state.walls.forEach((wall) => drawWall(ctx, wall));
    
    drawSpawnBase(ctx, state.player.position.x, state.player.position.y, TANK_WIDTH, TANK_HEIGHT, 'rgba(56, 142, 60, 0.5)', 'rgba(56, 142, 60, 0.1)');
    drawSpawnBase(ctx, state.ai.position.x, state.ai.position.y, TANK_WIDTH, TANK_HEIGHT, 'rgba(211, 47, 47, 0.5)', 'rgba(211, 47, 47, 0.1)');
    
    state.powerUps.forEach((powerUp) => drawPowerUp(ctx, powerUp));
    state.bullets.forEach((bullet) => {
      const owner = bullet.isPlayerBullet ? state.player : state.ai;
      const isRapidFire = owner.activePowerUps.some((p) => p.type === 'rapidFire');
      drawBullet(ctx, bullet, isRapidFire);
    });
    state.missiles.forEach((missile) => drawMissile(ctx, missile));

    if (state.player.hasMissile) {
      const playerCenterX = state.player.position.x + state.player.width / 2;
      const playerCenterY = state.player.position.y + state.player.height / 2;
      
      let targetX: number | undefined = undefined;
      let targetY: number | undefined = undefined;
      
      if (state.ai.hp > 0) {
        targetX = state.ai.position.x + state.ai.width / 2;
        targetY = state.ai.position.y + state.ai.height / 2;
      }
      
      if (targetX !== undefined && targetY !== undefined) {
        const distToTarget = Math.sqrt((targetX - playerCenterX) ** 2 + (targetY - playerCenterY) ** 2);
        
        if (distToTarget < 300) {
          ctx.strokeStyle = '#FF6B6B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 20, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(targetX - 10, targetY);
          ctx.lineTo(targetX + 10, targetY);
          ctx.moveTo(targetX, targetY - 10);
          ctx.lineTo(targetX, targetY + 10);
          ctx.stroke();
          
          ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(playerCenterX, playerCenterY);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = mouseRef.current.x - rect.left;
      const mouseY = mouseRef.current.y - rect.top;
      drawTank(ctx, state.player, mouseX, mouseY);
    }
    drawTank(ctx, state.ai, 0, 0);

    const now = Date.now();
    explosionsRef.current = explosionsRef.current.filter((e) => now - e.startTime < e.duration);
    explosionsRef.current.forEach((exp) => {
      const progress = (now - exp.startTime) / exp.duration;
      drawExplosion(ctx, exp.x, exp.y, progress);
    });
  };

  const renderSurvival = (ctx: CanvasRenderingContext2D) => {
    const state = survivalStateRef.current!;
    
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    state.walls.forEach((wall) => drawWall(ctx, wall));
    
    drawSpawnBase(ctx, state.player.position.x, state.player.position.y, TANK_WIDTH, TANK_HEIGHT, 'rgba(56, 142, 60, 0.5)', 'rgba(56, 142, 60, 0.1)');
    
    state.powerUps.forEach((powerUp) => drawPowerUp(ctx, powerUp));
    state.bullets.forEach((bullet) => {
      let owner = null;
      if (bullet.isPlayerBullet) {
        owner = state.player;
      } else {
        owner = state.enemies.find(e => e.id === bullet.ownerId);
      }
      const isRapidFire = owner?.activePowerUps.some((p) => p.type === 'rapidFire') || false;
      drawBullet(ctx, bullet, isRapidFire);
    });
    state.missiles.forEach((missile) => drawMissile(ctx, missile));
    state.enemies.forEach((enemy) => drawTank(ctx, enemy, 0, 0));

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = mouseRef.current.x - rect.left;
      const mouseY = mouseRef.current.y - rect.top;
      drawTank(ctx, state.player, mouseX, mouseY);
    }

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Wave ${state.wave}`, CANVAS_WIDTH / 2, 30);

    const now = Date.now();
    explosionsRef.current = explosionsRef.current.filter((e) => now - e.startTime < e.duration);
    explosionsRef.current.forEach((exp) => {
      const progress = (now - exp.startTime) / exp.duration;
      drawExplosion(ctx, exp.x, exp.y, progress);
    });
  };

  useEffect(() => {
    if (!gameStarted) return;

    const gameLoop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 16.67, 2);
      lastTimeRef.current = time;

      if (gameMode === 'survival' && survivalStateRef.current) {
        runSurvivalLoop(time, dt);
      } else if (battleStateRef.current) {
        runBattleLoop(time, dt);
      }

      render();
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameStarted, mapIndex, gameMode, render]);

  const runBattleLoop = (time: number, dt: number) => {
    const state = battleStateRef.current!;
    if (!state.isRunning || state.isGameOver || isPaused) return;

    const now = Date.now();
    const { player, ai, walls, powerUps } = state;

    updateTankPowerUps(player);
    updateTankPowerUps(ai);

    if (difficulty === 'normal' && player.hp < player.maxHp && player.hp > 0) {
      const regenRate = player.maxHp * 0.001 * dt;
      player.hp = Math.min(player.maxHp, player.hp + regenRate);
    }

    const playerHasConfuse = player.activePowerUps.some((p) => p.type === 'confuse');
    const ROTATION_SPEED = 0.08 * dt;
    const keys = keysRef.current;
    
    if (playerHasConfuse) {
      if (keys.a) player.rotation += ROTATION_SPEED;
      if (keys.d) player.rotation -= ROTATION_SPEED;
    } else {
      if (keys.a) player.rotation -= ROTATION_SPEED;
      if (keys.d) player.rotation += ROTATION_SPEED;
    }

    let moveForward = 0;
    if (keys.w) moveForward = 1;
    if (keys.s) moveForward = -1;

    if (moveForward !== 0) {
      const moveX = Math.cos(player.rotation) * moveForward * player.speed * dt;
      const moveY = Math.sin(player.rotation) * moveForward * player.speed * dt;
      const tempPlayer = { ...player, position: { x: player.position.x + moveX, y: player.position.y + moveY } };
      if (!walls.some((wall) => checkTankWallCollision(tempPlayer, wall))) {
        player.position.x += moveX;
        player.position.y += moveY;
      }
    }
    player.position = clampPosition(player.position, player.width, player.height);

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = player.position.x + player.width / 2;
      const centerY = player.position.y + player.height / 2;
      player.barrelRotation = Math.atan2(mouseRef.current.y - rect.top - centerY, mouseRef.current.x - rect.left - centerX);
    }

    const aiDecision = getAIDecision(ai, player, walls, state.bullets, powerUps, state.missiles, ai.lastMissile || 0, difficulty === 'hard');
    const tempAI = { ...ai, position: { x: ai.position.x + aiDecision.moveX * ai.speed * dt, y: ai.position.y + aiDecision.moveY * ai.speed * dt } };
    if (!walls.some((wall) => checkTankWallCollision(tempAI, wall))) {
      ai.position.x = tempAI.position.x;
      ai.position.y = tempAI.position.y;
    }
    ai.position = clampPosition(ai.position, ai.width, ai.height);

    let rotationDiff = aiDecision.targetRotation - ai.rotation;
    while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
    while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
    ai.rotation += rotationDiff * 0.15 * dt;
    ai.barrelRotation = ai.rotation;

    if (mouseRef.current.down && player.hp > 0 && now - lastShootRef.current > player.shootCooldown) {
      const centerX = player.position.x + player.width / 2;
      const centerY = player.position.y + player.height / 2;
      const rotation = player.barrelRotation;
      const hasBounce = player.activePowerUps.some((p) => p.type === 'bounce');
      state.bullets.push({
        id: `bullet-${now}`,
        position: { x: centerX + Math.cos(rotation) * (player.width / 2 + 5), y: centerY + Math.sin(rotation) * (player.height / 2 + 5) },
        velocity: { vx: Math.cos(rotation) * BULLET_SPEED, vy: Math.sin(rotation) * BULLET_SPEED },
        rotation, speed: BULLET_SPEED, damage: BULLET_DAMAGE, ownerId: player.id, isPlayerBullet: true, radius: BULLET_RADIUS,
        bounces: 0, maxBounces: hasBounce ? 2 : 0, originalDamage: BULLET_DAMAGE,
      });
      lastShootRef.current = now;
      soundManager.playShoot();
    }

    if (aiDecision.shouldShoot && ai.hp > 0 && now - ai.lastShot > ai.shootCooldown) {
      const centerX = ai.position.x + ai.width / 2;
      const centerY = ai.position.y + ai.height / 2;
      const rotation = ai.rotation;
      const hasBounce = ai.activePowerUps.some((p) => p.type === 'bounce');
      state.bullets.push({
        id: `bullet-${now}-ai`,
        position: { x: centerX + Math.cos(rotation) * (ai.width / 2 + 5), y: centerY + Math.sin(rotation) * (ai.height / 2 + 5) },
        velocity: { vx: Math.cos(rotation) * BULLET_SPEED, vy: Math.sin(rotation) * BULLET_SPEED },
        rotation, speed: BULLET_SPEED, damage: BULLET_DAMAGE, ownerId: ai.id, isPlayerBullet: false, radius: BULLET_RADIUS,
        bounces: 0, maxBounces: hasBounce ? 2 : 0, originalDamage: BULLET_DAMAGE,
      });
      ai.lastShot = now;
    }

    if (aiDecision.shouldUseMissile && ai.hasMissile) {
      const centerX = ai.position.x + ai.width / 2;
      const centerY = ai.position.y + ai.height / 2;
      state.missiles.push({
        id: `missile-${now}-ai`,
        position: { x: centerX, y: centerY },
        velocity: { vx: Math.cos(ai.rotation) * MISSILE_SPEED, vy: Math.sin(ai.rotation) * MISSILE_SPEED },
        rotation: ai.rotation, speed: MISSILE_SPEED, damage: MISSILE_DAMAGE, ownerId: ai.id, isPlayerMissile: false, radius: MISSILE_RADIUS, targetId: 'player', spawnTime: now,
      });
      ai.hasMissile = false;
      ai.lastMissile = now;
      soundManager.playShoot();
    }

    state.bullets = state.bullets.filter((bullet) => {
      bullet.position.x += bullet.velocity.vx * dt;
      bullet.position.y += bullet.velocity.vy * dt;

      if (bullet.bounces < bullet.maxBounces) {
        let bounced = false;
        if (bullet.position.x < bullet.radius) {
          bullet.position.x = bullet.radius;
          bullet.velocity.vx = Math.abs(bullet.velocity.vx);
          bounced = true;
        } else if (bullet.position.x > CANVAS_WIDTH - bullet.radius) {
          bullet.position.x = CANVAS_WIDTH - bullet.radius;
          bullet.velocity.vx = -Math.abs(bullet.velocity.vx);
          bounced = true;
        }
        
        if (bullet.position.y < bullet.radius) {
          bullet.position.y = bullet.radius;
          bullet.velocity.vy = Math.abs(bullet.velocity.vy);
          bounced = true;
        } else if (bullet.position.y > CANVAS_HEIGHT - bullet.radius) {
          bullet.position.y = CANVAS_HEIGHT - bullet.radius;
          bullet.velocity.vy = -Math.abs(bullet.velocity.vy);
          bounced = true;
        }
        
        if (bounced) {
          bullet.bounces += 1;
          bullet.rotation = Math.atan2(bullet.velocity.vy, bullet.velocity.vx);
          if (bullet.bounces === 1) {
            bullet.damage = bullet.originalDamage * BOUNCE_FIRST_DAMAGE;
            bullet.radius = BULLET_RADIUS * BOUNCE_FIRST_RADIUS;
          } else if (bullet.bounces === 2) {
            bullet.damage = bullet.originalDamage * BOUNCE_SECOND_DAMAGE;
            bullet.radius = BULLET_RADIUS * BOUNCE_SECOND_RADIUS;
          }
          return true;
        }
      }

      if (bullet.position.x < -10 || bullet.position.x > CANVAS_WIDTH + 10 || bullet.position.y < -10 || bullet.position.y > CANVAS_HEIGHT + 10) {
        return false;
      }

      const target = bullet.isPlayerBullet ? ai : player;
      const shooter = bullet.isPlayerBullet ? player : ai;

      if (checkBulletTankCollision(bullet, target)) {
        if (checkTankHit(target, bullet, state, bullet.isPlayerBullet, shooter)) {
          explosionsRef.current.push({ x: bullet.position.x, y: bullet.position.y, startTime: now, duration: 500 });
          soundManager.playExplosion();
        }
        return false;
      }

      for (const wall of walls) {
        if (checkBulletWallCollision(bullet, wall)) {
          if (bullet.bounces < bullet.maxBounces) {
            const prevX = bullet.position.x - bullet.velocity.vx * dt;
            const prevY = bullet.position.y - bullet.velocity.vy * dt;
            const hitLeft = prevX + bullet.radius < wall.position.x;
            const hitRight = prevX - bullet.radius > wall.position.x + wall.width;
            const hitTop = prevY + bullet.radius < wall.position.y;
            const hitBottom = prevY - bullet.radius > wall.position.y + wall.height;
            
            if (hitLeft || hitRight) {
              bullet.velocity.vx = -bullet.velocity.vx;
            }
            if (hitTop || hitBottom) {
              bullet.velocity.vy = -bullet.velocity.vy;
            }
            
            bullet.rotation = Math.atan2(bullet.velocity.vy, bullet.velocity.vx);
            bullet.bounces += 1;
            
            if (bullet.bounces === 1) {
              bullet.damage = bullet.originalDamage * BOUNCE_FIRST_DAMAGE;
              bullet.radius = BULLET_RADIUS * BOUNCE_FIRST_RADIUS;
            } else if (bullet.bounces === 2) {
              bullet.damage = bullet.originalDamage * BOUNCE_SECOND_DAMAGE;
              bullet.radius = BULLET_RADIUS * BOUNCE_SECOND_RADIUS;
            }
            
            if (wall.requiresFirePowerUp) {
              if (shooter.activePowerUps.some((p) => p.type === 'rapidFire')) {
                wall.hp -= bullet.damage * 3;
                if (wall.hp <= 0) {
                  const idx = walls.indexOf(wall);
                  if (idx > -1) walls.splice(idx, 1);
                }
              }
            } else if (wall.isDestructible) {
              wall.hp -= bullet.damage;
              if (wall.hp <= 0) {
                const idx = walls.indexOf(wall);
                if (idx > -1) walls.splice(idx, 1);
              }
            }
            
            return true;
          }
          
          if (wall.requiresFirePowerUp) {
            if (shooter.activePowerUps.some((p) => p.type === 'rapidFire')) {
              wall.hp -= bullet.damage * 3;
              if (wall.hp <= 0) {
                const idx = walls.indexOf(wall);
                if (idx > -1) walls.splice(idx, 1);
              }
            }
          } else if (wall.isDestructible) {
            wall.hp -= bullet.damage;
            if (wall.hp <= 0) {
              const idx = walls.indexOf(wall);
              if (idx > -1) walls.splice(idx, 1);
            }
          }
          explosionsRef.current.push({ x: bullet.position.x, y: bullet.position.y, startTime: now, duration: 500 });
          soundManager.playExplosion();
          return false;
        }
      }

      return true;
    });

    state.missiles = state.missiles.filter((missile) => {
      if (missile.targetId && missile.isPlayerMissile && missile.targetId === 'ai') {
        if (ai.hp > 0) {
          const targetX = ai.position.x + ai.width / 2;
          const targetY = ai.position.y + ai.height / 2;
          const dx = targetX - missile.position.x;
          const dy = targetY - missile.position.y;
          const targetAngle = Math.atan2(dy, dx);
          
          let angleDiff = targetAngle - missile.rotation;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          
          const turnRate = 0.05;
          missile.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);
          missile.velocity.vx = Math.cos(missile.rotation) * missile.speed;
          missile.velocity.vy = Math.sin(missile.rotation) * missile.speed;
        }
      } else if (missile.targetId && !missile.isPlayerMissile && missile.targetId === 'player') {
        if (player.hp > 0) {
          const targetX = player.position.x + player.width / 2;
          const targetY = player.position.y + player.height / 2;
          const dx = targetX - missile.position.x;
          const dy = targetY - missile.position.y;
          const targetAngle = Math.atan2(dy, dx);
          
          let angleDiff = targetAngle - missile.rotation;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          
          const turnRate = 0.04;
          missile.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);
          missile.velocity.vx = Math.cos(missile.rotation) * missile.speed;
          missile.velocity.vy = Math.sin(missile.rotation) * missile.speed;
        }
      }

      missile.position.x += missile.velocity.vx * dt;
      missile.position.y += missile.velocity.vy * dt;

      if (missile.position.x < -20 || missile.position.x > CANVAS_WIDTH + 20 || missile.position.y < -20 || missile.position.y > CANVAS_HEIGHT + 20) {
        explosionsRef.current.push({ x: missile.position.x, y: missile.position.y, startTime: now, duration: 800 });
        soundManager.playExplosion();
        return false;
      }

      for (const wall of walls) {
        if (missile.position.x > wall.position.x - 10 && missile.position.x < wall.position.x + wall.width + 10 &&
            missile.position.y > wall.position.y - 10 && missile.position.y < wall.position.y + wall.height + 10) {
          if (!missile.isPlayerMissile && !player.activePowerUps.some((p) => p.type === 'shield')) {
            player.hp -= missile.damage * 0.5;
            soundManager.playDamage();
          } else if (missile.isPlayerMissile && !ai.activePowerUps.some((p) => p.type === 'shield')) {
            ai.hp -= missile.damage * 0.5;
          }
          explosionsRef.current.push({ x: missile.position.x, y: missile.position.y, startTime: now, duration: 800 });
          soundManager.playExplosion();
          return false;
        }
      }

      if (missile.isPlayerMissile && ai.hp > 0 && !ai.activePowerUps.some((p) => p.type === 'shield')) {
        const dx = ai.position.x + ai.width / 2 - missile.position.x;
        const dy = ai.position.y + ai.height / 2 - missile.position.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          ai.hp -= missile.damage;
          state.playerScore += 25;
          explosionsRef.current.push({ x: missile.position.x, y: missile.position.y, startTime: now, duration: 800 });
          soundManager.playExplosion();
          return false;
        }
      } else if (!missile.isPlayerMissile && player.hp > 0 && !player.activePowerUps.some((p) => p.type === 'shield')) {
        const dx = player.position.x + player.width / 2 - missile.position.x;
        const dy = player.position.y + player.height / 2 - missile.position.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          player.hp -= missile.damage;
          soundManager.playDamage();
          explosionsRef.current.push({ x: missile.position.x, y: missile.position.y, startTime: now, duration: 800 });
          soundManager.playExplosion();
          return false;
        }
      }

      return true;
    });

    for (let i = powerUps.length - 1; i >= 0; i--) {
      const powerUp = powerUps[i];
      if (checkTankPowerUpCollision(player, powerUp)) {
        applyPowerUp(player, powerUp.type, now);
        soundManager.playPowerUp();
        powerUps.splice(i, 1);
      } else if (checkTankPowerUpCollision(ai, powerUp)) {
        if (['health', 'speed', 'rapidFire', 'shield', 'missile', 'bounce'].includes(powerUp.type)) {
          applyPowerUp(ai, powerUp.type, now);
        }
        powerUps.splice(i, 1);
      }
    }

    powerUps.splice(0, powerUps.length, ...powerUps.filter(p => now - p.spawnTime <= 15000));

    if (Math.random() < POWERUP_SPAWN_CHANCE * dt) {
      const types: PowerUpType[] = ['health', 'speed', 'rapidFire', 'shield', 'slow', 'confuse', 'missile', 'bounce'];
      const type = types[Math.floor(Math.random() * types.length)];
      let x = Math.random() * (CANVAS_WIDTH - 40) + 20;
      let y = Math.random() * (CANVAS_HEIGHT - 40) + 20;
      if (!walls.some((w) => x > w.position.x - 20 && x < w.position.x + w.width + 20 && y > w.position.y - 20 && y < w.position.y + w.height + 20)) {
        powerUps.push({ id: `pu-${now}`, type, position: { x, y }, radius: POWERUP_RADIUS, spawnTime: now });
      }
    }

    if (player.hp <= 0) {
      soundManager.playTankExplosion();
      state.playerScore = Math.max(0, state.playerScore - 50);
      const map = MAPS[mapIndex];
      player.hp = player.maxHp;
      player.position = { x: map.playerSpawn.x, y: map.playerSpawn.y };
      player.activePowerUps = [];
      player.hasMissile = false;
    }
    if (ai.hp <= 0) {
      soundManager.playTankExplosion();
      state.aiScore = Math.max(0, state.aiScore - 50);
      const map = MAPS[mapIndex];
      ai.hp = ai.maxHp;
      ai.position = { x: map.aiSpawn.x, y: map.aiSpawn.y };
      ai.activePowerUps = [];
      ai.hasMissile = false;
    }

    state.timeRemaining -= 16.67 * dt;

    if (state.timeRemaining <= 0) {
      state.isGameOver = true;
      state.isRunning = false;
      const gameWinner = state.playerScore > state.aiScore ? 'player' : state.playerScore < state.aiScore ? 'ai' : null;
      state.winner = gameWinner;
      setWinner(gameWinner);
      setGameEnded(true);
      gameEndedRef.current = true;
    }

    setDisplayState(prev => ({
      ...prev,
      playerHp: player.hp,
      aiHp: ai.hp,
      playerScore: state.playerScore,
      aiScore: state.aiScore,
      timeRemaining: Math.max(0, state.timeRemaining),
    }));
  };

  const runSurvivalLoop = (time: number, dt: number) => {
    const state = survivalStateRef.current!;
    if (!state.isRunning || state.isGameOver || isPaused) return;

    const now = Date.now();
    const { player, enemies, walls, powerUps } = state;

    updateTankPowerUps(player);
    enemies.forEach(updateTankPowerUps);

    if (difficulty === 'normal' && player.hp < player.maxHp && player.hp > 0) {
      const regenRate = player.maxHp * 0.002 * dt;
      player.hp = Math.min(player.maxHp, player.hp + regenRate);
    }

    const playerHasConfuse = player.activePowerUps.some((p) => p.type === 'confuse');
    const ROTATION_SPEED = 0.08 * dt;
    const keys = keysRef.current;
    
    if (playerHasConfuse) {
      if (keys.a) player.rotation += ROTATION_SPEED;
      if (keys.d) player.rotation -= ROTATION_SPEED;
    } else {
      if (keys.a) player.rotation -= ROTATION_SPEED;
      if (keys.d) player.rotation += ROTATION_SPEED;
    }

    let moveForward = 0;
    if (keys.w) moveForward = 1;
    if (keys.s) moveForward = -1;

    if (moveForward !== 0) {
      const moveX = Math.cos(player.rotation) * moveForward * player.speed * dt;
      const moveY = Math.sin(player.rotation) * moveForward * player.speed * dt;
      const tempPlayer = { ...player, position: { x: player.position.x + moveX, y: player.position.y + moveY } };
      if (!walls.some((wall) => checkTankWallCollision(tempPlayer, wall))) {
        player.position.x += moveX;
        player.position.y += moveY;
      }
    }
    player.position = clampPosition(player.position, player.width, player.height);

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = player.position.x + player.width / 2;
      const centerY = player.position.y + player.height / 2;
      player.barrelRotation = Math.atan2(mouseRef.current.y - rect.top - centerY, mouseRef.current.x - rect.left - centerX);
    }

    if (mouseRef.current.down && player.hp > 0 && now - lastShootRef.current > player.shootCooldown) {
      const centerX = player.position.x + player.width / 2;
      const centerY = player.position.y + player.height / 2;
      const rotation = player.barrelRotation;
      const hasBounce = player.activePowerUps.some((p) => p.type === 'bounce');
      const playerMaxBounces = difficulty === 'normal' ? 2 : (hasBounce ? 2 : 0);
      state.bullets.push({
        id: `bullet-${now}`,
        position: { x: centerX + Math.cos(rotation) * (player.width / 2 + 5), y: centerY + Math.sin(rotation) * (player.height / 2 + 5) },
        velocity: { vx: Math.cos(rotation) * BULLET_SPEED, vy: Math.sin(rotation) * BULLET_SPEED },
        rotation, speed: BULLET_SPEED, damage: BULLET_DAMAGE, ownerId: player.id, isPlayerBullet: true, radius: BULLET_RADIUS,
        bounces: 0, maxBounces: playerMaxBounces, originalDamage: BULLET_DAMAGE,
      });
      lastShootRef.current = now;
      soundManager.playShoot();
    }

    enemies.forEach((enemy) => {
      const decision = getAIDecision(enemy, player, walls, state.bullets, powerUps, state.missiles, enemy.lastMissile || 0);
      const tempEnemy = { ...enemy, position: { x: enemy.position.x + decision.moveX * enemy.speed * dt, y: enemy.position.y + decision.moveY * enemy.speed * dt } };
      if (!walls.some((wall) => checkTankWallCollision(tempEnemy, wall))) {
        enemy.position.x = tempEnemy.position.x;
        enemy.position.y = tempEnemy.position.y;
      }
      enemy.position = clampPosition(enemy.position, enemy.width, enemy.height);

      let rotationDiff = decision.targetRotation - enemy.rotation;
      while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      enemy.rotation += rotationDiff * 0.15 * dt;
      enemy.barrelRotation = enemy.rotation;

      if (decision.shouldShoot && enemy.hp > 0 && now - enemy.lastShot > enemy.shootCooldown) {
        const centerX = enemy.position.x + enemy.width / 2;
        const centerY = enemy.position.y + enemy.height / 2;
        state.bullets.push({
          id: `bullet-${now}-${enemy.id}`,
          position: { x: centerX + Math.cos(enemy.rotation) * (enemy.width / 2 + 5), y: centerY + Math.sin(enemy.rotation) * (enemy.height / 2 + 5) },
          velocity: { vx: Math.cos(enemy.rotation) * BULLET_SPEED, vy: Math.sin(enemy.rotation) * BULLET_SPEED },
          rotation: enemy.rotation, speed: BULLET_SPEED, damage: BULLET_DAMAGE, ownerId: enemy.id, isPlayerBullet: false, radius: BULLET_RADIUS,
          bounces: 0, maxBounces: 0, originalDamage: BULLET_DAMAGE,
        });
        enemy.lastShot = now;
      }

      if (decision.shouldUseMissile && enemy.hasMissile) {
        const centerX = enemy.position.x + enemy.width / 2;
        const centerY = enemy.position.y + enemy.height / 2;
        state.missiles.push({
          id: `missile-${now}-${enemy.id}`,
          position: { x: centerX, y: centerY },
          velocity: { vx: Math.cos(enemy.rotation) * MISSILE_SPEED, vy: Math.sin(enemy.rotation) * MISSILE_SPEED },
          rotation: enemy.rotation, speed: MISSILE_SPEED, damage: MISSILE_DAMAGE, ownerId: enemy.id, isPlayerMissile: false, radius: MISSILE_RADIUS, targetId: 'player', spawnTime: now,
        });
        enemy.hasMissile = false;
        enemy.lastMissile = now;
      }
    });

    state.bullets = state.bullets.filter((bullet) => {
      bullet.position.x += bullet.velocity.vx * dt;
      bullet.position.y += bullet.velocity.vy * dt;

      if (bullet.bounces < bullet.maxBounces) {
        let bounced = false;
        if (bullet.position.x < bullet.radius) {
          bullet.position.x = bullet.radius;
          bullet.velocity.vx = Math.abs(bullet.velocity.vx);
          bounced = true;
        } else if (bullet.position.x > CANVAS_WIDTH - bullet.radius) {
          bullet.position.x = CANVAS_WIDTH - bullet.radius;
          bullet.velocity.vx = -Math.abs(bullet.velocity.vx);
          bounced = true;
        }
        
        if (bullet.position.y < bullet.radius) {
          bullet.position.y = bullet.radius;
          bullet.velocity.vy = Math.abs(bullet.velocity.vy);
          bounced = true;
        } else if (bullet.position.y > CANVAS_HEIGHT - bullet.radius) {
          bullet.position.y = CANVAS_HEIGHT - bullet.radius;
          bullet.velocity.vy = -Math.abs(bullet.velocity.vy);
          bounced = true;
        }
        
        if (bounced) {
          bullet.bounces += 1;
          bullet.rotation = Math.atan2(bullet.velocity.vy, bullet.velocity.vx);
          if (bullet.bounces === 1) {
            bullet.damage = bullet.originalDamage * BOUNCE_FIRST_DAMAGE;
            bullet.radius = BULLET_RADIUS * BOUNCE_FIRST_RADIUS;
          } else if (bullet.bounces === 2) {
            bullet.damage = bullet.originalDamage * BOUNCE_SECOND_DAMAGE;
            bullet.radius = BULLET_RADIUS * BOUNCE_SECOND_RADIUS;
          }
          return true;
        }
      }

      if (bullet.position.x < -10 || bullet.position.x > CANVAS_WIDTH + 10 || bullet.position.y < -10 || bullet.position.y > CANVAS_HEIGHT + 10) {
        return false;
      }

      for (const wall of walls) {
        if (checkBulletWallCollision(bullet, wall)) {
          if (bullet.bounces < bullet.maxBounces) {
            const prevX = bullet.position.x - bullet.velocity.vx * dt;
            const prevY = bullet.position.y - bullet.velocity.vy * dt;
            const hitLeft = prevX + bullet.radius < wall.position.x;
            const hitRight = prevX - bullet.radius > wall.position.x + wall.width;
            const hitTop = prevY + bullet.radius < wall.position.y;
            const hitBottom = prevY - bullet.radius > wall.position.y + wall.height;
            
            if (hitLeft || hitRight) {
              bullet.velocity.vx = -bullet.velocity.vx;
            }
            if (hitTop || hitBottom) {
              bullet.velocity.vy = -bullet.velocity.vy;
            }
            
            bullet.rotation = Math.atan2(bullet.velocity.vy, bullet.velocity.vx);
            bullet.bounces += 1;
            
            if (bullet.bounces === 1) {
              bullet.damage = bullet.originalDamage * BOUNCE_FIRST_DAMAGE;
              bullet.radius = BULLET_RADIUS * BOUNCE_FIRST_RADIUS;
            } else if (bullet.bounces === 2) {
              bullet.damage = bullet.originalDamage * BOUNCE_SECOND_DAMAGE;
              bullet.radius = BULLET_RADIUS * BOUNCE_SECOND_RADIUS;
            }
            
            if (wall.requiresFirePowerUp) {
              const shooter = bullet.isPlayerBullet ? player : enemies[0];
              if (shooter?.activePowerUps.some((p) => p.type === 'rapidFire')) {
                wall.hp -= bullet.damage * 3;
                if (wall.hp <= 0) {
                  const idx = walls.indexOf(wall);
                  if (idx > -1) walls.splice(idx, 1);
                }
              }
            } else if (wall.isDestructible) {
              wall.hp -= bullet.damage;
              if (wall.hp <= 0) {
                const idx = walls.indexOf(wall);
                if (idx > -1) walls.splice(idx, 1);
              }
            }
            
            return true;
          }
          
          if (wall.requiresFirePowerUp) {
            const shooter = bullet.isPlayerBullet ? player : enemies[0];
            if (shooter?.activePowerUps.some((p) => p.type === 'rapidFire')) {
              wall.hp -= bullet.damage * 3;
              if (wall.hp <= 0) {
                const idx = walls.indexOf(wall);
                if (idx > -1) walls.splice(idx, 1);
              }
            }
          } else if (wall.isDestructible) {
            wall.hp -= bullet.damage;
            if (wall.hp <= 0) {
              const idx = walls.indexOf(wall);
              if (idx > -1) walls.splice(idx, 1);
            }
          }
          explosionsRef.current.push({ x: bullet.position.x, y: bullet.position.y, startTime: now, duration: 500 });
          soundManager.playExplosion();
          return false;
        }
      }

      if (bullet.isPlayerBullet) {
        for (let i = enemies.length - 1; i >= 0; i--) {
          const enemy = enemies[i];
          if (enemy.hp > 0 && !enemy.activePowerUps.some((p) => p.type === 'shield') && checkBulletTankCollision(bullet, enemy)) {
            let damage = bullet.damage;
            if (player.activePowerUps.some((p) => p.type === 'rapidFire')) {
              damage *= 2;
            }
            enemy.hp -= damage;
            state.playerScore += 10;
            explosionsRef.current.push({ x: bullet.position.x, y: bullet.position.y, startTime: now, duration: 500 });
            soundManager.playExplosion();
            if (enemy.hp <= 0) {
              state.playerScore += 50;
              enemies.splice(i, 1);
            }
            return false;
          }
        }
      } else {
        if (player.hp > 0 && !player.activePowerUps.some((p) => p.type === 'shield') && checkBulletTankCollision(bullet, player)) {
          player.hp -= bullet.damage;
          explosionsRef.current.push({ x: bullet.position.x, y: bullet.position.y, startTime: now, duration: 500 });
          soundManager.playExplosion();
          soundManager.playDamage();
          return false;
        }
      }

      return true;
    });

    state.missiles = state.missiles.filter((missile) => {
      if (missile.targetId && missile.isPlayerMissile) {
        // Player missile tracking - find target enemy
        const targetEnemy = enemies.find(e => {
          if (missile.targetId === 'closest') return true;
          return e.id === missile.targetId;
        });
        if (targetEnemy && targetEnemy.hp > 0) {
          const targetX = targetEnemy.position.x + targetEnemy.width / 2;
          const targetY = targetEnemy.position.y + targetEnemy.height / 2;
          const dx = targetX - missile.position.x;
          const dy = targetY - missile.position.y;
          const targetAngle = Math.atan2(dy, dx);
          
          let angleDiff = targetAngle - missile.rotation;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          
          const turnRate = 0.05;
          missile.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);
          missile.velocity.vx = Math.cos(missile.rotation) * missile.speed;
          missile.velocity.vy = Math.sin(missile.rotation) * missile.speed;
        }
      } else if (missile.targetId && !missile.isPlayerMissile) {
        const target = player;
        if (target && target.hp > 0) {
          const targetX = target.position.x + target.width / 2;
          const targetY = target.position.y + target.height / 2;
          const dx = targetX - missile.position.x;
          const dy = targetY - missile.position.y;
          const targetAngle = Math.atan2(dy, dx);
          
          let angleDiff = targetAngle - missile.rotation;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          
          const turnRate = 0.04;
          missile.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);
          missile.velocity.vx = Math.cos(missile.rotation) * missile.speed;
          missile.velocity.vy = Math.sin(missile.rotation) * missile.speed;
        }
      }

      missile.position.x += missile.velocity.vx * dt;
      missile.position.y += missile.velocity.vy * dt;

      if (missile.position.x < -20 || missile.position.x > CANVAS_WIDTH + 20 || missile.position.y < -20 || missile.position.y > CANVAS_HEIGHT + 20) {
        explosionsRef.current.push({ x: missile.position.x, y: missile.position.y, startTime: now, duration: 800 });
        soundManager.playExplosion();
        return false;
      }

      for (const wall of walls) {
        if (missile.position.x > wall.position.x - 10 && missile.position.x < wall.position.x + wall.width + 10 &&
            missile.position.y > wall.position.y - 10 && missile.position.y < wall.position.y + wall.height + 10) {
          if (!missile.isPlayerMissile && !player.activePowerUps.some((p) => p.type === 'shield')) {
            player.hp -= missile.damage * 0.5;
          }
          explosionsRef.current.push({ x: missile.position.x, y: missile.position.y, startTime: now, duration: 800 });
          soundManager.playExplosion();
          return false;
        }
      }

      if (!missile.isPlayerMissile && player.hp > 0 && !player.activePowerUps.some((p) => p.type === 'shield')) {
        const dx = player.position.x + player.width / 2 - missile.position.x;
        const dy = player.position.y + player.height / 2 - missile.position.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          player.hp -= missile.damage;
          explosionsRef.current.push({ x: missile.position.x, y: missile.position.y, startTime: now, duration: 800 });
          soundManager.playExplosion();
          return false;
        }
      }

      return true;
    });

    for (let i = powerUps.length - 1; i >= 0; i--) {
      const powerUp = powerUps[i];
      if (checkTankPowerUpCollision(player, powerUp)) {
        applyPowerUp(player, powerUp.type, now);
        soundManager.playPowerUp();
        powerUps.splice(i, 1);
      } else {
        for (const enemy of enemies) {
          if (checkTankPowerUpCollision(enemy, powerUp)) {
            if (['health', 'speed', 'rapidFire', 'shield', 'missile'].includes(powerUp.type)) {
              applyPowerUp(enemy, powerUp.type, now);
            }
            powerUps.splice(i, 1);
            break;
          }
        }
      }
    }

    powerUps.splice(0, powerUps.length, ...powerUps.filter(p => now - p.spawnTime <= 15000));

    if (Math.random() < POWERUP_SPAWN_CHANCE * dt * 1.5) {
      const types: PowerUpType[] = ['health', 'speed', 'rapidFire', 'shield', 'slow', 'confuse', 'missile'];
      const type = types[Math.floor(Math.random() * types.length)];
      let x = Math.random() * (CANVAS_WIDTH - 40) + 20;
      let y = Math.random() * (CANVAS_HEIGHT - 40) + 20;
      if (!walls.some((w) => x > w.position.x - 20 && x < w.position.x + w.width + 20 && y > w.position.y - 20 && y < w.position.y + w.height + 20)) {
        powerUps.push({ id: `pu-${now}`, type, position: { x, y }, radius: POWERUP_RADIUS, spawnTime: now });
      }
    }

    state.spawnTimer -= 16.67 * dt;
    state.timeRemaining -= 16.67 * dt;
    
    if (state.timeRemaining <= 0) {
      state.isGameOver = true;
      state.isRunning = false;
      state.winner = 'player';
      setWinner('player');
      setGameEnded(true);
      gameEndedRef.current = true;
    }
    
    if (state.spawnTimer <= 0 && enemies.length < 3 + state.wave * 2) {
      const spawn = findValidSpawnPoint(walls);
      const enemyHp = Math.min(TANK_MAX_HP * (1 + state.difficultyLevel * 0.2), TANK_MAX_HP * 3);
      const enemySpeed = Math.min(TANK_SPEED * 0.7 * (1 + state.difficultyLevel * 0.1), TANK_SPEED * 1.2);
      enemies.push({
        id: `enemy-${now}`,
        position: { x: spawn.x, y: spawn.y },
        velocity: { vx: 0, vy: 0 },
        rotation: Math.PI,
        barrelRotation: Math.PI,
        hp: enemyHp,
        maxHp: enemyHp,
        speed: enemySpeed,
        isPlayer: false,
        lastShot: 0,
        shootCooldown: Math.max(SHOOT_COOLDOWN * 0.5, SHOOT_COOLDOWN * 1.5 - state.difficultyLevel * 100),
        width: TANK_WIDTH,
        height: TANK_HEIGHT,
        activePowerUps: [],
        hasMissile: Math.random() > 0.7,
      });
      state.spawnTimer = Math.max(2000, 5000 - state.wave * 500);
    }

    if (enemies.length === 0 && state.spawnTimer <= 0) {
      state.wave++;
      state.difficultyLevel = Math.min(state.difficultyLevel + 0.5, 5);
      state.spawnTimer = 3000;
      state.playerScore += state.wave * 100;
    }

    if (player.hp <= 0) {
      soundManager.playTankExplosion();
      state.isGameOver = true;
      state.isRunning = false;
      state.winner = null;
      setWinner(null);
      setGameEnded(true);
      gameEndedRef.current = true;
    }

    setDisplayState(prev => ({
      ...prev,
      playerHp: player.hp,
      aiHp: 0,
      playerScore: state.playerScore,
      aiScore: 0,
      timeRemaining: Math.max(0, state.timeRemaining),
      wave: state.wave,
      enemiesRemaining: enemies.length,
    }));
  };

  useEffect(() => {
    if (gameEnded) {
      soundManager.playGameOver();
      if (gameMode === 'battle' && battleStateRef.current) {
        onGameOver(
          battleStateRef.current.winner || 'ai',
          battleStateRef.current.playerScore,
          battleStateRef.current.aiScore
        );
      } else if (survivalStateRef.current) {
        onGameOver(
          survivalStateRef.current.winner,
          survivalStateRef.current.playerScore,
          survivalStateRef.current.wave * 100
        );
      }
    }
  }, [gameEnded, onGameOver, gameMode]);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {!gameStarted && (
        <div className={styles.startOverlay}>
          <h1>{gameMode === 'survival' ? 'Survival Mode' : 'Tank Battle'}</h1>
          <div className={styles.modeSelectorStart}>
            <button 
              className={`${styles.modeButtonStart} ${gameMode === 'battle' ? styles.active : ''}`}
              onClick={() => onGameModeChange?.('battle')}
            >
              ⚔️ Battle
            </button>
            <button 
              className={`${styles.modeButtonStart} ${gameMode === 'survival' ? styles.active : ''}`}
              onClick={() => onGameModeChange?.('survival')}
            >
              🏰 Survival
            </button>
          </div>
          <div className={styles.difficultySelector}>
            <button 
              className={`${styles.difficultyButton} ${difficulty === 'normal' ? styles.active : ''}`}
              onClick={() => onDifficultyChange?.('normal')}
            >
              🟢 Normal
            </button>
            <button 
              className={`${styles.difficultyButton} ${difficulty === 'hard' ? styles.active : ''}`}
              onClick={() => onDifficultyChange?.('hard')}
            >
              🔴 Hard
            </button>
          </div>
          <div className={styles.mapSelectorStart}>
            <span>Select Map:</span>
            <div className={styles.mapButtons}>
              {MAPS.map((map, index) => (
                <button
                  key={index}
                  className={`${styles.mapButtonStart} ${mapIndex === index ? styles.active : ''}`}
                  onClick={() => onMapChange?.(index)}
                >
                  {map.name}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.controls}>
            <p><strong>W</strong> - Forward</p>
            <p><strong>S</strong> - Backward</p>
            <p><strong>A/D</strong> - Rotate</p>
            <p><strong>Mouse</strong> - Aim</p>
            <p><strong>Click</strong> - Shoot</p>
            <p><strong>Right Click</strong> - Missile (when available)</p>
            <p><strong>ESC</strong> - Pause/Resume</p>
          </div>
          <div className={styles.volumeControls}>
            <div className={styles.volumeSlider}>
              <label>🔊 VFX</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={vfxVolume}
                onChange={(e) => handleVfxVolumeChange(parseFloat(e.target.value))}
              />
              <span>{Math.round(vfxVolume * 100)}%</span>
            </div>
            <div className={styles.volumeSlider}>
              <label>🎵 Music</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={musicVolume}
                onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
              />
              <span>{Math.round(musicVolume * 100)}%</span>
            </div>
          </div>
          <button className={styles.startButton} onClick={() => {
            setGameStarted(true);
            gameStartedRef.current = true;
            if (gameMode === 'survival' && survivalStateRef.current) {
              survivalStateRef.current.isRunning = true;
            } else if (battleStateRef.current) {
              battleStateRef.current.isRunning = true;
            }
            lastTimeRef.current = performance.now();
          }}>
            Start Game
          </button>
        </div>
      )}

      <div className={styles.hud}>
        <div className={styles.hudLeft}>
          <div className={styles.score}>
            <span className={styles.playerLabel}>You</span>
            <span className={styles.playerScore}>{displayState.playerScore}</span>
          </div>
        </div>
        <div className={styles.hudCenter}>
          {gameMode === 'survival' ? (
            <>
              <TimerDisplay timeRemaining={displayState.timeRemaining} wave={displayState.wave} />
              <div className={styles.mapName}>{MAPS[mapIndex].name}</div>
            </>
          ) : (
            <>
              <div className={styles.timer}>{formatTime(displayState.timeRemaining)}</div>
              <div className={styles.mapName}>{MAPS[mapIndex].name}</div>
            </>
          )}
        </div>
        <div className={styles.hudRight}>
          <div className={styles.score}>
            <span className={styles.aiLabel}>{gameMode === 'survival' ? 'Wave' : 'AI'}</span>
            <span className={styles.aiScore}>{gameMode === 'survival' ? displayState.wave : displayState.aiScore}</span>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className={styles.canvas} />

      {isPaused && gameStarted && !gameEnded && (
        <div className={styles.pauseOverlay}>
          <h2>Paused</h2>
          <p>Game is paused</p>
          <div className={styles.resumeHint}>Press <strong>ESC</strong> to resume</div>
        </div>
      )}

      <div className={styles.hpBars}>
        <div className={styles.hpBar}>
          <span>HP</span>
          <div className={styles.hpBarFill}>
            <div className={styles.hpBarValue} style={{ width: `${(displayState.playerHp / TANK_MAX_HP) * 100}%` }} />
          </div>
        </div>
        {gameMode === 'survival' && (
          <div className={styles.enemiesRemaining}>
            Enemies: {displayState.enemiesRemaining}
          </div>
        )}
      </div>
    </div>
  );
}

function TimerDisplay({ timeRemaining, wave }: { timeRemaining: number; wave: number }) {
  const isCritical = timeRemaining <= 10000;
  const pulsePhase = Math.floor((10000 - timeRemaining) / 200) % 10;
  const scale = isCritical ? 1 + (pulsePhase / 20) : 1;
  const opacity = isCritical ? 0.7 + (pulsePhase / 20) * 0.3 : 1;
  
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.timer} style={{
      fontSize: isCritical ? `${20 * scale}px` : '20px',
      color: isCritical ? `rgba(255, ${107 + pulsePhase * 10}, ${107 + pulsePhase * 10}, ${opacity})` : '#fff',
      transform: isCritical ? `scale(${scale})` : 'scale(1)',
      transition: 'all 0.2s ease',
    }}>
      {formatTime(timeRemaining)} | Wave {wave}
    </div>
  );
}