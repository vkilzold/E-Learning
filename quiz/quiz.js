const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const scale = 1;

// Images
let playerIdleImage = new Image();
let playerAttackImage = new Image();
let playerDeathImage = new Image();

let enemyAttackImage = new Image();
let enemyDeathImage = new Image();

// Animation Definitions
const playerAnimations = {
  idle: {
    image: playerIdleImage,
    frameWidth: 256,
    frameHeight: 64,
    totalFrames: 16,
    fps: 12,
  },
  attack: {
    image: playerAttackImage,
    frameWidth: 256,
    frameHeight: 64,
    totalFrames: 39,
    fps: 12,
  },
  death: {
    image: playerDeathImage,
    frameWidth: 256,
    frameHeight: 64,
    totalFrames: 23,
    fps: 12,
  },
};

const enemyAnimations = {
  attack: {
    image: enemyAttackImage,
    frameWidth: 256,
    frameHeight: 64,
    totalFrames: 33,
    fps: 12,
  },
  death: {
    image: enemyDeathImage,
    frameWidth: 256,
    frameHeight: 64,
    totalFrames: 13,
    fps: 12,
  },
};

// Animation State
let currentAnimation = playerAnimations.idle;
let currentFrame = 0;
let lastFrameTime = 0;

let isAttackPlaying = false;
let isDeathPlaying = false;
let currentCharacter = 'player'; // 'player' or 'enemy'

// Load Images
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => reject(`Failed to load image: ${src}`);
  });
}

Promise.all([
  loadImage('animations/enemy1-player-idle.png').then(img => playerIdleImage = img),
  loadImage('animations/enemy1-player-attack.png').then(img => playerAttackImage = img),
  loadImage('animations/enemy1-player-death.png').then(img => playerDeathImage = img),
  loadImage('animations/enemy1-attack-player.png').then(img => enemyAttackImage = img),
  loadImage('animations/enemy1-death-player.png').then(img => enemyDeathImage = img),
]).then(() => {
  playerAnimations.idle.image = playerIdleImage;
  playerAnimations.attack.image = playerAttackImage;
  playerAnimations.death.image = playerDeathImage;
  enemyAnimations.attack.image = enemyAttackImage;
  enemyAnimations.death.image = enemyDeathImage;

  requestAnimationFrame(animate);
}).catch(err => {
  console.error(err);
  requestAnimationFrame(animate);
});

// Animation Loop
function animate(timestamp = 0) {
  const frameDuration = 1000 / currentAnimation.fps;

  if (timestamp - lastFrameTime >= frameDuration) {
    lastFrameTime = timestamp;

    if (isDeathPlaying) {
      if (currentFrame < currentAnimation.totalFrames - 1) {
        currentFrame++;
      }
    } else {
      currentFrame++;

      if (isAttackPlaying && currentFrame >= currentAnimation.totalFrames) {
        currentFrame = 0;
        isAttackPlaying = false;
        isDeathPlaying = false;

        // After attack, return to idle regardless of player or enemy
        currentAnimation = playerAnimations.idle;
      }

      if (!isAttackPlaying && currentFrame >= currentAnimation.totalFrames) {
        currentFrame = 0;
      }
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { image, frameWidth, frameHeight, totalFrames } = currentAnimation;
  const sx = Math.min(currentFrame, totalFrames - 1) * frameWidth;

  if (image && image.complete && image.naturalWidth > 0 && sx + frameWidth <= image.width) {
    const x = 20;
    const y = 60;
    ctx.drawImage(
      image,
      sx, 0, frameWidth, frameHeight,
      x, y, frameWidth * scale, frameHeight * scale
    );
  }

  requestAnimationFrame(animate);
}

// Player Actions
function playPlayerAttack() {
  if (!isAttackPlaying && !isDeathPlaying) {
    currentCharacter = 'player';
    currentAnimation = playerAnimations.attack;
    currentFrame = 0;
    isAttackPlaying = true;
  }
}

function playPlayerDeath() {
  if (!isDeathPlaying) {
    currentCharacter = 'player';
    currentAnimation = playerAnimations.death;
    currentFrame = 0;
    isDeathPlaying = true;
    isAttackPlaying = false;
  }
}

// Enemy Actions
function playEnemyAttack() {
  if (!isAttackPlaying && !isDeathPlaying) {
    currentCharacter = 'enemy';
    currentAnimation = enemyAnimations.attack;
    currentFrame = 0;
    isAttackPlaying = true;
  }
}

function playEnemyDeath() {
  if (!isDeathPlaying) {
    currentCharacter = 'enemy';
    currentAnimation = enemyAnimations.death;
    currentFrame = 0;
    isDeathPlaying = true;
    isAttackPlaying = false;
  }
}

// Event Listeners
document.getElementById('attackPlayerBtn').addEventListener('click', playPlayerAttack);
document.getElementById('deathPlayerBtn').addEventListener('click', playPlayerDeath);
document.getElementById('attackEnemyBtn').addEventListener('click', playEnemyAttack);
document.getElementById('deathEnemyBtn').addEventListener('click', playEnemyDeath);
