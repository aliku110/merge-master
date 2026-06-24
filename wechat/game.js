// 🍉 合成大师 - WeChat Mini Game Entry Point
// Adapter to run the HTML5 game in WeChat mini game environment

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const sysInfo = wx.getSystemInfoSync();

const WIDTH = sysInfo.windowWidth;
const HEIGHT = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

canvas.width = WIDTH * DPR;
canvas.height = HEIGHT * DPR;
canvas.style = {} // dummy for compatibility

// ====== Core Game Logic (adapted from game.js) ======

const FRUIT_TYPES = [
  { name: '樱桃', radius: 15, score: 2, color: '#e74c3c' },
  { name: '葡萄', radius: 20, score: 4, color: '#9b59b6' },
  { name: '橘子', radius: 25, score: 8, color: '#e67e22' },
  { name: '柠檬', radius: 30, score: 16, color: '#f1c40f' },
  { name: '番茄', radius: 35, score: 32, color: '#e74c3c' },
  { name: '桃子', radius: 42, score: 64, color: '#fd79a8' },
  { name: '苹果', radius: 49, score: 128, color: '#e74c3c' },
  { name: '梨子', radius: 56, score: 256, color: '#27ae60' },
  { name: '西瓜', radius: 65, score: 512, color: '#2ecc71' },
];

const GRAVITY = 2000;
const RESTITUTION = 0.3;
const FRICTION = 0.99;

const game = {
  canvas, ctx, WIDTH, HEIGHT,
  fruits: [],
  score: 0,
  highScore: parseInt(wx.getStorageSync('mergeMasterHigh') || '0'),
  nextType: 0,
  currentType: 0,
  gameOver: false,
  canDrop: true,
  totalMerges: 0,
  frameId: null,
};

let particles = [];
let lastTime = 0;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createFruit(type, x, y) {
  const config = FRUIT_TYPES[type];
  const s = DPR;
  return {
    type, x: x * s, y: y * s, vx: 0, vy: 0,
    radius: config.radius * s,
    mass: config.radius * config.radius,
    settled: false, settleTimer: 0,
  };
}

function removeFruit(f) {
  const idx = game.fruits.indexOf(f);
  if (idx > -1) game.fruits.splice(idx, 1);
}

function mergeFruits(a, b) {
  if (a.type >= FRUIT_TYPES.length - 1) {
    game.score += FRUIT_TYPES[a.type].score * 2;
    removeFruit(a); removeFruit(b);
    return;
  }
  const newType = a.type + 1;
  const nx = (a.x + b.x) / 2 / DPR;
  const ny = (a.y + b.y) / 2 / DPR;
  removeFruit(a); removeFruit(b);
  const f = createFruit(newType, nx, ny);
  f.vy = -100 * DPR;
  f.vx = (Math.random() - 0.5) * 50 * DPR;
  game.fruits.push(f);
  game.score += FRUIT_TYPES[newType].score;
  game.totalMerges++;
}

function checkMerge(fruit) {
  for (const other of game.fruits) {
    if (fruit === other || fruit.type !== other.type) continue;
    const dx = fruit.x - other.x;
    const dy = fruit.y - other.y;
    if (Math.sqrt(dx*dx + dy*dy) < (fruit.radius + other.radius) * 0.7) {
      mergeFruits(fruit, other);
      return true;
    }
  }
  return false;
}

function physicsStep(dt) {
  const s = DPR;
  const leftWall = 10 * s;
  const rightWall = game.WIDTH * s - 10 * s;
  const ground = game.HEIGHT * s - 20 * s;

  for (const f of game.fruits) {
    if (f.settled) continue;
    f.vy += GRAVITY * dt * s;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vx *= FRICTION;

    if (f.x - f.radius < leftWall) { f.x = leftWall + f.radius; f.vx = -f.vx * RESTITUTION; }
    if (f.x + f.radius > rightWall) { f.x = rightWall - f.radius; f.vx = -f.vx * RESTITUTION; }
    if (f.y + f.radius > ground) {
      f.y = ground - f.radius;
      f.vy = -f.vy * RESTITUTION;
      if (Math.abs(f.vy) < 30 * s) { f.vy = 0; f.settleTimer += dt; if (f.settleTimer > 0.3) f.settled = true; }
    }
  }

  // Fruit-fruit collisions
  for (let i = 0; i < game.fruits.length; i++) {
    for (let j = i + 1; j < game.fruits.length; j++) {
      const a = game.fruits[i], b = game.fruits[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = a.radius + b.radius;
      if (dist < minDist && dist > 0) {
        const nx = dx/dist, ny = dy/dist, overlap = minDist - dist;
        const totalMass = a.mass + b.mass;
        a.x += nx * overlap * (b.mass/totalMass);
        a.y += ny * overlap * (b.mass/totalMass);
        b.x -= nx * overlap * (a.mass/totalMass);
        b.y -= ny * overlap * (a.mass/totalMass);
        const rvx = a.vx - b.vx, rvy = a.vy - b.vy;
        if (rvx*nx + rvy*ny < 0) {
          const impulse = -(1+RESTITUTION)*(rvx*nx+rvy*ny)/totalMass;
          a.vx += impulse * b.mass * nx;
          a.vy += impulse * b.mass * ny;
          b.vx -= impulse * a.mass * nx;
          b.vy -= impulse * a.mass * ny;
        }
        a.settleTimer = 0; b.settleTimer = 0;
        a.settled = false; b.settled = false;
      }
    }
  }

  for (let i = game.fruits.length - 1; i >= 0; i--) {
    if (game.fruits[i] && checkMerge(game.fruits[i])) break;
  }

  // Game over check
  const dangerLine = 60 * s;
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
    wx.setStorageSync('mergeMasterHigh', game.score);
  }
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num>>16) + percent);
  const g = Math.min(255, ((num>>8)&0xff) + percent);
  const b = Math.min(255, (num&0xff) + percent);
  return `rgb(${r},${g},${b})`;
}

function drawFruit(ctx, x, y, type, alpha) {
  const config = FRUIT_TYPES[type];
  const radius = config.radius * DPR;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Circle gradient
  const grad = ctx.createRadialGradient(x - radius*0.3, y - radius*0.3, radius*0.1, x, y, radius);
  grad.addColorStop(0, lightenColor(config.color, 40));
  grad.addColorStop(1, config.color);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI*2);
  ctx.fill();

  // Score text inside
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${radius*0.8}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.score, x, y + 2);

  ctx.restore();
}

function renderGameOverlay() {
  const { ctx, WIDTH, HEIGHT, score, highScore } = game;
  const s = DPR;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, WIDTH*s, HEIGHT*s);

  ctx.fillStyle = '#e74c3c';
  ctx.font = `bold ${40*s}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', WIDTH*s/2, HEIGHT*s*0.3);

  ctx.fillStyle = '#f1c40f';
  ctx.font = `bold ${36*s}px sans-serif`;
  ctx.fillText(`得分: ${score}`, WIDTH*s/2, HEIGHT*s*0.42);

  ctx.fillStyle = '#8a8abf';
  ctx.font = `${20*s}px sans-serif`;
  ctx.fillText(`最高纪录: ${highScore}`, WIDTH*s/2, HEIGHT*s*0.52);

  ctx.fillStyle = '#fff';
  ctx.font = `${22*s}px sans-serif`;
  ctx.fillText('点击屏幕重新开始', WIDTH*s/2, HEIGHT*s*0.65);
}

function render() {
  const ctx = game.ctx;
  const W = game.WIDTH, H = game.HEIGHT;
  const s = DPR;

  ctx.clearRect(0, 0, W*s, H*s);

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H*s);
  grad.addColorStop(0, '#0f0c29');
  grad.addColorStop(0.5, '#302b63');
  grad.addColorStop(1, '#24243e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W*s, H*s);

  // Score
  ctx.fillStyle = '#f1c40f';
  ctx.font = `bold ${28*s}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`得分: ${game.score}`, 10*s, 35*s);

  ctx.fillStyle = '#8a8abf';
  ctx.font = `${14*s}px sans-serif`;
  ctx.fillText(`最高: ${game.highScore}`, 10*s, 55*s);

  // Fruits
  for (const f of game.fruits) {
    drawFruit(ctx, f.x, f.y, f.type, 1);
  }

  // Next fruit preview
  ctx.fillStyle = '#555';
  ctx.font = `${14*s}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('下一个: ' + FRUIT_TYPES[game.nextType].score, (W-10)*s, 30*s);

  // Particles
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * 0.016;
    p.y += p.vy * 0.016;
    p.vy += 500 * s * 0.016;
    p.life -= 0.032;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (game.gameOver) renderGameOverlay();
}

function addFruit(type, xRatio) {
  const f = createFruit(type, xRatio * game.WIDTH, 80);
  f.vy = 100 * DPR;
  game.fruits.push(f);
  game.canDrop = false;
  setTimeout(() => { game.canDrop = true; }, 300);

  game.currentType = game.nextType;
  game.nextType = randInt(0, Math.min(4, FRUIT_TYPES.length - 1));
}

function gameLoop(timestamp) {
  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016;
  lastTime = timestamp;

  if (!game.gameOver) physicsStep(dt);
  render();
  game.frameId = requestAnimationFrame(gameLoop);
}

function restart() {
  game.fruits = [];
  particles = [];
  game.score = 0;
  game.totalMerges = 0;
  game.gameOver = false;
  game.canDrop = true;
  game.currentType = randInt(0, Math.min(4, FRUIT_TYPES.length - 1));
  game.nextType = randInt(0, Math.min(4, FRUIT_TYPES.length - 1));
}

// WeChat touch events
wx.onTouchStart((e) => {
  const touch = e.touches[0];
  const xRatio = touch.x / game.WIDTH;

  if (game.gameOver) {
    restart();
    return;
  }

  if (!game.canDrop) return;
  addFruit(game.currentType, xRatio);
});

// Start
game.currentType = randInt(0, Math.min(4, FRUIT_TYPES.length - 1));
game.nextType = randInt(0, Math.min(4, FRUIT_TYPES.length - 1));
gameLoop(performance.now());