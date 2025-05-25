let flowField = [];
let scale = 10;
let cols, rows;
let inc = 0.05;
let zoff = 0;
let soundMap = {};
let isOneSecondMode = false;
let playbackRate = 1.0;
let globalVolume = 0.5;  // 默认最大音量

let particles = [];
const totalParticles = 2000; // 可以调整数量

// 按键对应颜色
const keyColorMap = {
  'Q': [241, 70, 58],
  'A': [239, 106, 106],//255.87.87
  'Z': [247, 147, 38],//Li
  'W': [247, 205, 25],
  'S': [255, 247, 55],
  'X': [255, 250, 154],//Na
  'E': [234, 129, 255],
  'D': [197, 88, 228],
  'C': [197, 167, 255],//K
  'R': [241, 70, 58],
  'F': [237, 104, 29],
  'V': [255, 144, 89],//Ca
  'T': [244, 34, 34],
  'G': [255, 71, 53],
  'B': [255, 138, 129],//Sr
  'Y': [32, 198, 123],
  'H': [126, 217, 87],
  'N': [201, 226, 101],//Ba
  'U': [0, 192, 164],
  'J': [92, 230, 143],
  'M': [111, 250, 220]//cU
};

let keysPressed = new Set();
let singleColorKey = null;    // 当前单键颜色对应的键
let multiColorKeys = new Set(); // 累积的多键模式颜色键集合
let inMultiKeyMode = false;   // 是否处于多键模式

function preload() {
  soundMap = {
    'Q': loadSound('assets/Li_AW_flame_sound_outer.wav'),
    'A': loadSound('assets/Li_AW_flame_sound_inner.wav'),
    'Z': loadSound('assets/Li_AW_flame_sound_core.wav'),
    'W': loadSound('assets/Na_AW_flame_sound_outer.wav'),
    'S': loadSound('assets/Na_AW_flame_sound_inner.wav'),
    'X': loadSound('assets/Na_AW_flame_sound_core.wav'),
    'E': loadSound('assets/K_AW_flame_sound_outer.wav'),
    'D': loadSound('assets/K_AW_flame_sound_inner.wav'),
    'C': loadSound('assets/K_AW_flame_sound_core.wav'),
    'R': loadSound('assets/Ca_AW_flame_sound_outer.wav'),
    'F': loadSound('assets/Ca_AW_flame_sound_inner.wav'),
    'V': loadSound('assets/Ca_AW_flame_sound_core.wav'),
    'T': loadSound('assets/Sr_AW_flame_sound_outer.wav'),
    'G': loadSound('assets/Sr_AW_flame_sound_inner.wav'),
    'B': loadSound('assets/Sr_AW_flame_sound_core.wav'),
    'Y': loadSound('assets/Ba_AW_flame_sound_outer.wav'),
    'H': loadSound('assets/Ba_AW_flame_sound_inner.wav'),
    'N': loadSound('assets/Ba_AW_flame_sound_core.wav'),
    'U': loadSound('assets/Cu_AW_flame_sound_outer.wav'),
    'J': loadSound('assets/Cu_AW_flame_sound_inner.wav'),
    'M': loadSound('assets/Cu_AW_flame_sound_core.wav')
  };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  cols = floor(width / scale);
  rows = floor(height / scale);
  flowField = new Array(cols * rows);

  for (let i = 0; i < totalParticles; i++) {
    particles.push(new FlameParticle());
  }

  background(10);
}

function draw() {
  let yoff = 0;
  for (let y = 0; y < rows; y++) {
    let xoff = 0;
    for (let x = 0; x < cols; x++) {
      let index = x + y * cols;
      let angle = noise(yoff * 1.2, xoff * 0.5, zoff) * TWO_PI;
      angle += PI / 2; // 强制向上
      let v = p5.Vector.fromAngle(angle);
      v.setMag(0.95);
      flowField[index] = v;
      xoff += inc;
    }
    yoff += inc;
  }
  zoff += 0.003;

  fill(0, 0, 0, 15);
  noStroke();
  rect(0, 0, width, height);

  // 计算当前使用的颜色列表
  let colorsToUse = [];

  if (inMultiKeyMode && multiColorKeys.size > 0) {
    let currentColors = Array.from(multiColorKeys).map(k => keyColorMap[k]);
    colorsToUse = getAllColorsCombinations(currentColors);
  } else if (singleColorKey) {
    colorsToUse = [keyColorMap[singleColorKey]];
  } else {
    colorsToUse = [[255, 255, 255]]; // 默认白色
  }

  assignParticlesByColors(particles, colorsToUse);

  // 绘制所有粒子
  for (let p of particles) {
    p.follow(flowField);
    p.update();
    p.edges();
    p.show();
  }
}

// 计算所有颜色组合（两两及单色）
function getAllColorsCombinations(activeColors) {
  let allColors = [...activeColors];
  for (let i = 0; i < activeColors.length; i++) {
    for (let j = i + 1; j < activeColors.length; j++) {
      let c1 = activeColors[i];
      let c2 = activeColors[j];
      let mixed = [
        (c1[0] + c2[0]) / 2,
        (c1[1] + c2[1]) / 2,
        (c1[2] + c2[2]) / 2,
      ];
      allColors.push(mixed);
    }
  }
  return allColors;
}

// 给粒子分配颜色索引（循环分配）
function assignParticlesByColors(particles, colors) {
  let n = particles.length;
  let m = colors.length;
  for (let i = 0; i < n; i++) {
    particles[i].colorIndex = i % m;
    particles[i].assignedColor = colors[particles[i].colorIndex];
  }
}

// 监听键按下事件
function keyPressed() {
  console.log("你按下了:", key, "（keyCode:", keyCode, "）");

  if (key === '1') {
  playbackRate = 1.0;
  updateAllSoundsRate(playbackRate);
  console.log("播放速率：1x");
  return;
} else if (key === '2') {
  playbackRate = 2.0;
  updateAllSoundsRate(playbackRate);
  console.log("播放速率：2x");
  return;
} else if (key === '3') {
  playbackRate = 3.0;
  updateAllSoundsRate(playbackRate);
  console.log("播放速率：3x");
  return;
} else if (key === '4') {
  playbackRate = 0.5;
  updateAllSoundsRate(playbackRate);
  console.log("播放速率：0.5x");
  return;
}

  if (keyCode === 33) { // Page Up 键的 keyCode 是 33
  globalVolume = min(globalVolume + 0.2, 1.0);
  console.log("音量增加至: " + globalVolume.toFixed(2));
  return;
} else if (keyCode === 34) { // Page Down 键的 keyCode 是 34
  globalVolume = max(globalVolume - 0.2, 0.0);
  console.log("音量减少至: " + globalVolume.toFixed(2));
  return;
}


  let k = key.toUpperCase();

  if (key === 'P') {
  isOneSecondMode = true;
  console.log("一秒播放模式启动");
  return;
} else if (key === 'O') {
  isOneSecondMode = false;
  console.log("恢复正常播放模式");
  return;
}

  // 播放对应音频
  if (soundMap[k]) {
  let s = soundMap[k];
  if (s.isPlaying()) {
    s.stop();
  }
  s.rate(playbackRate); // 设置播放速率
  s.setVolume(globalVolume);  // 设置音量
  s.play();
  if (isOneSecondMode) {
    setTimeout(() => {
      if (s.isPlaying()) {
        s.stop();
      }
    }, 1000);
  }
}

  // 空格键重置颜色状态
  if (k === ' ') {
    // 空格键清空所有状态，恢复默认白色
    keysPressed.clear();
    singleColorKey = null;
    multiColorKeys.clear();
    inMultiKeyMode = false;
  } else if (keyColorMap[k]) {
    keysPressed.add(k);

    if (keysPressed.size > 1) {
      // 多键模式进入（永远不退出，累积颜色）
      inMultiKeyMode = true;
      multiColorKeys.add(k);
      singleColorKey = null; // 单键模式失效
    } else if (keysPressed.size === 1) {
      if (!inMultiKeyMode && multiColorKeys.size === 0) {
        // 单键模式，记录当前单键颜色
        singleColorKey = k;
      } else if (inMultiKeyMode) {
        // 多键模式中按下新键累积颜色
        multiColorKeys.add(k);
      }
    }
  }
}

// 监听键释放事件
function keyReleased() {
  let k = key.toUpperCase();
  if (keysPressed.has(k)) {
    keysPressed.delete(k);
  }
  // 多键模式不退出，状态保持
  // 单键模式不受释放影响，颜色持续保持
}

//音量播放更新
function updateAllSoundsRate(rate) {
  for (let key in soundMap) {
    if (soundMap[key].isPlaying()) {
      soundMap[key].rate(rate);
    }
  }
}

// 粒子类
class FlameParticle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 2.8;
    this.prevPos = this.pos.copy();
    this.colorIndex = 0;
    this.assignedColor = [255, 255, 255];
  }

  follow(vectors) {
    let x = floor(this.pos.x / scale);
    let y = floor(this.pos.y / scale);
    let index = x + y * cols;
    let force = vectors[index];
    this.applyForce(force);
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  show() {
    let yRatio = map(this.pos.y, height, 0, 0, 1);
    let r = this.assignedColor[0];
    let g = this.assignedColor[1];
    let b = this.assignedColor[2];
    let alpha = lerp(20, 255, yRatio);
    stroke(r, g, b, alpha);
    strokeWeight(1.6);
    line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
    this.prevPos.set(this.pos);
  }

  edges() {
    if (
      this.pos.x > width || this.pos.x < 0 ||
      this.pos.y > height || this.pos.y < 0
    ) {
      this.pos = createVector(random(width), random(height));
      this.vel = createVector(0, 0);
      this.acc = createVector(0, 0);
      this.prevPos.set(this.pos);
    }
  }
}

// 窗口大小变化，调整画布
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cols = floor(width / scale);
  rows = floor(height / scale);
  flowField = new Array(cols * rows);
}
