const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  level: document.getElementById('level'),
  xp: document.getElementById('xp'),
  xpNext: document.getElementById('xpNext'),
  points: document.getElementById('points'),
  hp: document.getElementById('hp'),
  pauseBtn: document.getElementById('pauseBtn'),
  status: document.getElementById('status')
};

const world = { w: 3000, h: 3000 };
const keys = new Set();
let mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };
let paused = false;

const player = {
  x: world.w / 2,
  y: world.h / 2,
  r: 26,
  angle: 0,
  color: '#2e8fff',
  hp: 100,
  maxHp: 100,
  speed: 230,
  damage: 18,
  reload: 0.26,
  cooldown: 0,
  level: 1,
  xp: 0,
  points: 0,
};

const bullets = [];
const bots = [];
const shapes = [];

const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function spawnShape() {
  const sides = [3, 4, 5][Math.floor(Math.random() * 3)];
  shapes.push({
    x: rand(80, world.w - 80), y: rand(80, world.h - 80),
    r: sides === 3 ? 16 : sides === 4 ? 18 : 22,
    sides,
    hp: sides * 25,
    maxHp: sides * 25,
    xp: sides * 18,
    color: sides === 3 ? '#ffd65a' : sides === 4 ? '#84dbff' : '#ff78ab'
  });
}

function spawnBot() {
  bots.push({
    x: rand(120, world.w - 120), y: rand(120, world.h - 120),
    r: 24,
    angle: 0,
    hp: 80,
    maxHp: 80,
    speed: rand(120, 170),
    damage: 12,
    reload: rand(0.4, 0.7),
    cooldown: rand(0, .6),
    color: '#ff5d6c'
  });
}

for (let i = 0; i < 75; i++) spawnShape();
for (let i = 0; i < 18; i++) spawnBot();

function fire(from, owner, speed = 520) {
  bullets.push({
    x: from.x + Math.cos(from.angle) * (from.r + 7),
    y: from.y + Math.sin(from.angle) * (from.r + 7),
    vx: Math.cos(from.angle) * speed,
    vy: Math.sin(from.angle) * speed,
    life: 1.3,
    damage: from.damage,
    owner,
    r: owner === 'player' ? 6 : 5,
    color: owner === 'player' ? '#2f78ff' : '#ff5d6c'
  });
}

function addXp(amount) {
  player.xp += amount;
  const need = 100 + (player.level - 1) * 45;
  if (player.xp >= need) {
    player.xp -= need;
    player.level += 1;
    player.points += 1;
    ui.status.textContent = `Level up! Você ganhou 1 ponto de upgrade.`;
  }
}

function useUpgrade(stat) {
  if (player.points <= 0) return;
  if (stat === 'reload') player.reload = Math.max(0.11, player.reload - 0.03);
  if (stat === 'damage') player.damage += 3;
  if (stat === 'speed') player.speed += 15;
  if (stat === 'maxHp') {
    player.maxHp += 16;
    player.hp = Math.min(player.maxHp, player.hp + 16);
  }
  player.points -= 1;
}

document.querySelectorAll('[data-stat]').forEach(btn => btn.addEventListener('click', () => useUpgrade(btn.dataset.stat)));

window.addEventListener('keydown', e => {
  keys.add(e.key.toLowerCase());
  if (e.key === '1') useUpgrade('reload');
  if (e.key === '2') useUpgrade('damage');
  if (e.key === '3') useUpgrade('speed');
  if (e.key === '4') useUpgrade('maxHp');
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', () => (mouse.down = true));
canvas.addEventListener('mouseup', () => (mouse.down = false));
ui.pauseBtn.addEventListener('click', () => {
  paused = !paused;
  ui.pauseBtn.textContent = paused ? 'Retomar' : 'Pausar';
});

function drawTank(t, cameraX, cameraY, alpha = 1) {
  ctx.save();
  ctx.translate(t.x - cameraX, t.y - cameraY);
  ctx.rotate(t.angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#8694aa';
  ctx.fillRect(8, -8, t.r + 8, 16);
  ctx.beginPath();
  ctx.arc(0, 0, t.r, 0, Math.PI * 2);
  ctx.fillStyle = t.color;
  ctx.fill();
  ctx.restore();
}

function drawPolygon(s, cameraX, cameraY) {
  const x = s.x - cameraX, y = s.y - cameraY;
  ctx.beginPath();
  for (let i = 0; i <= s.sides; i++) {
    const a = (i / s.sides) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * s.r;
    const py = y + Math.sin(a) * s.r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.fillStyle = s.color;
  ctx.fill();
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (paused) return;

  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  const mag = Math.hypot(dx, dy) || 1;
  player.x += (dx / mag) * player.speed * dt;
  player.y += (dy / mag) * player.speed * dt;
  player.x = clamp(player.x, 0, world.w);
  player.y = clamp(player.y, 0, world.h);

  const camX = clamp(player.x - canvas.width / 2, 0, world.w - canvas.width);
  const camY = clamp(player.y - canvas.height / 2, 0, world.h - canvas.height);
  player.angle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);

  player.cooldown -= dt;
  if (mouse.down && player.cooldown <= 0) {
    fire(player, 'player');
    player.cooldown = player.reload;
  }

  for (const b of bots) {
    const toPlayer = { x: player.x - b.x, y: player.y - b.y };
    b.angle = Math.atan2(toPlayer.y, toPlayer.x);
    const space = dist(b, player);
    if (space > 250) {
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
    } else if (space < 180) {
      b.x -= Math.cos(b.angle) * b.speed * dt * .6;
      b.y -= Math.sin(b.angle) * b.speed * dt * .6;
    }
    b.cooldown -= dt;
    if (b.cooldown <= 0 && space < 700) {
      fire(b, 'bot', 460);
      b.cooldown = b.reload;
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bl = bullets[i];
    bl.x += bl.vx * dt;
    bl.y += bl.vy * dt;
    bl.life -= dt;
    if (bl.life <= 0 || bl.x < 0 || bl.y < 0 || bl.x > world.w || bl.y > world.h) {
      bullets.splice(i, 1); continue;
    }

    if (bl.owner !== 'player' && dist(bl, player) < player.r + bl.r) {
      player.hp -= bl.damage;
      bullets.splice(i, 1);
      if (player.hp <= 0) {
        player.hp = player.maxHp;
        player.x = world.w / 2;
        player.y = world.h / 2;
        player.xp = 0;
        player.level = Math.max(1, player.level - 1);
        ui.status.textContent = 'Você foi destruído! Respawn no centro.';
      }
      continue;
    }

    if (bl.owner === 'player') {
      let hit = false;
      for (let j = bots.length - 1; j >= 0; j--) {
        if (dist(bl, bots[j]) < bots[j].r + bl.r) {
          bots[j].hp -= bl.damage;
          hit = true;
          if (bots[j].hp <= 0) {
            bots.splice(j, 1);
            spawnBot();
            addXp(45);
          }
          break;
        }
      }
      if (!hit) {
        for (let j = shapes.length - 1; j >= 0; j--) {
          if (dist(bl, shapes[j]) < shapes[j].r + bl.r) {
            shapes[j].hp -= bl.damage;
            hit = true;
            if (shapes[j].hp <= 0) {
              addXp(shapes[j].xp);
              shapes.splice(j, 1);
              spawnShape();
            }
            break;
          }
        }
      }
      if (hit) bullets.splice(i, 1);
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f3f7ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d5e4f9';
  ctx.lineWidth = 1;

  const grid = 55;
  const startX = -((camX % grid));
  const startY = -((camY % grid));
  for (let x = startX; x < canvas.width; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = startY; y < canvas.height; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  for (const s of shapes) drawPolygon(s, camX, camY);
  for (const b of bots) drawTank(b, camX, camY, .96);
  drawTank(player, camX, camY);

  for (const bl of bullets) {
    ctx.beginPath();
    ctx.arc(bl.x - camX, bl.y - camY, bl.r, 0, Math.PI * 2);
    ctx.fillStyle = bl.color;
    ctx.fill();
  }

  const need = 100 + (player.level - 1) * 45;
  ui.level.textContent = String(player.level);
  ui.xp.textContent = String(Math.floor(player.xp));
  ui.xpNext.textContent = String(need);
  ui.points.textContent = String(player.points);
  ui.hp.textContent = String(Math.floor(player.hp));
}

requestAnimationFrame(loop);
