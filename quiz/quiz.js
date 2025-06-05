const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Disable smoothing for pixelated effect
ctx.imageSmoothingEnabled = false;

const spriteSheet = new Image();
spriteSheet.src = 'animations/player-idle.png';

const frameWidth = 32;
const frameHeight = 32;
const totalFrames = 16;
let currentFrame = 0;
let lastTime = 0;

const scale = 4;
const fps = 12;
const frameTime = 1000 / fps;

spriteSheet.onload = () => {
  requestAnimationFrame(draw);
};

function draw(timestamp) {
  if (timestamp - lastTime > frameTime) {
    currentFrame = (currentFrame + 1) % totalFrames;
    lastTime = timestamp;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(
    spriteSheet,
    currentFrame * frameWidth, 0,
    frameWidth, frameHeight,
    100, 100,
    frameWidth * scale, frameHeight * scale
  );

  requestAnimationFrame(draw);
}




function changeGIF(gifPath) {
  const img = document.getElementById("animation-sprite");
  
  // Set the selected animation
  img.src = gifPath + '?t=' + new Date().getTime(); // forces reload

  // If it's not the idle animation, return to idle after 1 second
  if (!gifPath.includes('idle')) {
    setTimeout(() => {
      img.src = 'animations/player-idle.gif?t=' + new Date().getTime();
    }, 1000); // 1000 milliseconds = 1 second
  }
}
