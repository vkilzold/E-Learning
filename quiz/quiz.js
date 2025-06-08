const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; 

let idleSpriteSheet = new Image();
let attackSpriteSheet = new Image();
let deathSpriteSheet = new Image();

const scale = 1.2; // global scale factor for all animations

const animations = {
  idle: {
    image: idleSpriteSheet,
    frameWidth: 256,
    frameHeight: 64,
    totalFrames: 16,
    fps: 12,
  },
  attack: {
    image: attackSpriteSheet,
    frameWidth: 256,
    frameHeight: 64,
    totalFrames: 38,
    fps: 16,
  },
  death: {
    image: deathSpriteSheet,
    frameWidth: 256,
    frameHeight: 64,
    totalFrames: 23,
    fps: 12,
  },
};

let currentAnimation = animations.idle;
let currentFrame = 0;
let lastFrameTime = 0;

let isAttackPlaying = false;
let isDeathPlaying = false;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
  });
}

Promise.all([
  loadImage('animations/player-idle.png').then(img => idleSpriteSheet = img),
  loadImage('animations/player-attack.png').then(img => attackSpriteSheet = img),
  loadImage('animations/player-death.png').then(img => deathSpriteSheet = img),
]).then(() => {
  // update images in animations object after load
  animations.idle.image = idleSpriteSheet;
  animations.attack.image = attackSpriteSheet;
  animations.death.image = deathSpriteSheet;

  requestAnimationFrame(animate);
}).catch(err => {
  console.error(err);
  // start animation anyway with whatever loaded
  requestAnimationFrame(animate);
});

function animate(timestamp = 0) {
  const frameDuration = 1000 / currentAnimation.fps;

  if (timestamp - lastFrameTime >= frameDuration) {
    lastFrameTime = timestamp;

    if (isDeathPlaying) {
      if (currentFrame < currentAnimation.totalFrames - 2) {
        currentFrame++;
      }
    } else {
      currentFrame++;

      if (isAttackPlaying && currentFrame >= currentAnimation.totalFrames) {
        currentAnimation = animations.idle;
        currentFrame = 0;
        isAttackPlaying = false;
      }

      if (!isAttackPlaying && currentFrame >= currentAnimation.totalFrames) {
        currentFrame = 0;
      }
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { image, frameWidth, frameHeight, totalFrames } = currentAnimation;
  const sx = Math.min(currentFrame, totalFrames - 1) * frameWidth;

  if (
    image &&
    image.complete &&
    image.naturalWidth > 0 &&
    sx + frameWidth <= image.width
  ) {
    const x = -20;
    const y = 60;
    ctx.drawImage(
      image,
      sx, 0, frameWidth, frameHeight,
      x, y, frameWidth * scale, frameHeight * scale
    );
  }

  requestAnimationFrame(animate);
}

function playAttackAnimation() {
  if (!isAttackPlaying && !isDeathPlaying) {
    currentAnimation = animations.attack;
    currentFrame = 0;
    isAttackPlaying = true;
  }
}

function playDeathAnimation() {
  if (!isDeathPlaying) {
    currentAnimation = animations.death;
    currentFrame = 0;
    isDeathPlaying = true;
    isAttackPlaying = false;
  }
}

document.getElementById('attackBtn').addEventListener('click', playAttackAnimation);
document.getElementById('deathBtn').addEventListener('click', playDeathAnimation);
