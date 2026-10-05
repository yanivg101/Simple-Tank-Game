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
  COLORS,
  MAPS,
} from '../constants';

describe('Game Constants', () => {
  describe('Canvas dimensions', () => {
    it('should have valid canvas width', () => {
      expect(CANVAS_WIDTH).toBe(800);
    });

    it('should have valid canvas height', () => {
      expect(CANVAS_HEIGHT).toBe(600);
    });
  });

  describe('Tank properties', () => {
    it('should have valid tank dimensions', () => {
      expect(TANK_WIDTH).toBeGreaterThan(0);
      expect(TANK_HEIGHT).toBeGreaterThan(0);
      expect(TANK_WIDTH).toBe(TANK_HEIGHT);
    });

    it('should have valid tank speed', () => {
      expect(TANK_SPEED).toBeGreaterThan(0);
    });

    it('should have valid tank max HP', () => {
      expect(TANK_MAX_HP).toBeGreaterThan(0);
    });
  });

  describe('Bullet properties', () => {
    it('should have valid bullet speed', () => {
      expect(BULLET_SPEED).toBeGreaterThan(0);
    });

    it('should have valid bullet damage', () => {
      expect(BULLET_DAMAGE).toBeGreaterThan(0);
      expect(BULLET_DAMAGE).toBeLessThan(TANK_MAX_HP);
    });

    it('should have valid bullet radius', () => {
      expect(BULLET_RADIUS).toBeGreaterThan(0);
    });
  });

  describe('Missile properties', () => {
    it('should have valid missile speed', () => {
      expect(MISSILE_SPEED).toBeGreaterThan(0);
    });

    it('should have valid missile damage', () => {
      expect(MISSILE_DAMAGE).toBeGreaterThan(0);
      expect(MISSILE_DAMAGE).toBeGreaterThan(BULLET_DAMAGE);
    });

    it('should have valid missile cooldown', () => {
      expect(MISSILE_COOLDOWN).toBeGreaterThan(0);
      expect(MISSILE_COOLDOWN).toBeGreaterThan(SHOOT_COOLDOWN);
    });
  });

  describe('Power-up properties', () => {
    it('should have valid power-up radius', () => {
      expect(POWERUP_RADIUS).toBeGreaterThan(0);
    });

    it('should have valid power-up duration', () => {
      expect(POWERUP_DURATION).toBeGreaterThan(0);
    });

    it('should have valid power-up spawn chance', () => {
      expect(POWERUP_SPAWN_CHANCE).toBeGreaterThan(0);
      expect(POWERUP_SPAWN_CHANCE).toBeLessThanOrEqual(1);
    });
  });

  describe('Wall properties', () => {
    it('should have valid wall dimensions', () => {
      expect(WALL_WIDTH).toBeGreaterThan(0);
      expect(WALL_HEIGHT).toBeGreaterThan(0);
    });

    it('should have valid wall HP', () => {
      expect(WALL_HP).toBeGreaterThan(0);
    });

    it('should have valid fire wall HP', () => {
      expect(FIRE_WALL_HP).toBeGreaterThan(0);
    });
  });

  describe('Bounce properties', () => {
    it('should have valid bounce damage values', () => {
      expect(BOUNCE_FIRST_DAMAGE).toBeGreaterThan(0);
      expect(BOUNCE_FIRST_DAMAGE).toBeGreaterThan(BOUNCE_SECOND_DAMAGE);
    });

    it('should have valid bounce radius values', () => {
      expect(BOUNCE_FIRST_RADIUS).toBeGreaterThan(0);
      expect(BOUNCE_FIRST_RADIUS).toBeGreaterThan(BOUNCE_SECOND_RADIUS);
    });
  });

  describe('Game duration', () => {
    it('should have valid game duration', () => {
      expect(GAME_DURATION).toBeGreaterThan(0);
    });

    it('should have valid survival duration', () => {
      expect(SURVIVAL_DURATION).toBeGreaterThan(0);
    });
  });

  describe('COLORS', () => {
    it('should have all required color properties', () => {
      expect(COLORS).toHaveProperty('player');
      expect(COLORS).toHaveProperty('ai');
      expect(COLORS).toHaveProperty('bullet');
      expect(COLORS).toHaveProperty('wall');
      expect(COLORS).toHaveProperty('background');
      expect(COLORS).toHaveProperty('text');
      expect(COLORS).toHaveProperty('hud');
    });

    it('should have valid player and AI colors', () => {
      expect(COLORS.player).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(COLORS.ai).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('MAPS', () => {
    it('should have at least one map', () => {
      expect(MAPS.length).toBeGreaterThan(0);
    });

    it('each map should have required properties', () => {
      MAPS.forEach((map) => {
        expect(map).toHaveProperty('name');
        expect(map).toHaveProperty('walls');
        expect(map).toHaveProperty('playerSpawn');
        expect(map).toHaveProperty('aiSpawn');
        expect(map.playerSpawn).toHaveProperty('x');
        expect(map.playerSpawn).toHaveProperty('y');
        expect(map.aiSpawn).toHaveProperty('x');
        expect(map.aiSpawn).toHaveProperty('y');
      });
    });
  });
});