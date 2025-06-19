// ---------------------- Supabase Setup ----------------------
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

    const supabaseUrl = "https://idaklprhflgtctumqeus.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYWtscHJoZmxndGN0dW1xZXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTM4NTUsImV4cCI6MjA2NTM2OTg1NX0.Hw47aaPqJeVFWGz4Sx_1qz4EtsWy9rIVv-bFmkpuhX0";

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function loadQuiz(index) {
      showLoadingPopup();
      await new Promise(res => setTimeout(res, 1000)); // Wait for animation (2s)
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*');
      hideLoadingPopup();
      if (error || !data || data.length === 0 || index >= data.length) {
        console.error('Error loading quiz or index out of range:', error);
        alert("Quiz finished or error loading!");
        return;
      }
      totalQuestions = data.length;
      const quiz = data[index];
      document.getElementById('question').textContent = quiz.Question;
      const choices = quiz.Choices;
      if (!Array.isArray(choices) || choices.length < 4) {
        console.error("Choices must be an arr ay of at least 4 items");
        return;
      }
      document.getElementById('firstChoice').textContent = `${choices[0]}`;
      document.getElementById('secondChoice').textContent = `${choices[1]}`;
      document.getElementById('thirdChoice').textContent = `${choices[2]}`;
      document.getElementById('fourthChoice').textContent = `${choices[3]}`;
      document.querySelectorAll('.choice').forEach(choice => {
        choice.classList.remove('correct', 'wrong', 'selected');
      });
      updateQuestionNumber(index);
      startQuestionTimer();
    }
    

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
    const x = 12;
    const y = -30;
    ctx.drawImage(image, sx, 0, frameWidth, frameHeight, x, y, frameWidth * scale, frameHeight * scale);
  }

  requestAnimationFrame(animate);
}
// ---------------------- Quiz Logic  ----------------------

let currentIndex = 0;
let totalQuestions = 10;
let countCorrectAnswer = 0; // Score Counter
let countIncorrectAnswer = 0;
let scoreMultiplier = 1.5;
let scorePoints = 200;
let countStreak = 0;
let userPoint = 0;

function showLoadingPopup() {
  document.getElementById('loadingPopup').classList.remove('hidden');
}

function hideLoadingPopup() {
  document.getElementById('loadingPopup').classList.add('hidden');
}

function scoreRefresh() {
  document.getElementById('temp-score').textContent = `${userPoint}`;
}
async function checkAnswerAndAnimate() {
  const selectedChoice = document.querySelector('.choice.selected');
  if (!selectedChoice) {
    alert("Please select an answer first.");
    return;
  }
  const selectedAnswer = selectedChoice.textContent.trim();
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('Answer')
    .range(currentIndex, currentIndex)
    .single();
  if (error || !data || !data.Answer) {
    console.error("Error fetching answer:", error);
    return;
  }
  const correctAnswer = data.Answer.trim();
  const choices = document.querySelectorAll('.choice');
  choices.forEach(choice => {
    choice.classList.remove('correct', 'wrong');
    if (choice.textContent.trim() === correctAnswer) {
      choice.classList.add('correct');
    } else if (choice === selectedChoice) {
      choice.classList.add('wrong');
    }
  });
  if (selectedAnswer === correctAnswer) {
    playPlayerAttack();
    countCorrectAnswer++;
    userPoint+=scorePoints;
    scoreRefresh();
    showScoreAnimation('+200');
    countStreak++;
    updateStreakFire();
  } else {
    playEnemyAttack();
    countIncorrectAnswer++;
    scoreRefresh();
    countStreak = 0;
    updateStreakFire();
  }
  // Wait for animation, then show loading popup, then load next question after popup hides
  setTimeout(async () => {
    showLoadingPopup();
    setTimeout(async () => {
      hideLoadingPopup();
      currentIndex++;
      if (currentIndex < totalQuestions) {
        await loadQuiz(currentIndex);
      } else {
        await showEndMessageWithAnimation();
      }
    }, 800); // loading popup visible for 0.8s
  }, 3000); // wait for animation (3s)
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
// Wait until DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const choices = document.querySelectorAll('.choice');

  choices.forEach(choice => {
    choice.addEventListener('click', () => {
      // Remove 'selected' class from all choices
      choices.forEach(c => c.classList.remove('selected'));

      // Add 'selected' class to the clicked one
      choice.classList.add('selected');
    });
  });

  loadQuiz(0);
});

// ---------------------- Event Listeners ----------------------
document.querySelector('.playButton').addEventListener('click', checkAnswerAndAnimate);

// Update question number dynamically
function updateQuestionNumber(index) {
  const questionNumberElem = document.querySelector('.title h2');
  if (questionNumberElem) {
    questionNumberElem.textContent = `Question ${index + 1}`;
  }
}

// Timer logic: display as a number, reset and start on each question
let timerInterval = null;
let timerSeconds = 30; // default, can be set per question

function startQuestionTimer() {
  clearInterval(timerInterval);
  // Set timerSeconds based on difficulty if needed, else default to 30
  timerSeconds = 30;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      handleTimeOut();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerElem = document.getElementById('timer-number');
  if (timerElem) {
    timerElem.textContent = timerSeconds;
    // Color logic: green > 20, orange 10-20, red < 10
    if (timerSeconds > 20) {
      timerElem.style.color = '#4caf50'; // green
      timerElem.style.borderColor = '#4caf50';
      timerElem.style.boxShadow = '0 0 12px #4caf50cc';
      timerElem.style.backgroundColor = 'rgba(76, 175, 80, 0.18)';
    } else if (timerSeconds > 10) {
      timerElem.style.color = '#ff9800'; // orange
      timerElem.style.borderColor = '#ff9800';
      timerElem.style.boxShadow = '0 0 12px #ff9800cc';
      timerElem.style.backgroundColor = 'rgba(255, 152, 0, 0.18)';
    } else {
      timerElem.style.color = '#ff1744'; // red
      timerElem.style.borderColor = '#ff1744';
      timerElem.style.boxShadow = '0 0 12px #ff1744cc';
      timerElem.style.backgroundColor = 'rgba(255, 23, 68, 0.18)';
    }
  }
}

// Add this function at the end of the file
function showScoreAnimation(text) {
  const animDiv = document.getElementById('score-animation');
  if (!animDiv) return;
  animDiv.innerHTML = `<span class="score-animate">${text}</span>`;
  setTimeout(() => {
    animDiv.innerHTML = '';
  }, 1200);
}

function updateStreakFire() {
  const fire = document.getElementById('streak-fire');
  const tempScore = document.getElementById('temp-score');
  const container = document.querySelector('.container');
  if (!fire || !tempScore || !container) return;
  // Remove all streak classes
  tempScore.classList.remove('temp-score-streak-orange', 'temp-score-streak-violet', 'temp-score-streak-blue', 'temp-score-streak');
  // Aura logic
  container.classList.remove('container-aura-orange', 'container-aura-purple', 'container-aura-blue');
  if (countStreak >= 8) {
    fire.classList.add('streak-fire-blue');
    fire.classList.remove('streak-fire-violet');
    container.classList.add('container-aura-blue');
    tempScore.classList.add('temp-score-streak-blue');
  } else if (countStreak >= 4) {
    fire.classList.add('streak-fire-violet');
    fire.classList.remove('streak-fire-blue');
    container.classList.add('container-aura-purple');
    tempScore.classList.add('temp-score-streak-violet');
  } else if (countStreak >= 2) {
    fire.classList.remove('streak-fire-violet', 'streak-fire-blue');
    container.classList.add('container-aura-orange');
    tempScore.classList.add('temp-score-streak-orange');
  } else {
    fire.classList.remove('streak-fire-violet', 'streak-fire-blue');
  }
  // Animate fire icon and temp-score gradient in/out smoothly
  if (countStreak >= 2) {
    fire.style.display = 'inline-block';
    setTimeout(() => {
      fire.classList.add('streak-fire-active');
    }, 10);
  } else {
    fire.classList.remove('streak-fire-active');
    setTimeout(() => {
      if (countStreak < 2) fire.style.display = 'none';
    }, 500);
  }
}

// Timer durations for each type
const TIMER_DURATIONS = {
  easy: 30,
  average: 45,
  difficult: 60
};

function getTimerDuration(type) {
  // Placeholder: always return 30 for now
  // In the future, use type ('easy', 'average', 'difficult')
  return TIMER_DURATIONS.easy;
}

let totalTimeSpent = 0;
let totalQuestionsAnswered = 0;

function handleTimeOut() {
  playEnemyAttack();
  countIncorrectAnswer++;
  scoreRefresh();
  countStreak = 0;
  updateStreakFire();
  setTimeout(async () => {
    await showEndMessageWithAnimation();
  }, 3000);
}

async function showEndMessageWithAnimation() {
  clearInterval(timerInterval);
  document.getElementById('quiz-main-content').classList.add('hidden');
  const correct = countCorrectAnswer;
  const incorrect = countIncorrectAnswer;
  const total = correct + incorrect;
  const accuracy = total > 0 ? ((correct / total) * 100) : 0;
  let message = '';
  if (accuracy > 50) {
    message = 'You win this round!';
    playEnemyDeath();
  } else {
    message = 'You lose this round!';
    playPlayerDeath();
  }
  await new Promise(res => setTimeout(res, 1800));
  const endDiv = document.getElementById('end-message');
  endDiv.innerHTML = `
    <div class="end-quiz-icons">
      <span class="end-quiz-icon map-icon" title="Map"></span>
      <span class="end-quiz-icon menu-icon" title="Menu"></span>
    </div>
    <div>${message}</div>
    <div class="end-results">
      <div><span>Correct:</span> ${correct}</div>
      <div><span>Incorrect:</span> ${incorrect}</div>
      <div><span>Accuracy:</span> ${accuracy.toFixed(1)}%</div>
      <div><span>Avg Speed:</span> ${(total > 0 ? (totalTimeSpent / total).toFixed(2) : '0.00')} s/question</div>
    </div>
    <button class="end-quiz-next-btn" id="endQuizNextBtn">Next</button>
  `;
  endDiv.style.display = 'flex';

  // Add event listeners for the new buttons
  document.querySelector('.map-icon').onclick = () => {
    window.location.href = 'map.html';
  };
  document.querySelector('.menu-icon').onclick = () => {
    showMenu();
  };
  document.getElementById('endQuizNextBtn').onclick = () => {
    // Placeholder: reload or go to next round
    window.location.reload();
  };
}

function showMenu() {
  alert('Menu button clicked! (Implement menu logic here)');
}
