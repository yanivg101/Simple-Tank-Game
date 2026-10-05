import { Tank, Wall, Position, PowerUp, Missile } from '@/game/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MISSILE_COOLDOWN } from '../constants';

interface AIDecision {
  moveX: number;
  moveY: number;
  targetRotation: number;
  shouldShoot: boolean;
  shouldUseMissile: boolean;
}

const POSITIVE_POWERUPS = ['health', 'speed', 'rapidFire', 'shield', 'missile', 'bounce'];
const NEGATIVE_POWERUPS = ['slow', 'confuse'];

export function getAIDecision(
  aiTank: Tank,
  playerTank: Tank,
  walls: Wall[],
  bullets: { position: Position; ownerId: string }[],
  powerUps: PowerUp[] = [],
  missiles: Missile[] = [],
  lastMissileTime: number = 0,
  aggressive: boolean = false
): AIDecision {
  const decision: AIDecision = {
    moveX: 0,
    moveY: 0,
    targetRotation: aiTank.rotation,
    shouldShoot: false,
    shouldUseMissile: false,
  };

  const aiCenter = {
    x: aiTank.position.x + aiTank.width / 2,
    y: aiTank.position.y + aiTank.height / 2,
  };
  const playerCenter = {
    x: playerTank.position.x + playerTank.width / 2,
    y: playerTank.position.y + playerTank.height / 2,
  };

  const nearestIncomingBullet = bullets.find(
    (b) => b.ownerId !== aiTank.id && isBulletHeadingTowards(b.position, aiCenter, 80)
  );

  if (nearestIncomingBullet) {
    const dodgeDir = getDodgeDirection(aiCenter, nearestIncomingBullet.position);
    decision.moveX = dodgeDir.x;
    decision.moveY = dodgeDir.y;
    decision.shouldShoot = false;
    return decision;
  }

  const canSeePlayer = !isLineBlocked(aiCenter, playerCenter, walls);

  const nearbyPositivePowerUp = findNearest(powerUps.filter(p => POSITIVE_POWERUPS.includes(p.type)), aiCenter, walls);
  const nearbyNegativePowerUp = findNearest(powerUps.filter(p => NEGATIVE_POWERUPS.includes(p.type)), aiCenter, walls);
  const lowHealth = aiTank.hp < aiTank.maxHp * 0.4;
  const healthPowerUp = powerUps.find(p => p.type === 'health');
  const missilePowerUp = powerUps.find(p => p.type === 'missile');
  const bouncePowerUp = powerUps.find(p => p.type === 'bounce');

  const dxPlayer = playerCenter.x - aiCenter.x;
  const dyPlayer = playerCenter.y - aiCenter.y;
  const distToPlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
  const angleToPlayer = Math.atan2(dyPlayer, dxPlayer);

  decision.targetRotation = angleToPlayer;
  decision.shouldShoot = canSeePlayer;

  if (nearbyNegativePowerUp) {
    const distToNegative = getDistance(aiCenter, nearbyNegativePowerUp.position);
    if (distToNegative < 80) {
      const avoidDir = getDodgeDirection(aiCenter, nearbyNegativePowerUp.position);
      decision.moveX = avoidDir.x * -1;
      decision.moveY = avoidDir.y * -1;
      decision.targetRotation = Math.atan2(avoidDir.y, avoidDir.x);
      decision.shouldShoot = canSeePlayer;
      return decision;
    }
  }

  let moveAngle = angleToPlayer;
  let moveSpeed = 1;

  if (canSeePlayer) {
    if (healthPowerUp && lowHealth && !aiTank.activePowerUps.some(p => p.type === 'health')) {
      const dx = healthPowerUp.position.x - aiCenter.x;
      const dy = healthPowerUp.position.y - aiCenter.y;
      moveAngle = Math.atan2(dy, dx);
      moveSpeed = 1.5;
    } else if (missilePowerUp && !aiTank.hasMissile && distToPlayer > 100) {
      const dx = missilePowerUp.position.x - aiCenter.x;
      const dy = missilePowerUp.position.y - aiCenter.y;
      moveAngle = Math.atan2(dy, dx);
      moveSpeed = 1.5;
    } else if (bouncePowerUp && aiTank.activePowerUps.some(p => p.type === 'bounce') && distToPlayer > 150) {
      const bounceHasBounce = aiTank.activePowerUps.find(p => p.type === 'bounce');
      if (bounceHasBounce && canSeePlayer) {
        const optimalBounceAngle = findOptimalBounceAngle(aiCenter, playerCenter, walls);
        if (optimalBounceAngle !== null) {
          decision.targetRotation = optimalBounceAngle;
        }
      }
      const dx = bouncePowerUp.position.x - aiCenter.x;
      const dy = bouncePowerUp.position.y - aiCenter.y;
      moveAngle = Math.atan2(dy, dx);
      moveSpeed = 1.5;
    } else if (nearbyPositivePowerUp && distToPlayer > 120) {
      const dx = nearbyPositivePowerUp.position.x - aiCenter.x;
      const dy = nearbyPositivePowerUp.position.y - aiCenter.y;
      moveAngle = Math.atan2(dy, dx);
      moveSpeed = 1.5;
    }
  }

  decision.moveX = Math.cos(moveAngle) * moveSpeed;
  decision.moveY = Math.sin(moveAngle) * moveSpeed;

  const now = Date.now();
  const canUseMissile = aiTank.hasMissile && (now - lastMissileTime) > MISSILE_COOLDOWN;

  if (canUseMissile && canSeePlayer && Math.random() > 0.7) {
    decision.shouldUseMissile = true;
  }

  return decision;
}

function findNearest(powerUps: PowerUp[], from: Position, walls: Wall[]): PowerUp | null {
  let nearest: PowerUp | null = null;
  let minDist = Infinity;

  for (const powerUp of powerUps) {
    if (isLineBlocked(from, powerUp.position, walls)) continue;
    const dist = getDistance(from, powerUp.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = powerUp;
    }
  }

  return nearest;
}

function getDistance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isLineBlocked(start: Position, end: Position, walls: Wall[]): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(10, Math.floor(distance / 20));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = start.x + dx * t;
    const y = start.y + dy * t;

    for (const wall of walls) {
      if (
        x >= wall.position.x - 5 &&
        x <= wall.position.x + wall.width + 5 &&
        y >= wall.position.y - 5 &&
        y <= wall.position.y + wall.height + 5
      ) {
        return true;
      }
    }
  }
  return false;
}

function isBulletHeadingTowards(bullet: Position, target: Position, threshold: number): boolean {
  const dx = target.x - bullet.x;
  const dy = target.y - bullet.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < threshold;
}

function getDodgeDirection(aiPos: Position, bulletPos: Position): { x: number; y: number } {
  const dx = aiPos.x - bulletPos.x;
  const dy = aiPos.y - bulletPos.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function clampPosition(pos: Position, width: number, height: number): Position {
  return {
    x: Math.max(5, Math.min(CANVAS_WIDTH - width - 5, pos.x)),
    y: Math.max(5, Math.min(CANVAS_HEIGHT - height - 5, pos.y)),
};
}

function findOptimalBounceAngle(from: Position, to: Position, walls: Wall[]): number | null {
  const directAngle = Math.atan2(to.y - from.y, to.x - from.x);
  
  if (!isLineBlocked(from, to, walls)) {
    return directAngle;
  }
  
  const testAngles = [-Math.PI / 4, Math.PI / 4, -Math.PI / 3, Math.PI / 3, -Math.PI / 2, Math.PI / 2];
  
  for (const offset of testAngles) {
    const testAngle = directAngle + offset;
    const testTarget = {
      x: from.x + Math.cos(testAngle) * 500,
      y: from.y + Math.sin(testAngle) * 500
    };
    
    if (!isLineBlocked(from, testTarget, walls)) {
      return testAngle;
    }
  }
  
  return directAngle;
}
