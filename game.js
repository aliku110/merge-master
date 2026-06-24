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
  width: 0,
  height: 0,
  fruits: [],
  score: 0,
  highScore: parseInt(localStorage.getItem('mergeMasterHigh') || '0'),
  nextType: 0,
  currentType: 0,
  gameOver: false,
  canDrop: true,
  dropX: 0,
  previewFruit: null,
  totalMerges: 0,
  frameId: null,
};

function initGame() {
  const canvas = document.getElementById('gameCanvas');
  const rect = canvas.parentElement.getBoundingClientRect();
  const size = Math.min(rect.width - 4, 400);

  // Use 2x DPR for sharp rendering
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * 1.4 * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = (size * 1.4) + 'px';

  game.canvas = canvas;
  game.ctx = canvas.getContext('2d');
  game.width = canvas.width;
  game.height = canvas.height;
  game.dpr = dpr;
  game.scale = size / 360; // Base design scale

  // Reset state
  game.fruits = [];
  game.score = 0;
  game.gameOver = false;
  game.canDrop = true;
  game.totalMerges = 0;
  game.currentType = randInt(0, Math.min(4, FRUIT_TYPES.length - 1));
  game.nextType = randInt(0, Math.min(4, FRUIT_TYPES.length - 1));

  updateScore();
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('touchstart', onCanvasTouch);

  // Render loop
  if (game.frameId) cancelAnimationFrame(game.frameId);
  gameLoop();
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Physics constants
const GRAVITY = 2000; // pixels/s²
const RESTITUTION = 0.3;
const FRICTION = 0.99;
const WALL_INSET = 30 * 0.5; // inset from canvas edge

function createFruit(type, x, y) {
  const config = FRUIT_TYPES[type];
  const s = game.dpr;
  return {
    type,
    x: x * s,
    y: y * s,
    vx: 0,
    vy: 0,
    radius: config.radius * s,
    mass: config.radius * config.radius,
    settled: false,
    settleTimer: 0,
  };
}

function addFruit(type, x) {
  const f = createFruit(type, x, 60 * game.dpr);
  f.vy = 100 * game.dpr;
  game.fruits.push(f);
  game.canDrop = false;

  // Allow next drop after fruit settles
  setTimeout(() => { game.canDrop = true; }, 300);
}

function onCanvasClick(e) {
  if (game.gameOver || !game.canDrop) return;
  const rect = game.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  addFruit(game.currentType, x);

  game.currentType = game.nextType;
  game.nextType = randInt(0, Math.min(4, FRUIT_TYPES.length - 1));
  updatePreview();
}

function onCanvasTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = game.canvas.getBoundingClientRect();
  const x = (touch.clientX - rect.left) / rect.width;
  if (game.gameOver || !game.canDrop) return;
  addFruit(game.currentType, x);

  game.currentType = game.nextType;
  game.nextType = randInt(0, Math.min(4, FRUIT_TYPES.length - 1));
  updatePreview();
}

function updatePreview() {
  const preview = document.getElementById('next-preview');
  if (preview) preview.textContent = FRUIT_TYPES[game.nextType].emoji;
}

function updateScore() {
  document.getElementById('score-value').textContent = game.score;
}

function mergeFruits(a, b) {
  if (a.type >= FRUIT_TYPES.length - 1) {
    // Already max type - just remove both, bonus points
    game.score += FRUIT_TYPES[a.type].score * 2;
    removeFruit(a);
    removeFruit(b);
    return;
  }

  const newType = a.type + 1;
  const newX = (a.x + b.x) / 2 / game.dpr;
  const newY = (a.y + b.y) / 2 / game.dpr;

  // Remove old
  removeFruit(a);
  removeFruit(b);

  // Create merged
  const f = createFruit(newType, newX, newY);
  f.vy = -100 * game.dpr; // pop up slightly
  f.vx = (Math.random() - 0.5) * 50 * game.dpr;
  game.fruits.push(f);

  // Score
  game.score += FRUIT_TYPES[newType].score;
  game.totalMerges++;
  updateScore();

  // Particle effect
  createMergeEffect(newX, newY, newType);
}

function removeFruit(fruit) {
  const idx = game.fruits.indexOf(fruit);
  if (idx > -1) game.fruits.splice(idx, 1);
}

// Simple particle effects
let particles = [];

function createMergeEffect(x, y, type) {
  const config = FRUIT_TYPES[type];
  const s = game.dpr;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    particles.push({
      x: x * s,
      y: y * s,
      vx: Math.cos(angle) * 100 * s,
      vy: Math.sin(angle) * 100 * s - 80 * s,
      radius: 4 * s,
      life: 1,
      color: config.color,
    });
  }
}

function checkMerge(fruit) {
  for (let i = 0; i < game.fruits.length; i++) {
    const other = game.fruits[i];
    if (fruit === other) continue;
    if (fruit.type !== other.type) continue;

    const dx = fruit.x - other.x;
    const dy = fruit.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < (fruit.radius + other.radius) * 0.7) {
      mergeFruits(fruit, other);
      return true;
    }
  }
  return false;
}

function physicsStep(dt) {
  const W = game.width;
  const H = game.height;
  const s = game.dpr;
  const inset = 15 * s;
  const leftWall = inset;
  const rightWall = W - inset;
  const ground = H - 20 * s;

  for (const f of game.fruits) {
    if (f.settled) continue;

    // Gravity
    f.vy += GRAVITY * dt * s;

    // Apply velocity
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    // Friction
    f.vx *= FRICTION;

    // Wall collisions
    if (f.x - f.radius < leftWall) {
      f.x = leftWall + f.radius;
      f.vx = -f.vx * RESTITUTION;
    }
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

  // Fruit-fruit collisions
  const pairsChecked = new Set();
  for (let i = 0; i < game.fruits.length; i++) {
    for (let j = i + 1; j < game.fruits.length; j++) {
      const a = game.fruits[i];
      const b = game.fruits[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b.radius;

      if (dist < minDist && dist > 0) {
        // Collision response
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        const totalMass = a.mass + b.mass;

        a.x += nx * overlap * (b.mass / totalMass);
        a.y += ny * overlap * (b.mass / totalMass);
        b.x -= nx * overlap * (a.mass / totalMass);
        b.y -= ny * overlap * (a.mass / totalMass);

        // Velocity response
        const relVx = a.vx - b.vx;
        const relVy = a.vy - b.vy;
        const relVn = relVx * nx + relVy * ny;

        if (relVn < 0) {
          const impulse = -(1 + RESTITUTION) * relVn / totalMass;
          a.vx += impulse * b.mass * nx;
          a.vy += impulse * b.mass * ny;
          b.vx -= impulse * a.mass * nx;
          b.vy -= impulse * a.mass * ny;
        }

        // Reset settle timer
        a.settleTimer = 0;
        b.settleTimer = 0;
        a.settled = false;
        b.settled = false;
      }
    }
  }

  // Check merges (iterate carefully since array changes)
  for (let i = game.fruits.length - 1; i >= 0; i--) {
    const f = game.fruits[i];
    if (f && checkMerge(f)) {
      // Restart merge check since array changed
      break;
    }
  }

  // Game over check
  const dangerLine = 120 * s;
  for (const f of game.fruits) {
    if (f.y - f.radius < dangerLine && f.settled) {
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

// Rendering
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016;
  lastTime = timestamp;

  if (!game.gameOver) {
    physicsStep(dt);
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 500 * game.dpr * dt;
    p.life -= dt * 2;
    if (p.life <= 0) particles.splice(i, 1);
  }

  render();
  game.frameId = requestAnimationFrame(gameLoop);
}

function render() {
  const ctx = game.ctx;
  const W = game.width;
  const H = game.height;
  const s = game.dpr;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#0f0c29');
  gradient.addColorStop(0.5, '#302b63');
  gradient.addColorStop(1, '#24243e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Draw bucket (container area)
  const inset = 15 * s;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2 * s;
  ctx.strokeRect(inset, 40 * s, W - inset * 2, H - 60 * s);

  // Danger line
  ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
  ctx.setLineDash([8 * s, 8 * s]);
  ctx.beginPath();
  ctx.moveTo(inset, 120 * s);
  ctx.lineTo(W - inset, 120 * s);
  ctx.stroke();
  ctx.setLineDash([]);

  // Current fruit indicator (show at top)
  if (!game.gameOver && game.canDrop) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    drawFruit(ctx, game.width / 2, 55 * s, game.currentType, 0.7);
    ctx.restore();
  }

  // Draw fruits
  for (const f of game.fruits) {
    drawFruit(ctx, f.x, f.y, f.type, 1);
  }

  // Draw particles
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Stats
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `${14 * s}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`合成 ${game.totalMerges} 次`, W - 10 * s, H - 5 * s);
}

function drawFruit(ctx, x, y, type, alpha) {
  const config = FRUIT_TYPES[type];
  const radius = config.radius * (game.dpr || 1);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = radius * 0.3;

  // Circle
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
  const fontSize = radius * 1.1;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.emoji, x, y + 2 * (game.dpr || 1));

  ctx.restore();
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
  const b = Math.min(255, (num & 0x0000FF) + percent);
  return `rgb(${r},${g},${b})`;
}

// Event handlers
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

// Handle resize
window.addEventListener('resize', () => {
  if (game.frameId) cancelAnimationFrame(game.frameId);
  particles = [];
  if (!game.gameOver) initGame();
});