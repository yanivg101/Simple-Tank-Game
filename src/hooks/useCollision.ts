import { Position, Tank, Bullet, Wall, PowerUp } from '@/game/types';

export function checkCollisionRect(
  pos1: Position,
  width1: number,
  height1: number,
  pos2: Position,
  width2: number,
  height2: number
): boolean {
  return (
    pos1.x < pos2.x + width2 &&
    pos1.x + width1 > pos2.x &&
    pos1.y < pos2.y + height2 &&
    pos1.y + height1 > pos2.y
  );
}

export function checkCollisionCircle(
  pos1: Position,
  radius1: number,
  pos2: Position,
  radius2: number
): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < radius1 + radius2;
}

export function checkTankWallCollision(tank: Tank, wall: Wall): boolean {
  return checkCollisionRect(
    tank.position,
    tank.width,
    tank.height,
    wall.position,
    wall.width,
    wall.height
  );
}

export function checkBulletWallCollision(bullet: Bullet, wall: Wall): boolean {
  return checkCollisionRect(
    { x: bullet.position.x - bullet.radius, y: bullet.position.y - bullet.radius },
    bullet.radius * 2,
    bullet.radius * 2,
    wall.position,
    wall.width,
    wall.height
  );
}

export function checkBulletTankCollision(bullet: Bullet, tank: Tank): boolean {
  return checkCollisionRect(
    bullet.position,
    bullet.radius * 2,
    bullet.radius * 2,
    tank.position,
    tank.width,
    tank.height
  );
}

export function checkTankPowerUpCollision(tank: Tank, powerUp: PowerUp): boolean {
  return checkCollisionCircle(
    { x: tank.position.x + tank.width / 2, y: tank.position.y + tank.height / 2 },
    Math.max(tank.width, tank.height) / 2,
    powerUp.position,
    powerUp.radius
  );
}
