const { Responsive } = P5Template;

let cap;
let notes = [];
let follower;
let seaEmojis = ['🌊', '🐚', '🏖️', '🛥️', '🌴', '🐳', '🌅', '🐬', '🐠', '🌞'];
let lineColors = ['#6439FF', '#4F75FF', '#00CCDD', '#7CF5FF'];
let waveOffset = 0;
let particles = [];
let shootingStars = [];

function setup() {
  new Responsive().createResponsiveCanvas(800, 600, 'contain', true);

  cap = createCapture(VIDEO);
  cap.size(320, 240);
  cap.hide();

  textAlign(CENTER, CENTER);
  textFont('sans-serif');

  for (let i = 0; i < 100; i++) {
    particles.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      speed: random(0.2, 0.5),
      alpha: random(80, 180),
    });
  }

  for (let i = 0; i < 5; i++) {
    shootingStars.push(createShootingStar());
  }

  // 이모지 팔로워 생성
  follower = new CursorFollower(random(seaEmojis));
}

function draw() {
  if (cap.width === 0 || cap.height === 0) return;

  drawGradientBackground();
  drawShootingStars();
  drawWaveBackground();
  drawParticles();

  cap.loadPixels();

  let ratio = max(width / cap.width, height / cap.height);
  let lineHeight = height / 30;
  let lineSpan = 5;

  for (let y = lineHeight; y <= height - lineHeight; y += lineHeight) {
    for (let x = 0; x < width; x += lineSpan) {
      let cx = cap.width / 2 - (-width / 2 + x) / ratio;
      let cy = cap.height / 2 - (height / 2 - y) / ratio;

      let bright = getCamBrightness(cx, cy);
      let contrast = constrain(map(bright, 0.3, 0.7, 1, 0), 0, 1);
      let powCol = pow(contrast, 1.2);
      let size = map(powCol, 1, 0, lineHeight * 0.6, 0.1);
      size += (noise(x + frameCount / 10000, y) - 0.5) * lineHeight * 0.05;

      let waveShift = sin(x * 0.01 + frameCount * 0.02) * 10;
      let cyOffset = y + 30 * powCol + waveShift;

      noStroke();
      fill(color(random(lineColors)));
      circle(x + lineSpan / 2, cyOffset, size);
    }
  }

  if (mouseIsPressed && frameCount % 4 === 0) {
    createEmojiText(mouseX, mouseY);
  }

  for (let i = notes.length - 1; i >= 0; i--) {
    let n = notes[i];
    fill(n.r, n.g, n.b, n.alpha);
    textSize(n.size);
    text(n.char, n.x, n.y);
    n.y -= 1;
    n.alpha -= 4;
    n.life--;
    if (n.life < 0 || n.alpha <= 0) {
      notes.splice(i, 1);
    }
  }

  // 이모지 부드럽게 마우스를 향해 이동
  follower.arrive(createVector(mouseX, mouseY));
  follower.update();
  follower.display();

  // 🎯 반투명 흰색 원을 마우스 커서에 고정
  noStroke();
  fill(255, 100);
  circle(mouseX, mouseY, 30);
}

function mousePressed() {
  createEmojiText(mouseX, mouseY);
  follower.char = random(seaEmojis); // 클릭 시 이모지 바꾸기
}

function createEmojiText(x, y) {
  notes.push({
    x: constrain(x, 0, width),
    y: constrain(y, 0, height),
    char: random(seaEmojis),
    size: random(20, 40),
    r: random(200, 255),
    g: random(200, 255),
    b: random(200, 255),
    alpha: 255,
    life: 60,
  });
}

function getCamBrightness(x, y) {
  x = constrain(floor(x), 0, cap.width - 1);
  y = constrain(floor(y), 0, cap.height - 1);
  let i = 4 * (y * cap.width + x);
  let r = cap.pixels[i];
  let g = cap.pixels[i + 1];
  let b = cap.pixels[i + 2];
  return map((r + g + b) / 3, 0, 255, 1, 0);
}

function drawGradientBackground() {
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(color('#0f2027'), color('#2c5364'), inter);
    stroke(c);
    line(0, y, width, y);
  }
}

function drawWaveBackground() {
  noFill();
  stroke(255, 20);
  strokeWeight(1);
  beginShape();
  for (let x = 0; x <= width; x += 10) {
    let y = height * 0.9 + sin(x * 0.01 + waveOffset) * 20;
    vertex(x, y);
  }
  endShape();
  waveOffset += 0.02;
}

function drawParticles() {
  noStroke();
  for (let p of particles) {
    fill(255, p.alpha);
    ellipse(p.x, p.y, p.size);
    p.y += p.speed;
    if (p.y > height) {
      p.y = 0;
      p.x = random(width);
    }
  }
}

function drawShootingStars() {
  for (let s of shootingStars) {
    stroke(255, s.alpha);
    strokeWeight(2);
    line(s.x, s.y, s.x - s.length * s.dx, s.y - s.length * s.dy);
    s.x += s.dx * s.speed;
    s.y += s.dy * s.speed;
    s.alpha -= 3;

    if (s.alpha <= 0) {
      Object.assign(s, createShootingStar());
    }
  }
}

function createShootingStar() {
  let angle = random(PI / 8, PI / 3);
  return {
    x: random(width),
    y: random(-height / 2, 0),
    dx: cos(angle),
    dy: sin(angle),
    speed: random(4, 7),
    length: random(80, 150),
    alpha: 255,
  };
}

// 🌀 마우스를 향해 부드럽게 도착하는 이모지 클래스
class CursorFollower {
  constructor(char) {
    this.position = createVector(width / 2, height / 2);
    this.velocity = createVector(0, 0);
    this.acceleration = createVector(0, 0);
    this.maxspeed = 8;
    this.maxforce = 0.2;
    this.char = char;
  }

  arrive(target) {
    let desired = p5.Vector.sub(target, this.position);
    let d = desired.mag();

    if (d < 100) {
      let m = map(d, 0, 100, 0, this.maxspeed);
      desired.setMag(m);
    } else {
      desired.setMag(this.maxspeed);
    }

    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxforce);
    this.applyForce(steer);
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  display() {
    textSize(32);
    fill(255);
    text(this.char, this.position.x, this.position.y - 20);
  }
}
