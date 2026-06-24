// 🍉 合成大师 - Merge Master
// A 合成大西瓜 style merge game

const FRUIT_TYPES = [
  { name: '樱桃', emoji: '🍒', radius: 15, score: 2, color: '#e74c3c' },
  { name: '葡萄', emoji: '🍇', radius: 20, score: 4, color: '#9b59b6' },
  { name: '橘子', emoji: '🍊', radius: 25, score: 8, color: '#e67e22' },
  { name: '柠檬', emoji: '🍋', radius: 30, score: 16, color: '#f1c40f' },
  { name: '番茄', emoji: '🍅', radius: 35, score: 32, color: '#e74c3c' },
  { name: '桃子', emoji: '🍑', radius: 42, score: 64, color: '#fd79a8' },
  { name: '苹果', emoji: '🍎', radius: 49, score: 128, color: '#e74c3c' },
  { name: '梨子', emoji: '🍐', radius: 56, score: 256, color: '#27ae60' },
  { name: '西瓜', emoji: '🍉', radius: 65, score: 512, color: '#2ecc71' },
];

// Game state
const game = {
  canvas: null,
  ctx: null,
  width: 0,      // Canvas CSS pixel width (logical)
  height: 0,     // Canvas CSS pixel height (logical)
  dpr: 1,
  fruits: [],
  score: 0,
  highScore: parseInt(localStorage.getItem('mergeMasterHigh') || '0'),
  nextType: 0,
  currentType: 0,
  gameOver: false,
  canDrop: true,
  totalMerges: 0,
  frameId: null,
};

let particles = [];
let lastTime = 0;

// ====== Helpers ======

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0xff) + percent);
  const b = Math.min(255, (num & 0xff) + percent);
  return `rgb(${r},${g},${b})`;
}

// ====== Init ======

function initGame() {
  const canvas = document.getElementById('gameCanvas');
  const parentRect = canvas.parentElement.getBoundingClientRect();
  const logicalWidth = Math.min(parentRect.width - 4, 400);

  const dpr = window.devicePixelRatio || 1;
  const logicalHeight = logicalWidth * 1.4;

  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;
  canvas.style.width = logicalWidth + 'px';
  canvas.style.height = logicalHeight + 'px';

  Object.assign(game, {
    canvas,
    ctx: canvas.getContext('2d'),
    width: logicalWidth,
    height: logicalHeight,
    dpr,
    fruits: [],
    score: 0,
    gameOver: false,
    canDrop: true,
    totalMerges: 0,
    currentType: randInt(0, 4),
    nextType: randInt(0, 4),
  });

  lastTime = 0;
  particles = [];

  updateScore();
  updatePreview();

  if (game.frameId) cancelAnimationFrame(game.frameId);

  // Re-bind events (replace old handlers)
  canvas.onclick = onCanvasClick;
  canvas.ontouchstart = onCanvasTouch;

  gameLoop(performance.now());
}

// ====== Input ======

function getClickRatio(clientX) {
  const rect = game.canvas.getBoundingClientRect();
  return (clientX - rect.left) / rect.width; // 0..1
}

function addFruit(type, ratio) {
  // ratio: 0..1 across the CSS width
  // Convert to logical CSS pixel position, then createFruit will multiply by dpr
  const cssX = ratio * game.width;

  const config = FRUIT_TYPES[type];
  const s = game.dpr;
  const f = {
    type,
    x: cssX * s,
    y: 60 * s,
    vx: 0,
    vy: 100 * s,
    radius: config.radius * s,
    mass: config.radius * config.radius,
    settled: false,
    settleTimer: 0,
  };
  game.fruits.push(f);
  game.canDrop = false;
  setTimeout(() => { game.canDrop = true; }, 300);

  game.currentType = game.nextType;
  game.nextType = randInt(0, 4);
  updatePreview();
}

function onCanvasClick(e) {
  if (game.gameOver || !game.canDrop) return;
  // Check game over BEFORE dropping: any existing fruit above danger line?
  const s = game.dpr;
  const dangerY = 120 * s;
  for (const f of game.fruits) {
    if (f.y - f.radius < dangerY) {
      gameOver();
      return;
    }
  }
  addFruit(game.currentType, getClickRatio(e.clientX));
}

function onCanvasTouch(e) {
  e.preventDefault();
  if (game.gameOver || !game.canDrop) return;
  // Check game over BEFORE dropping
  const s = game.dpr;
  const dangerY = 120 * s;
  for (const f of game.fruits) {
    if (f.y - f.radius < dangerY) {
      gameOver();
      return;
    }
  }
  addFruit(game.currentType, getClickRatio(e.touches[0].clientX));
}

// ====== UI updates ======

function updatePreview() {
  const el = document.getElementById('next-preview');
  if (el) el.textContent = FRUIT_TYPES[game.nextType].emoji;
}

function updateScore() {
  document.getElementById('score-value').textContent = game.score;
}

// ====== Merge logic ======

function removeFruit(fruit) {
  const idx = game.fruits.indexOf(fruit);
  if (idx > -1) game.fruits.splice(idx, 1);
}

function mergeFruits(a, b) {
  if (a.type >= FRUIT_TYPES.length - 1) {
    game.score += FRUIT_TYPES[a.type].score * 2;
    removeFruit(a);
    removeFruit(b);
    updateScore();
    return;
  }

  const newType = a.type + 1;
  const nx = (a.x + b.x) / 2;
  const ny = (a.y + b.y) / 2;

  removeFruit(a);
  removeFruit(b);

  const config = FRUIT_TYPES[newType];
  const s = game.dpr;
  const f = {
    type: newType,
    x: nx,
    y: ny,
    vx: (Math.random() - 0.5) * 50 * s,
    vy: -100 * s,
    radius: config.radius * s,
    mass: config.radius * config.radius,
    settled: false,
    settleTimer: 0,
  };
  game.fruits.push(f);

  game.score += FRUIT_TYPES[newType].score;
  game.totalMerges++;
  updateScore();

  // Particles
  const color = FRUIT_TYPES[newType].color;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    particles.push({
      x: nx, y: ny,
      vx: Math.cos(angle) * 100 * s,
      vy: Math.sin(angle) * 100 * s - 80 * s,
      radius: 4 * s,
      life: 1,
      color,
    });
  }
}

// ====== Physics ======

const GRAVITY = 2000;
const RESTITUTION = 0.3;
const FRICTION = 0.99;

function physicsStep(dt) {
  const s = game.dpr;
  const leftWall = 15 * s;
  const rightWall = game.width * s - 15 * s;
  const ground = game.height * s - 20 * s;
  const dangerY = 120 * s;

  // --- Move & wall collisions ---
  for (const f of game.fruits) {
    if (f.settled) continue;

    f.vy += GRAVITY * s * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vx *= FRICTION;

    // Left wall
    if (f.x - f.radius < leftWall) {
      f.x = leftWall + f.radius;
      f.vx = -f.vx * RESTITUTION;
    }
    // Right wall
    if (f.x + f.radius > rightWall) {
      f.x = rightWall - f.radius;
      f.vx = -f.vx * RESTITUTION;
    }
    // Ground
    if (f.y + f.radius > ground) {
      f.y = ground - f.radius;
      f.vy = -f.vy * RESTITUTION;
      if (Math.abs(f.vy) < 30 * s) {
        f.vy = 0;
        f.settleTimer += dt;
        if (f.settleTimer > 0.3) f.settled = true;
      }
    }
  }

  // --- Merge + Collision (merge same-type first, then resolve remaining overlaps) ---
  let mergedCollision = false;
  for (let i = 0; i < game.fruits.length; i++) {
    for (let j = i + 1; j < game.fruits.length; j++) {
      const a = game.fruits[i];
      const b = game.fruits[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= (a.radius + b.radius) || dist === 0) continue;

      // If same type, MERGE immediately (before collision pushes them apart)
      if (a.type === b.type && a.type < FRUIT_TYPES.length - 1) {
        mergeFruits(a, b);
        mergedCollision = true;
        break; // restart j loop since array changed
      }

      // Different types: collision resolution (push apart)
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = (a.radius + b.radius) - dist;
      const totalMass = a.mass + b.mass;

      // Position correction
      const ratioA = b.mass / totalMass;
      const ratioB = a.mass / totalMass;
      a.x += nx * overlap * ratioA;
      a.y += ny * overlap * ratioA;
      b.x -= nx * overlap * ratioB;
      b.y -= ny * overlap * ratioB;

      // Velocity response
      const relVn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (relVn < 0) {
        const impulse = -(1 + RESTITUTION) * relVn / totalMass;
        a.vx += impulse * b.mass * nx;
        a.vy += impulse * b.mass * ny;
        b.vx -= impulse * a.mass * nx;
        b.vy -= impulse * a.mass * ny;
      }

      a.settleTimer = b.settleTimer = 0;
      a.settled = b.settled = false;
    }
    if (mergedCollision) break; // restart i loop
  }

  // --- Game over check (run every frame as fail-safe) ---
  // Check fruits that have been interacting for a while (not freshly spawned)
  for (const f of game.fruits) {
    if (f.settleTimer > 0.05 && f.y - f.radius < dangerY) {
      gameOver();
      return;
    }
  }
}

function gameOver() {
  game.gameOver = true;
  if (game.score > game.highScore) {
    game.highScore = game.score;
    localStorage.setItem('mergeMasterHigh', game.score.toString());
  }

  document.getElementById('modal-score').textContent = '得分: ' + game.score;
  document.getElementById('modal-highscore').textContent = '最高纪录: ' + game.highScore;
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('modal-title').textContent =
    game.totalMerges > 20 ? '🎉 太厉害了！' : '😅 游戏结束';
}

// ====== Rendering ======

function gameLoop(timestamp) {
  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016;
  lastTime = timestamp;

  if (!game.gameOver) physicsStep(dt);

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 500 * game.dpr * dt;
    p.life -= dt * 3;
    if (p.life <= 0) particles.splice(i, 1);
  }

  render();
  game.frameId = requestAnimationFrame(gameLoop);
}

function render() {
  const { ctx, width, height, dpr: s } = game;
  const W = width * s;
  const H = height * s;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0f0c29');
  grad.addColorStop(0.5, '#302b63');
  grad.addColorStop(1, '#24243e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Bucket outline
  const inset = 15 * s;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2 * s;
  ctx.strokeRect(inset, 40 * s, W - inset * 2, H - 60 * s);

  // Danger line
  ctx.strokeStyle = 'rgba(231,76,60,0.4)';
  ctx.setLineDash([8 * s, 8 * s]);
  ctx.beginPath();
  ctx.moveTo(inset, 120 * s);
  ctx.lineTo(W - inset, 120 * s);
  ctx.stroke();
  ctx.setLineDash([]);

  // Current fruit indicator
  if (!game.gameOver && game.canDrop) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    drawFruit(ctx, W / 2, 55 * s, game.currentType, 0.7);
    ctx.restore();
  }

  // All fruits
  for (const f of game.fruits) {
    drawFruit(ctx, f.x, f.y, f.type, 1);
  }

  // Particles
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Stats
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = `${14 * s}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`合成 ${game.totalMerges} 次`, W - 10 * s, H - 5 * s);
}

function drawFruit(ctx, x, y, type, alpha) {
  const config = FRUIT_TYPES[type];
  const radius = config.radius * game.dpr;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = radius * 0.3;

  // Circle with radial gradient
  const grad = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, radius * 0.1,
    x, y, radius
  );
  grad.addColorStop(0, lightenColor(config.color, 40));
  grad.addColorStop(1, config.color);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Emoji
  ctx.font = `${radius * 1.1}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.emoji, x, y + 2 * game.dpr);

  ctx.restore();
}

// ====== Event wiring ======

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnRestart').addEventListener('click', restartGame);
  document.getElementById('btnRules').addEventListener('click', () => {
    document.getElementById('rules-overlay').classList.remove('hidden');
  });
  document.getElementById('rules-close').addEventListener('click', () => {
    document.getElementById('rules-overlay').classList.add('hidden');
  });
  document.getElementById('modal-btn').addEventListener('click', () => {
    document.getElementById('overlay').classList.add('hidden');
    restartGame();
  });
  initGame();
});

function restartGame() {
  if (game.frameId) cancelAnimationFrame(game.frameId);
  particles = [];
  document.getElementById('overlay').classList.add('hidden');
  initGame();
}

window.addEventListener('resize', () => {
  if (game.frameId) cancelAnimationFrame(game.frameId);
  particles = [];
  if (!game.gameOver) initGame();
});