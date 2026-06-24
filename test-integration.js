const fs = require('fs');

// Minimal browser env
global.localStorage = { getItem: () => null, setItem: () => {} };
global.performance = { now: () => Date.now() };
global.setTimeout = setTimeout; global.clearTimeout = clearTimeout;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = () => {};

let mockCanvas = {
  width: 0, height: 0, style: { width: '', height: '' },
  onclick: null, ontouchstart: null,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 560 }),
  parentElement: { getBoundingClientRect: () => ({ width: 400 }) },
  getContext: () => ({
    clearRect: ()=>{}, fillRect: ()=>{}, fillText: ()=>{}, fill: ()=>{},
    strokeRect: ()=>{}, stroke: ()=>{}, beginPath: ()=>{},
    arc: ()=>{}, moveTo: ()=>{}, lineTo: ()=>{}, setLineDash: ()=>{},
    save: ()=>{}, restore: ()=>{},
    createLinearGradient: ()=>({addColorStop:()=>{}}),
    createRadialGradient: ()=>({addColorStop:()=>{}}),
    fillStyle: '', strokeStyle: '', lineWidth: 0, globalAlpha: 1,
    shadowColor: '', shadowBlur: 0, font: '', textAlign: '', textBaseline: '',
  }),
};
global.document = {
  getElementById: (id) => {
    if (id === 'gameCanvas') return mockCanvas;
    return { textContent: '', classList: {add:()=>{},remove:()=>{}}, addEventListener: ()=>{}, onclick:null };
  },
  addEventListener: () => {},
};
global.window = {
  devicePixelRatio: 2, localStorage: global.localStorage,
  addEventListener: () => {}, cancelAnimationFrame: () => {},
  requestAnimationFrame: global.requestAnimationFrame,
};

const gameCode = fs.readFileSync('game.js', 'utf8');

const testCode = `
setTimeout(() => {
  let pass = 0, fail = 0;
  function check(name, cond, detail) {
    if (cond) { console.log('  ✅ ' + name); pass++; }
    else { console.log('  ❌ ' + name + (detail ? ' - ' + detail : '')); fail++; }
  }

  // Manually init! (simulates browser DOMContentLoaded)
  initGame();

  setTimeout(() => {
    console.log('\\n== Test 1: Initialization ==');
    check('width > 0', game.width > 0, 'got ' + game.width);
    check('height > 0', game.height > 0, 'got ' + game.height);
    check('dpr = 2', game.dpr === 2, 'got ' + game.dpr);
    check('canDrop', game.canDrop);

    console.log('\\n== Test 2: Drop fruit at center ==');
    addFruit(1, 0.5);
    check('1 fruit added', game.fruits.length === 1, 'got ' + game.fruits.length);
    if (game.fruits.length > 0) {
      const f = game.fruits[0];
      const expectedX = 0.5 * game.width * game.dpr;
      check('x matches click', Math.abs(f.x - expectedX) < 2, 'expected ' + expectedX + ' got ' + f.x);
      check('vy positive', f.vy > 0, 'vy=' + f.vy);
    }

    console.log('\\n== Test 3: Physics (fruit falls down) ==');
    const oldY = game.fruits[0].y;
    // Run 5 physics steps
    for (let i = 0; i < 5; i++) physicsStep(0.016);
    const newY = game.fruits[0].y;
    check('fruit moves down', newY > oldY, 'y ' + oldY.toFixed(0) + ' -> ' + newY.toFixed(0));

    console.log('\\n== Test 4: Wall collision ==');
    const wallF = { type: 2, x: -20, y: 600, vx: -100, vy: 50, radius: 50, mass: 2500, settled: false, settleTimer: 0 };
    game.fruits = [wallF];
    for (let i = 0; i < 3; i++) physicsStep(0.016);
    check('bounced right off left wall', wallF.x > 10, 'x=' + wallF.x.toFixed(0));

    console.log('\\n== Test 5: Merge ==');
    game.score = 0;
    const f1 = { type: 0, x: 400, y: 900, vx: 0, vy: 0, radius: 30, mass: 900, settled: true, settleTimer: 0.5 };
    const f2 = { type: 0, x: 425, y: 910, vx: 0, vy: 0, radius: 30, mass: 900, settled: true, settleTimer: 0.5 };
    game.fruits = [f1, f2];
    game.gameOver = false;
    for (let i = 0; i < 3; i++) physicsStep(0.016);
    check('merge happened (1 fruit left, type increased)',
      game.fruits.length === 1 && game.fruits[0].type === 1,
      'fruits=' + game.fruits.length + ' type=' + (game.fruits[0] ? game.fruits[0].type : '?'));

    console.log('\\n== Test 6: Game over ==');
    game.fruits = [{ type: 0, x: 400, y: 50, vx: 0, vy: 0, radius: 30, mass: 900, settled: true, settleTimer: 0.5 }];
    game.gameOver = false;
    physicsStep(0.016);
    check('game over triggered', game.gameOver, 'gameOver=' + game.gameOver);

    console.log('\\n== ' + pass + '/' + (pass+fail) + ' passed ==');
    process.exit(fail > 0 ? 1 : 0);
  }, 50);
}, 10);
`;

eval(gameCode + '\n' + testCode);