import { Tank, Bullet, Wall, PowerUp, PowerUpType, Missile } from '@/game/types';
import { COLORS } from '@/game/constants';

export function drawTank(
  ctx: CanvasRenderingContext2D,
  tank: Tank,
  mouseX: number,
  mouseY: number
) {
  const { position, rotation, barrelRotation, width, height, hp, maxHp, isPlayer, activePowerUps } = tank;
  const centerX = position.x + width / 2;
  const centerY = position.y + height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);

  ctx.fillStyle = isPlayer ? COLORS.player : COLORS.ai;
  ctx.strokeStyle = isPlayer ? COLORS.playerDark : COLORS.aiDark;
  ctx.lineWidth = 2;

  ctx.fillRect(-width / 2, -height / 2.5, width, height / 1.25);
  ctx.strokeRect(-width / 2, -height / 2.5, width, height / 1.25);

  ctx.restore();

  ctx.save();
  ctx.translate(centerX - Math.cos(rotation) * 8, centerY - Math.sin(rotation) * 8);
  ctx.rotate(barrelRotation);

  ctx.fillStyle = isPlayer ? COLORS.playerDark : COLORS.aiDark;
  ctx.fillRect(0, -3, width / 2 + 5, 6);

  ctx.fillStyle = isPlayer ? COLORS.player : COLORS.ai;
  ctx.beginPath();
  ctx.arc(0, 0, width / 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  const hpBarWidth = width;
  const hpBarHeight = 4;
  const hpBarY = position.y - 10;
  const hpPercent = hp / maxHp;

  ctx.fillStyle = '#333';
  ctx.fillRect(position.x, hpBarY, hpBarWidth, hpBarHeight);

  ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FF9800' : '#F44336';
  ctx.fillRect(position.x, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

  const now = Date.now();
  const activeTimedPowerUps = activePowerUps.filter(p => 
    ['speed', 'rapidFire', 'shield', 'slow', 'confuse', 'bounce'].includes(p.type)
  );
  
  if (activeTimedPowerUps.length > 0) {
    const powerUpBarY = position.y - 6;
    const powerUpBarHeight = 2;
    const numPowerUps = Math.min(activeTimedPowerUps.length, 4);
    const barWidth = hpBarWidth / numPowerUps;
    
    activeTimedPowerUps.slice(0, 4).forEach((p, index) => {
      const remaining = Math.max(0, p.expiresAt - now);
      const totalDuration = 10000;
      const percent = remaining / totalDuration;
      
      const colors: Record<string, string> = {
        speed: COLORS.powerUpSpeed,
        rapidFire: COLORS.powerUpRapidFire,
        shield: COLORS.powerUpShield,
        slow: COLORS.powerUpSlow,
        confuse: COLORS.powerUpConfuse,
        bounce: COLORS.powerUpBounce,
      };
      
      ctx.fillStyle = '#222';
      ctx.fillRect(position.x + index * barWidth, powerUpBarY, barWidth - 1, powerUpBarHeight);
      
      ctx.fillStyle = colors[p.type] || '#888';
      ctx.fillRect(position.x + index * barWidth, powerUpBarY, barWidth * percent - 1, powerUpBarHeight);
    });
  }

  const speedPowerUp = activePowerUps.find((p) => p.type === 'speed');
  const rapidFirePowerUp = activePowerUps.find((p) => p.type === 'rapidFire');

  if (speedPowerUp) {
    ctx.fillStyle = COLORS.powerUpSpeed;
    ctx.beginPath();
    ctx.arc(position.x + width - 8, position.y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (rapidFirePowerUp) {
    ctx.fillStyle = COLORS.powerUpRapidFire;
    ctx.beginPath();
    ctx.arc(position.x + width - 8, position.y + 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  const shieldPowerUp = activePowerUps.find((p) => p.type === 'shield');
  if (shieldPowerUp) {
    ctx.strokeStyle = COLORS.powerUpShield;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, width * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if ((tank as any).hasMissile) {
    ctx.fillStyle = COLORS.powerUpMissile;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🚀', position.x + width / 2, position.y + height + 12);
  }
}

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet, isRapidFire: boolean = false) {
  const { position, rotation, radius } = bullet;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(rotation);

  const bulletRadius = isRapidFire ? radius * 1.5 : radius;
  const bulletColor = isRapidFire ? '#FF4500' : COLORS.bullet;
  const glowColor = isRapidFire ? '#FF6B6B' : '#FFD700';

  if (isRapidFire) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
  }

  ctx.fillStyle = bulletColor;
  ctx.beginPath();
  ctx.arc(0, 0, bulletRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(0, 0, bulletRadius / 2, 0, Math.PI * 2);
  ctx.fill();

  if (isRapidFire) {
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bulletRadius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawWall(ctx: CanvasRenderingContext2D, wall: Wall) {
  const { position, width, height, hp, maxHp, isDestructible, requiresFirePowerUp } = wall;
  const healthPercent = hp / maxHp;

  if (!isDestructible) {
    ctx.fillStyle = COLORS.wallIndestructible;
    ctx.fillRect(position.x, position.y, width, height);

    ctx.strokeStyle = COLORS.wallIndestructibleBorder;
    ctx.lineWidth = 3;
    ctx.strokeRect(position.x, position.y, width, height);

    ctx.strokeStyle = COLORS.wallIndestructible;
    ctx.lineWidth = 1;
    const crossSize = 6;
    ctx.beginPath();
    ctx.moveTo(position.x + width / 2 - crossSize, position.y + height / 2 - crossSize);
    ctx.lineTo(position.x + width / 2 + crossSize, position.y + height / 2 + crossSize);
    ctx.moveTo(position.x + width / 2 + crossSize, position.y + height / 2 - crossSize);
    ctx.lineTo(position.x + width / 2 - crossSize, position.y + height / 2 + crossSize);
    ctx.stroke();
    return;
  }

  if (requiresFirePowerUp) {
    const pulse = 0.7 + Math.sin(Date.now() / 200) * 0.3;
    ctx.fillStyle = `rgba(139, 69, 19, ${pulse})`;
    ctx.fillRect(position.x, position.y, width, height);
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.strokeRect(position.x, position.y, width, height);
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥', position.x + width / 2, position.y + height / 2);
    return;
  }

  let color = COLORS.wall;
  if (healthPercent < 0.3) {
    color = '#8B0000';
  } else if (healthPercent < 0.6) {
    color = COLORS.wallDamaged;
  }

  ctx.fillStyle = color;
  ctx.fillRect(position.x, position.y, width, height);

  ctx.strokeStyle = COLORS.wallBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(position.x, position.y, width, height);

  if (healthPercent < 1) {
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.3;
    const crackSize = (1 - healthPercent) * 10;
    for (let i = 0; i < 3; i++) {
      const cx = position.x + Math.random() * width;
      const cy = position.y + Math.random() * height;
      ctx.beginPath();
      ctx.arc(cx, cy, crackSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawPowerUp(ctx: CanvasRenderingContext2D, powerUp: PowerUp) {
  const { position, type, spawnTime } = powerUp;
  const age = Date.now() - spawnTime;
  const dying = age > 10000;

  ctx.save();
  ctx.translate(position.x, position.y);

  if (dying) {
    ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 50) * 0.3;
  }

  let emoji = '';

  switch (type) {
    case 'health': emoji = '❤️'; break;
    case 'speed': emoji = '⚡'; break;
    case 'rapidFire': emoji = '🔥'; break;
    case 'shield': emoji = '🛡️'; break;
    case 'slow': emoji = '🐌'; break;
    case 'confuse': emoji = '🌀'; break;
    case 'missile': emoji = '🚀'; break;
    case 'bounce': emoji = '🔄'; break;
  }

  ctx.font = '36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 0, 2);

  ctx.restore();
}

export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number
) {
  const maxRadius = 40;
  const radius = maxRadius * progress;
  const alpha = 1 - progress;

  ctx.save();
  ctx.globalAlpha = alpha;

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, '#FFF');
  gradient.addColorStop(0.3, '#FFD700');
  gradient.addColorStop(0.6, '#FF4500');
  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawSpawnBase(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string = 'rgba(100, 200, 100, 0.4)', fillColor?: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
  ctx.fillStyle = fillColor || color.replace('0.4', '0.08');
  ctx.fillRect(x - 5, y - 5, width + 10, height + 10);
  ctx.restore();
}

export function drawMissile(ctx: CanvasRenderingContext2D, missile: Missile) {
  const { position, rotation } = missile;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(rotation);

  ctx.fillStyle = COLORS.powerUpMissile;
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-10, -6);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
