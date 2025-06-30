// ---------------------- Supabase Setup ----------------------
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://idaklprhflgtctumqeus.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYWtscHJoZmxndGN0dW1xZXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTM4NTUsImV4cCI6MjA2NTM2OTg1NX0.Hw47aaPqJeVFWGz4Sx_1qz4EtsWy9rIVv-bFmkpuhX0";

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------- Progress Management ----------------------
class ProgressManager {
  constructor() {
    this.userProgress = {
      questionsAnswered: 0,
      correctAnswers: 0,
      accuracy: 0,
      completionPercentage: 0,
      answeredQuestions: new Set(), // Track which questions have been answered
      questionHistory: [], // Detailed history of each question attempt
      questionMastery: {}, // Track mastery status: {questionId: {correctCount: 0, lastAttempt: 'correct/incorrect'}}
      currentDifficulty: 'easy' // Track current difficulty level
    };
    this.loadProgress();
  }

  // Load progress from localStorage
  loadProgress() {
    const savedProgress = localStorage.getItem('quizProgress');
    if (savedProgress) {
      const parsed = JSON.parse(savedProgress);
      this.userProgress = {
        ...this.userProgress,
        ...parsed,
        answeredQuestions: new Set(parsed.answeredQuestions || []),
        questionHistory: parsed.questionHistory || [],
        questionMastery: parsed.questionMastery || {}
      };
    }
  }

  // Save progress to localStorage
  saveProgress() {
    const progressToSave = {
      ...this.userProgress,
      answeredQuestions: Array.from(this.userProgress.answeredQuestions)
    };
    localStorage.setItem('quizProgress', JSON.stringify(progressToSave));
  }

  // Get topic priority order
  getTopicPriority() {
    return [
      'Arithmetic',
      'Number Theory', 
      'Fraction',
      'Geometry',
      'Basic Statistics'
    ];
  }

  // Get next question based on database isCorrect column
  async getNextQuestion() {
    const topicPriority = this.getTopicPriority();
    
    // Check if current topic is complete (all 10 questions marked as isCorrect = 1)
    async function isTopicComplete(topic) {
      const { data, error } = await supabase
        .from('questions_test_two')
        .select('id, isCorrect')
        .eq('math-topic', topic)
        .eq('isCorrect', 1);
      
      if (error) {
        console.error('Error checking topic completion:', error);
        return false;
      }
      
      // Topic is complete if all 10 questions are marked as correct
      return data && data.length === 10;
    }
    
    // Find the current active topic (first incomplete topic)
    let currentTopic = null;
    for (const topic of topicPriority) {
      if (!(await isTopicComplete(topic))) {
        currentTopic = topic;
        break;
      }
    }
    
    if (!currentTopic) {
      // All topics are complete!
      console.log('All topics completed!');
      return null;
    }
    
    console.log('Current active topic:', currentTopic);
    
    // Get all questions for current topic from database
    const { data: topicQuestions, error: topicError } = await supabase
      .from('questions_test_two')
      .select('*')
      .eq('math-topic', currentTopic);
    
    if (topicError) {
      console.error('Error fetching topic questions:', topicError);
      return null;
    }
    
    console.log(`${currentTopic} has ${topicQuestions.length} questions`);
    
    // Get questions that are already marked as correct
    const { data: correctQuestions, error } = await supabase
      .from('questions_test_two')
      .select('id')
      .eq('math-topic', currentTopic)
      .eq('isCorrect', 1);
    
    if (error) {
      console.error('Error fetching correct questions:', error);
      return null;
    }
    
    const correctQuestionIds = new Set(correctQuestions ? correctQuestions.map(q => q.id) : []);
    
    // First priority: Questions that are not yet marked as correct
    const unansweredQuestions = topicQuestions.filter(q => 
      !correctQuestionIds.has(q.id)
    );
    
    if (unansweredQuestions.length > 0) {
      return unansweredQuestions[Math.floor(Math.random() * unansweredQuestions.length)];
    }

    // If all questions are marked as correct, topic is complete
    console.log(`All questions in ${currentTopic} are marked as correct`);
    return null;
  }

  // Update difficulty based on performance
  updateDifficulty(isCorrect) {
    if (isCorrect) {
      // Move to higher difficulty
      switch (this.userProgress.currentDifficulty) {
        case 'easy':
          this.userProgress.currentDifficulty = 'average';
          break;
        case 'average':
          this.userProgress.currentDifficulty = 'difficult';
          break;
        case 'difficult':
          // Stay at difficult
          break;
      }
    } else {
      // Move to lower difficulty
      switch (this.userProgress.currentDifficulty) {
        case 'difficult':
          this.userProgress.currentDifficulty = 'average';
          break;
        case 'average':
          this.userProgress.currentDifficulty = 'easy';
          break;
        case 'easy':
          // Stay at easy
          break;
      }
    }
  }

  // Record question attempt with mastery tracking
  async recordQuestionAttempt(question, isCorrect, timeSpent) {
    const attempt = {
      questionId: question.id,
      question: question.question,
      topic: question['math-topic'],
      difficulty: question.difficulty,
      isCorrect: isCorrect,
      timeSpent: timeSpent,
      timestamp: new Date().toISOString()
    };

    this.userProgress.questionHistory.push(attempt);
    this.userProgress.answeredQuestions.add(question.id);
    this.userProgress.questionsAnswered++;

    // Update the database isCorrect column
    if (isCorrect) {
      try {
        const { error } = await supabase
          .from('questions_test_two')
          .update({ isCorrect: 1 })
          .eq('id', question.id);
        
        if (error) {
          console.error('Error updating isCorrect in database:', error);
        } else {
          console.log(`Updated question ${question.id} isCorrect to 1`);
        }
      } catch (err) {
        console.error('Failed to update database:', err);
      }
    }

    // Count correct answers based on database isCorrect column
    await this.updateCorrectAnswerCount();

    // Update accuracy
    this.userProgress.accuracy = (this.userProgress.correctAnswers / this.userProgress.questionsAnswered) * 100;

    // Update completion percentage (based on total correct answers out of 100 total questions)
    // This represents progress toward mastering all 100 questions
    this.userProgress.completionPercentage = (this.userProgress.correctAnswers / 100) * 100;

    // Update difficulty
    this.updateDifficulty(isCorrect);

    // Save progress
    this.saveProgress();
  }

  // Update correct answer count based on database isCorrect column
  async updateCorrectAnswerCount() {
    try {
      const { data, error } = await supabase
        .from('questions_test_two')
        .select('id, isCorrect')
        .eq('isCorrect', 1);
      
      if (error) {
        console.error('Error fetching isCorrect data:', error);
        return;
      }
      
      // Count questions marked as correct (isCorrect = 1)
      this.userProgress.correctAnswers = data ? data.length : 0;
      console.log(`Total correct answers from database: ${this.userProgress.correctAnswers}`);
      
    } catch (err) {
      console.error('Failed to update correct answer count:', err);
    }
  }

  // Get progress statistics
  getProgressStats() {
    return {
      questionsAnswered: this.userProgress.questionsAnswered,
      correctAnswers: this.userProgress.correctAnswers,
      accuracy: this.userProgress.accuracy,
      completionPercentage: this.userProgress.completionPercentage,
      currentDifficulty: this.userProgress.currentDifficulty
    };
  }

  // Reset progress (for testing)
  resetProgress() {
    this.userProgress = {
      questionsAnswered: 0,
      correctAnswers: 0,
      accuracy: 0,
      completionPercentage: 0,
      answeredQuestions: new Set(),
      questionHistory: [],
      questionMastery: {},
      currentDifficulty: 'easy'
    };
    localStorage.removeItem('quizProgress');
  }
}

// ---------------------- Progress Display ----------------------
const progressManager = new ProgressManager();

function updateProgressDisplay() {
  const stats = progressManager.getProgressStats();
  
  // Update percentage
  const percentageElement = document.getElementById('progress-percentage');
  const circleElement = document.querySelector('.progress-circle');
  
  if (percentageElement && circleElement) {
    percentageElement.textContent = `${Math.round(stats.completionPercentage)}%`;
    circleElement.style.setProperty('--target-progress', stats.completionPercentage);
    circleElement.classList.add('animate');
  }

  // Update stats
  document.getElementById('questions-answered').textContent = stats.questionsAnswered;
  document.getElementById('correct-answers').textContent = stats.correctAnswers;
  document.getElementById('accuracy').textContent = `${Math.round(stats.accuracy)}%`;
}

// ---------------------- Event Handlers ----------------------
function showLoadingPopup() {
  document.getElementById('loadingPopup').classList.remove('hidden');
}

function hideLoadingPopup() {
  document.getElementById('loadingPopup').classList.add('hidden');
}

function startQuiz() {
  // Simply redirect to quiz page
  window.location.href = 'quiz.html';
}

// ---------------------- Initialize ----------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Load correct answer count from database
  await progressManager.updateCorrectAnswerCount();
  
  // Check for quiz attempts from quiz page
  const quizAttempts = JSON.parse(localStorage.getItem('currentQuizAttempts') || '[]');
  if (quizAttempts.length > 0) {
    // Process the attempts
    for (const attempt of quizAttempts) {
      await progressManager.recordQuestionAttempt(
        {
          id: attempt.questionId,
          question: attempt.question,
          'math-topic': attempt.topic,
          difficulty: attempt.difficulty
        },
        attempt.isCorrect,
        attempt.timeSpent
      );
    }
    
    // Clear the attempts from localStorage
    localStorage.removeItem('currentQuizAttempts');
    
    // Show completion message
    showCompletionMessage(quizAttempts[0]);
  }
  
  // Update display
  updateProgressDisplay();
  
  // Add event listener for play button
  document.getElementById('playButton').addEventListener('click', startQuiz);
  
  // Add reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Progress';
  resetButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 15px;
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-family: 'Pixelify Sans', sans-serif;
    font-size: 14px;
  `;
  resetButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      // Reset all isCorrect values in database to 0
      try {
        const { error } = await supabase
          .from('questions_test_two')
          .update({ isCorrect: 0 });
        
        if (error) {
          console.error('Error resetting database:', error);
          alert('Error resetting database. Please try again.');
        } else {
          progressManager.resetProgress();
          await progressManager.updateCorrectAnswerCount();
          updateProgressDisplay();
          alert('Progress reset successfully!');
        }
      } catch (err) {
        console.error('Failed to reset database:', err);
        alert('Error resetting database. Please try again.');
      }
    }
  });
  document.body.appendChild(resetButton);
  
  // Add reset button for testing (remove in production)
  if (window.location.search.includes('reset=true')) {
    progressManager.resetProgress();
    updateProgressDisplay();
  }
});

// Show completion message
function showCompletionMessage(lastAttempt) {
  const message = lastAttempt.isCorrect ? 
    'Great job! You got it right!' : 
    'Keep trying! You\'ll get it next time!';
  
  // Create a temporary message element
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    font-family: 'Pixelify Sans', sans-serif;
    font-size: 1.2rem;
    z-index: 1000;
    animation: fadeInOut 2s ease-in-out;
  `;
  messageDiv.textContent = message;
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(messageDiv);
  
  // Remove after animation
  setTimeout(() => {
    document.body.removeChild(messageDiv);
  }, 2000);
}

// Listen for quiz completion
window.addEventListener('storage', (e) => {
  if (e.key === 'quizCompleted') {
    // Quiz was completed, update display
    progressManager.loadProgress();
    updateProgressDisplay();
  }
}); 