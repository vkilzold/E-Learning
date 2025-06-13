const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;

const animations = {
  idle:    { row: 0, frames: 6, fps: 6 },
  attack:  { row: 1, frames: 6, fps: 10 },
  run:     { row: 2, frames: 6, fps: 10 },
  hurt:    { row: 5, frames: 4, fps: 8 },
  die:     { row: 6, frames: 6, fps: 6 },
  powerup: { row: 8, frames: 6, fps: 6 }
};

let currentAnimation = 'idle';
let frameIndex = 0;
let lastUpdate = 0;

const spriteEl = document.getElementById("animation-sprite");

function playAnimation(name) {
  if (animations[name]) {
    currentAnimation = name;
    frameIndex = 0;
    lastUpdate = 0;
  }
}

function animate(timestamp) {
  const anim = animations[currentAnimation];
  if (!lastUpdate) lastUpdate = timestamp;

  const elapsed = timestamp - lastUpdate;

  if (elapsed > 1000 / anim.fps) {
    frameIndex++;
    lastUpdate = timestamp;

    if (frameIndex >= anim.frames) {
      frameIndex = 0;
      if (currentAnimation !== 'idle') {
        currentAnimation = 'idle';
      }
    }

    updateSprite(anim.row, frameIndex);
  }

  requestAnimationFrame(animate);
}

function updateSprite(row, col) {
  const x = -col * FRAME_WIDTH;
  const y = -row * FRAME_HEIGHT;
  spriteEl.style.backgroundPosition = `${x}px ${y}px`;
}

// Start animation
requestAnimationFrame(animate);
