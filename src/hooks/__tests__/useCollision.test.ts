import {
  checkCollisionRect,
  checkCollisionCircle,
  checkTankWallCollision,
  checkBulletWallCollision,
  checkBulletTankCollision,
  checkTankPowerUpCollision,
} from '../useCollision';
import { Tank, Bullet, Wall, PowerUp } from '@/game/types';

describe('useCollision', () => {
  describe('checkCollisionRect', () => {
    it('should detect collision between two rectangles', () => {
      const rect1 = { x: 0, y: 0 };
      const rect2 = { x: 10, y: 10 };
      expect(checkCollisionRect(rect1, 20, 20, rect2, 20, 20)).toBe(true);
    });

    it('should not detect collision when rectangles are far apart', () => {
      const rect1 = { x: 0, y: 0 };
      const rect2 = { x: 100, y: 100 };
      expect(checkCollisionRect(rect1, 20, 20, rect2, 20, 20)).toBe(false);
    });

    it('should detect collision when rectangles touch edges', () => {
      const rect1 = { x: 0, y: 0 };
      const rect2 = { x: 19, y: 0 };
      expect(checkCollisionRect(rect1, 20, 20, rect2, 20, 20)).toBe(true);
    });
  });

  describe('checkCollisionCircle', () => {
    it('should detect collision between two circles', () => {
      const pos1 = { x: 0, y: 0 };
      const pos2 = { x: 10, y: 0 };
      expect(checkCollisionCircle(pos1, 10, pos2, 10)).toBe(true);
    });

    it('should not detect collision when circles are far apart', () => {
      const pos1 = { x: 0, y: 0 };
      const pos2 = { x: 50, y: 0 };
      expect(checkCollisionCircle(pos1, 10, pos2, 10)).toBe(false);
    });

    it('should detect collision when circles touch', () => {
      const pos1 = { x: 0, y: 0 };
      const pos2 = { x: 19, y: 0 };
      expect(checkCollisionCircle(pos1, 10, pos2, 10)).toBe(true);
    });
  });

  describe('checkTankWallCollision', () => {
    it('should detect collision between tank and wall', () => {
      const tank: Tank = {
        id: 'tank1',
        position: { x: 50, y: 50 },
        velocity: { vx: 0, vy: 0 },
        rotation: 0,
        barrelRotation: 0,
        hp: 100,
        maxHp: 100,
        speed: 5,
        isPlayer: true,
        lastShot: 0,
        shootCooldown: 500,
        width: 40,
        height: 40,
        activePowerUps: [],
        hasMissile: false,
      };
      const wall: Wall = {
        id: 'wall1',
        position: { x: 60, y: 60 },
        width: 30,
        height: 30,
        hp: 50,
        maxHp: 50,
        isFireWall: false,
      };
      expect(checkTankWallCollision(tank, wall)).toBe(true);
    });

    it('should not detect collision when tank is far from wall', () => {
      const tank: Tank = {
        id: 'tank1',
        position: { x: 10, y: 10 },
        velocity: { vx: 0, vy: 0 },
        rotation: 0,
        barrelRotation: 0,
        hp: 100,
        maxHp: 100,
        speed: 5,
        isPlayer: true,
        lastShot: 0,
        shootCooldown: 500,
        width: 40,
        height: 40,
        activePowerUps: [],
        hasMissile: false,
      };
      const wall: Wall = {
        id: 'wall1',
        position: { x: 100, y: 100 },
        width: 30,
        height: 30,
        hp: 50,
        maxHp: 50,
        isFireWall: false,
      };
      expect(checkTankWallCollision(tank, wall)).toBe(false);
    });
  });

  describe('checkBulletWallCollision', () => {
    it('should detect collision between bullet and wall', () => {
      const bullet: Bullet = {
        id: 'bullet1',
        position: { x: 50, y: 50 },
        velocity: { vx: 10, vy: 0 },
        rotation: 0,
        speed: 10,
        damage: 20,
        ownerId: 'player',
        isPlayerBullet: true,
        radius: 5,
        bounces: 0,
        maxBounces: 0,
        originalDamage: 20,
      };
      const wall: Wall = {
        id: 'wall1',
        position: { x: 45, y: 45 },
        width: 30,
        height: 30,
        hp: 50,
        maxHp: 50,
        isFireWall: false,
      };
      expect(checkBulletWallCollision(bullet, wall)).toBe(true);
    });

    it('should not detect collision when bullet is far from wall', () => {
      const bullet: Bullet = {
        id: 'bullet1',
        position: { x: 10, y: 10 },
        velocity: { vx: 10, vy: 0 },
        rotation: 0,
        speed: 10,
        damage: 20,
        ownerId: 'player',
        isPlayerBullet: true,
        radius: 5,
        bounces: 0,
        maxBounces: 0,
        originalDamage: 20,
      };
      const wall: Wall = {
        id: 'wall1',
        position: { x: 100, y: 100 },
        width: 30,
        height: 30,
        hp: 50,
        maxHp: 50,
        isFireWall: false,
      };
      expect(checkBulletWallCollision(bullet, wall)).toBe(false);
    });
  });

  describe('checkBulletTankCollision', () => {
    it('should detect collision between bullet and tank', () => {
      const bullet: Bullet = {
        id: 'bullet1',
        position: { x: 50, y: 50 },
        velocity: { vx: 10, vy: 0 },
        rotation: 0,
        speed: 10,
        damage: 20,
        ownerId: 'player',
        isPlayerBullet: true,
        radius: 5,
        bounces: 0,
        maxBounces: 0,
        originalDamage: 20,
      };
      const tank: Tank = {
        id: 'tank1',
        position: { x: 40, y: 40 },
        velocity: { vx: 0, vy: 0 },
        rotation: 0,
        barrelRotation: 0,
        hp: 100,
        maxHp: 100,
        speed: 5,
        isPlayer: false,
        lastShot: 0,
        shootCooldown: 500,
        width: 40,
        height: 40,
        activePowerUps: [],
        hasMissile: false,
      };
      expect(checkBulletTankCollision(bullet, tank)).toBe(true);
    });
  });

  describe('checkTankPowerUpCollision', () => {
    it('should detect collision between tank and power-up', () => {
      const tank: Tank = {
        id: 'tank1',
        position: { x: 50, y: 50 },
        velocity: { vx: 0, vy: 0 },
        rotation: 0,
        barrelRotation: 0,
        hp: 100,
        maxHp: 100,
        speed: 5,
        isPlayer: true,
        lastShot: 0,
        shootCooldown: 500,
        width: 40,
        height: 40,
        activePowerUps: [],
        hasMissile: false,
      };
      const powerUp: PowerUp = {
        id: 'powerup1',
        type: 'health',
        position: { x: 60, y: 60 },
        radius: 15,
        spawnTime: Date.now(),
      };
      expect(checkTankPowerUpCollision(tank, powerUp)).toBe(true);
    });
  });
});