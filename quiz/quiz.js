// ---------------------- Supabase Setup ----------------------
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

    const supabaseUrl = "https://idaklprhflgtctumqeus.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYWtscHJoZmxndGN0dW1xZXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTM4NTUsImV4cCI6MjA2NTM2OTg1NX0.Hw47aaPqJeVFWGz4Sx_1qz4EtsWy9rIVv-bFmkpuhX0";

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function loadQuiz() {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .limit(1);
    
      if (error) {
        console.error('Error loading quiz:', error);
        return;
      }
    
      if (!data || data.length === 0) {
        console.warn("No quiz data found");
        return;
      }
    
      const quiz = data[0];
    
      // Use the correct column name
      document.getElementById('question').textContent = quiz.Question;
    
      // Choices is already a JS array now, no parsing needed
      const choices = quiz.Choices;
    
      if (!Array.isArray(choices) || choices.length < 4) {
        console.error("Choices must be an array of at least 4 items");
        return;
      }
    
      document.getElementById('firstChoice').textContent = `A. ${choices[0]}`;
      document.getElementById('secondChoice').textContent = `B. ${choices[1]}`;
      document.getElementById('thirdChoice').textContent = `C. ${choices[2]}`;
      document.getElementById('fourthChoice').textContent = `D. ${choices[3]}`;
    }
    

    loadQuiz();
// ---------------------- Canvas + Animation ----------------------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const scale = 1;

let playerIdleImage = new Image();
let playerAttackImage = new Image();
let playerDeathImage = new Image();
let enemyAttackImage = new Image();
let enemyDeathImage = new Image();

const playerAnimations = {
  idle: { image: null, frameWidth: 256, frameHeight: 64, totalFrames: 16, fps: 12 },
  attack: { image: null, frameWidth: 256, frameHeight: 64, totalFrames: 39, fps: 12 },
  death: { image: null, frameWidth: 256, frameHeight: 64, totalFrames: 23, fps: 12 },
};

const enemyAnimations = {
  attack: { image: null, frameWidth: 256, frameHeight: 64, totalFrames: 33, fps: 12 },
  death: { image: null, frameWidth: 256, frameHeight: 64, totalFrames: 13, fps: 12 },
};

let currentAnimation = null;
let currentFrame = 0;
let lastFrameTime = 0;

let isAttackPlaying = false;
let isDeathPlaying = false;
let currentCharacter = 'player';

// ---------------------- Load Images ----------------------
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
  // Assign images after load
  playerAnimations.idle.image = playerIdleImage;
  playerAnimations.attack.image = playerAttackImage;
  playerAnimations.death.image = playerDeathImage;
  enemyAnimations.attack.image = enemyAttackImage;
  enemyAnimations.death.image = enemyDeathImage;

  // Now it's safe to set the initial animation
  currentAnimation = playerAnimations.idle;
  currentFrame = 0;
  lastFrameTime = 0;

  requestAnimationFrame(animate);
}).catch(err => {
  console.error(err);
});

// ---------------------- Animation Loop ----------------------
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
    const y = 1;
    ctx.drawImage(image, sx, 0, frameWidth, frameHeight, x, y, frameWidth * scale, frameHeight * scale);
  }

  requestAnimationFrame(animate);
}

// ---------------------- Animation Controls ----------------------
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

// ---------------------- Event Listeners ----------------------
document.getElementById('attackPlayerBtn').addEventListener('click', playPlayerAttack);
document.getElementById('deathPlayerBtn').addEventListener('click', playPlayerDeath);
document.getElementById('attackEnemyBtn').addEventListener('click', playEnemyAttack);
document.getElementById('deathEnemyBtn').addEventListener('click', playEnemyDeath);
