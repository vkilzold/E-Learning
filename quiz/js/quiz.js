// ---------------------- Supabase Setup ----------------------
import { supabase } from "../../utils/supabaseClient.js";

// Generate or retrieve user ID for tracking
function getCurrentUserId() {
    let userId = localStorage.getItem('quizUserId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('quizUserId', userId);
        console.log('Generated new user ID:', userId);
    }
    return userId;
}

// Test Supabase connection on load
console.log('Supabase client created with URL:', supabase);
console.log('Testing basic connection...');
/*
// Simple connection test - will be updated after we find the correct table
supabase.from('questions').select('count').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('Initial connection test failed:', error);
    console.log('This might mean:');
    console.log('1. The table "questions" doesn\'t exist');
    console.log('2. Your Supabase credentials are incorrect');
    console.log('3. There\'s a network connectivity issue');
  } else {
    console.log('Initial connection test successful');
  }
}).catch(err => {
  console.error('Supabase client error:', err);
});

// Test if we can access Supabase at all
console.log('Testing basic Supabase access...');
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase auth test failed:', error);
  } else {
    console.log('Supabase auth test successful:', data);
  }
}).catch(err => {
  console.error('Supabase auth exception:', err);
});

// Test student_answers table access
async function testUserPerformanceTable() {
  console.log('Testing student_answers table access...');
  
  try {
    // Test 1: Try to select from the table
    const { data: selectData, error: selectError } = await supabase
      .from('student_answers')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Cannot select from student_answers table:', selectError);
      console.log('This indicates RLS policies are blocking access');
    } else {
      console.log('✅ Can select from student_answers table');
      console.log('Sample data:', selectData);
    }
    
    // Test 2: Try to insert a test record
    const testRecord = {
      user_id: getCurrentUserId(),
      question_id: 1,
      question_difficulty: 'easy',
      question_topic: 'Arithmetic',
      isCorrect: true,
      time: 30,
      mastery_level: 1
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('student_answers')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.error('❌ Cannot insert into student_answers table:', insertError);
      console.log('This confirms RLS policies are blocking inserts');
      console.log('Error details:', insertError);
      
      // Check if it's an RLS policy error
      if (insertError.message && insertError.message.includes('policy')) {
        console.log('🔒 This is a Row Level Security (RLS) policy error');
        console.log('You need to either:');
        console.log('1. Disable RLS on the student_answers table');
        console.log('2. Create permissive RLS policies');
        console.log('3. Use a different table without RLS');
      }
    } else {
      console.log('✅ Successfully inserted test record into student_answers table');
      console.log('Inserted data:', insertData);
      
      // Clean up the test record
      if (insertData && insertData[0] && insertData[0].id) {
        const { error: deleteError } = await supabase
          .from('student_answers')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.log('Warning: Could not delete test record:', deleteError);
        } else {
          console.log('✅ Test record cleaned up');
        }
      }
    }
    
  } catch (err) {
    console.error('Exception testing student_answers table:', err);
  }
}

// Test user_answers table access
async function testUserAnswersTable() {
  console.log('Testing user_answers table access...');
  
  try {
    // Test 1: Try to select from the table
    const { data: selectData, error: selectError } = await supabase
      .from('user_answers')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Cannot select from user_answers table:', selectError);
      console.log('This indicates RLS policies are blocking access');
    } else {
      console.log('✅ Can select from user_answers table');
      console.log('Sample data:', selectData);
    }
    
    // Test 2: Try to insert a test record
    const { data: { session } } = await supabase.auth.getSession();
    const studentId = session?.user?.id || null;
    
    const testRecord = {
      student_id: studentId,
      sub_question_id: 1,
      main_question_id: 1,
      is_correct: true,
      time_taken_seconds: 30,
      difficulty: 'easy'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_answers')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.error('❌ Cannot insert into user_answers table:', insertError);
      console.log('This confirms RLS policies are blocking inserts');
      console.log('Error details:', insertError);
      
      // Check if it's an RLS policy error
      if (insertError.message && insertError.message.includes('policy')) {
        console.log('🔒 This is a Row Level Security (RLS) policy error');
        console.log('You need to either:');
        console.log('1. Disable RLS on the user_answers table');
        console.log('2. Create permissive RLS policies');
        console.log('3. Use a different table without RLS');
      }
    } else {
      console.log('✅ Successfully inserted test record into user_answers table');
      console.log('Inserted data:', insertData);
      
      // Clean up the test record
      if (insertData && insertData[0] && insertData[0].id) {
        const { error: deleteError } = await supabase
          .from('user_answers')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.log('Warning: Could not delete test record:', deleteError);
        } else {
          console.log('✅ Test record cleaned up');
        }
      }
    }
    
  } catch (err) {
    console.error('Exception testing user_answers table:', err);
  }
}

// Test database structure
async function testDatabaseStructure() {
  console.log('Testing database structure...');
  
  // Try different possible table names - prioritize questions_test_two
  const possibleTableNames = ['questions', 'questions_test_two', 'quiz_questions',  'math_questions', 'quiz', 'test_questions'];
  
  for (const tableName of possibleTableNames) {
    console.log(`Testing table: ${tableName}`);
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`Table ${tableName} error:`, error.message);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log(`✅ Found working table: ${tableName}`);
        window.tableName = tableName; // Set the global table name
        console.log('Sample data:', data[0]);
        console.log('Available columns:', Object.keys(data[0]));
        
        // Check for topic column variations
        const possibleTopicColumns = ['math-topic', 'math_topic', 'topic', 'subject', 'category', 'type'];
        const foundTopicColumn = possibleTopicColumns.find(col => data[0].hasOwnProperty(col));
        
        if (foundTopicColumn) {
          console.log(`✅ Found topic column: ${foundTopicColumn}`);
          topicColumnName = foundTopicColumn; // Update the global variable
          window.topicColumnName = foundTopicColumn; // Also set on window for debugging
          
          // Get all unique topics
          const { data: topics, error: topicsError } = await supabase
            .from(tableName)
            .select(foundTopicColumn);
          
          if (!topicsError && topics) {
            const uniqueTopics = [...new Set(topics.map(t => t[foundTopicColumn]))];
            console.log('Available topics:', uniqueTopics);
            
            // Check if our expected topics exist
            const expectedTopics = ['Arithmetic', 'Number Theory', 'Fraction', 'Geometry', 'Basic Statistics'];
            const foundTopics = expectedTopics.filter(topic => 
              uniqueTopics.some(dbTopic => 
                dbTopic.toLowerCase() === topic.toLowerCase() ||
                dbTopic.toLowerCase().includes(topic.toLowerCase())
              )
            );
            console.log('Found expected topics:', foundTopics);
          }
        } else {
          console.log('❌ No topic column found. Available columns:', Object.keys(data[0]));
        }
        
        // Also check for isCorrect column
        if (data[0].hasOwnProperty('isCorrect')) {
          console.log('✅ Found isCorrect column');
        } else {
          console.log('❌ No isCorrect column found');
        }
        
        // If this is questions, use it and stop searching
        if (tableName === 'questions') {
          console.log('✅ Found questions table - using this one!');
          break;
        }
        
        // For other tables, continue searching for questions
        console.log(`Found table ${tableName}, but continuing to search for questions...`);
      } else {
        console.log(`Table ${tableName} exists but is empty`);
      }
    } catch (err) {
      console.log(`Table ${tableName} exception:`, err.message);
    }
  }
  
  // If we didn't find questions, let's try to list all tables
  console.log('Attempting to list all tables...');
  try {
    // This is a workaround to see what tables might exist
    const { data: allData, error: allError } = await supabase
      .from('questions')
      .select('*');
    
    if (allError) {
      console.log('Final error trying to access questions:', allError);
    } else {
      console.log('Successfully accessed questions, found', allData ? allData.length : 0, 'rows');
    }
  } catch (finalErr) {
    console.log('Final exception:', finalErr);
  }
}

// Run structure test and student_answers test
testDatabaseStructure();
testUserPerformanceTable();
testUserAnswersTable();

// Store current question data
let currentQuestion = null;
let quizStartTime = null;
let currentQuizQuestions = []; // Store the 6 questions for current quiz
let currentQuestionIndex = 0; // Track which question in the current quiz
let quizSessionResults = []; // Store results for current quiz session
let topicColumnName = 'math_topic'; // Default, will be updated after structure test
let tableName = 'questions'; // Default, will be updated after structure test

// Adaptive learning state
let currentDifficulty = 'easy'; // Start with easy questions
let questionMastery = {}; // Track mastery: {questionId: {correctCount: 0, lastAttempt: 'correct/incorrect'}}
let currentTopic = null;

// Select questions for current quiz session with adaptive learning
async function selectQuizQuestions() {
  console.log('selectQuizQuestions called with adaptive learning');
  const questionsPerQuiz = 5;
  const selectedQuestions = [];
  
  try {
    // Force use of questions table
    const targetTable = 'questions';
    console.log(`Using table: ${targetTable}`);
    
    // First, test if the table exists and has data
    const { data: testData, error: testError } = await supabase
      .from(targetTable)
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error accessing questions table:', testError);
      throw new Error(`Cannot access ${targetTable} table: ${testError.message}`);
    }
    
    console.log('✅ questions table exists');
    console.log('Sample row:', testData[0]);
    console.log('Available columns:', Object.keys(testData[0]));
    
    // Check for topic column
    const possibleTopicColumns = ['math-topic', 'math_topic', 'topic', 'subject', 'category', 'type'];
    const foundTopicColumn = possibleTopicColumns.find(col => testData[0].hasOwnProperty(col));
    
    if (!foundTopicColumn) {
      console.error('❌ No topic column found in questions');
      console.log('Available columns:', Object.keys(testData[0]));
      throw new Error(`No topic column found in ${targetTable}. Available columns: ${Object.keys(testData[0]).join(', ')}`);
    }
    
    console.log(`✅ Found topic column: ${foundTopicColumn}`);
    topicColumnName = foundTopicColumn;
    
    // Define topic priority order
    const topicPriority = [
      'Arithmetic',
      'Number Theory', 
      'Fraction',
      'Geometry',
      'Basic Statistics'
    ];
    
    // Find the current active topic (first incomplete topic)
    currentTopic = await findCurrentActiveTopic(targetTable, topicColumnName, topicPriority);
    
    if (!currentTopic) {
      throw new Error('All topics are complete! Congratulations!');
    }
    
    console.log('Current active topic for quiz:', currentTopic);
    
    // Load mastery data for current topic
    await loadQuestionMastery(targetTable, currentTopic);
    
    // Determine the appropriate difficulty level for this topic
    const appropriateDifficulty = await determineAppropriateDifficulty(targetTable, currentTopic);
    currentDifficulty = appropriateDifficulty;
    
    console.log(`Using difficulty level: ${currentDifficulty} for topic: ${currentTopic}`);
    
    // Get questions for current topic and difficulty
    const availableQuestions = await getQuestionsForTopicAndDifficulty(targetTable, currentTopic, currentDifficulty);
    
    if (availableQuestions.length === 0) {
      throw new Error(`No questions available for topic ${currentTopic} at ${currentDifficulty} difficulty level.`);
    }
    
    selectedQuestions.push(...availableQuestions.slice(0, questionsPerQuiz));
    
    console.log(`✅ Selected ${selectedQuestions.length} questions for ${currentTopic} at ${currentDifficulty} difficulty`);
    
    // Shuffle the final selection
    return selectedQuestions.sort(() => 0.5 - Math.random());
    
  } catch (error) {
    console.error('❌ Error in selectQuizQuestions:', error);
    throw error;
  }
}

// Find the current active topic (first incomplete topic)
async function findCurrentActiveTopic(targetTable, topicColumn, topicPriority) {
  for (const topic of topicPriority) {
    const isComplete = await isTopicComplete(targetTable, topicColumn, topic);
    if (!isComplete) {
      return topic;
    }
  }
  return null; // All topics complete
}

// Check if a topic is complete (all questions answered correctly twice)
async function isTopicComplete(targetTable, topicColumn, topic) {
  try {
    // Get all questions for this topic
    const { data: topicQuestions, error } = await supabase
      .from(targetTable)
      .select('id, "isCorrect"')
      .eq(topicColumn, topic);
    
    if (error) {
      console.error(`Error checking topic completion for ${topic}:`, error);
      return false;
    }
    
    if (!topicQuestions || topicQuestions.length === 0) {
      console.log(`No questions found for topic ${topic}`);
      return false;
    }
    
    // Count questions that have been answered correctly twice (isCorrect = 2)
    const masteredQuestions = topicQuestions.filter(q => q["isCorrect"] === 'correct');
    const totalQuestions = topicQuestions.length;
    
    console.log(`Topic ${topic}: ${masteredQuestions.length}/${totalQuestions} questions mastered`);
    
    // Topic is complete if all questions are mastered (answered correctly twice)
    return masteredQuestions.length >= totalQuestions;
    
  } catch (err) {
    console.error(`Error in isTopicComplete for ${topic}:`, err);
    return false;
  }
}

// Load mastery data for current topic
async function loadQuestionMastery(targetTable, topic) {
  try {
    const { data: questions, error } = await supabase
      .from(targetTable)
      .select('id, "isCorrect"')
      .eq(topicColumnName, topic);
    
    if (error) {
      console.error('Error loading question mastery:', error);
      return;
    }
    
    // Initialize mastery tracking
    questions.forEach(q => {
      questionMastery[q.id] = {
        correctCount: q["isCorrect"] === 'correct' ? 1 : 0,
        lastAttempt: null
      };
    });
    
    console.log(`Loaded mastery data for ${questions.length} questions in ${topic}`);
    
  } catch (err) {
    console.error('Error in loadQuestionMastery:', err);
  }
}

// Get questions for current topic and difficulty that need practice
async function getQuestionsForTopicAndDifficulty(targetTable, topic, difficulty) {
  try {
    const { data: questions, error } = await supabase
      .from(targetTable)
      .select('*')
      .eq(topicColumnName, topic)
      .eq('difficulty', difficulty);
    
    if (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
    
    if (!questions || questions.length === 0) {
      return [];
    }
    
    // Filter questions that need practice (not mastered yet)
    const questionsNeedingPractice = questions.filter(q => {
      const mastery = questionMastery[q.id] || { correctCount: 0 };
      return mastery.correctCount < 2; // Need to answer correctly twice
    });
    
    console.log(`Found ${questionsNeedingPractice.length} questions needing practice at ${difficulty} difficulty`);
    
    return questionsNeedingPractice;
    
  } catch (err) {
    console.error('Error in getQuestionsForTopicAndDifficulty:', err);
    return [];
  }
}

// Determine the appropriate difficulty level for a topic
async function determineAppropriateDifficulty(targetTable, topic) {
  try {
    // Get all questions for this topic
    const { data: allQuestions, error } = await supabase
      .from(targetTable)
      .select('id, difficulty, "isCorrect"')
      .eq(topicColumnName, topic);
    
    if (error) {
      console.error('Error fetching questions for difficulty determination:', error);
      return 'easy'; // Default to easy
    }
    
    if (!allQuestions || allQuestions.length === 0) {
      return 'easy'; // Default to easy
    }
    
    // Separate questions by difficulty
    const easyQuestions = allQuestions.filter(q => q.difficulty === 'easy');
    const averageQuestions = allQuestions.filter(q => q.difficulty === 'average');
    const difficultQuestions = allQuestions.filter(q => q.difficulty === 'difficult');
    
    console.log(`Topic ${topic} has ${easyQuestions.length} easy, ${averageQuestions.length} average, ${difficultQuestions.length} difficult questions`);
    
    // Check if all easy questions are mastered
    const masteredEasyQuestions = easyQuestions.filter(q => q["isCorrect"] === 'correct');
    const easyMasteryPercentage = easyQuestions.length > 0 ? (masteredEasyQuestions.length / easyQuestions.length) * 100 : 100;
    
    console.log(`Easy questions mastery: ${masteredEasyQuestions.length}/${easyQuestions.length} (${easyMasteryPercentage.toFixed(1)}%)`);
    
    // Only progress to average if ALL easy questions are mastered
    if (easyMasteryPercentage >= 100) {
      // Check if all average questions are mastered
      const masteredAverageQuestions = averageQuestions.filter(q => q["isCorrect"] === 'correct');
      const averageMasteryPercentage = averageQuestions.length > 0 ? (masteredAverageQuestions.length / averageQuestions.length) * 100 : 100;
      
      console.log(`Average questions mastery: ${masteredAverageQuestions.length}/${averageQuestions.length} (${averageMasteryPercentage.toFixed(1)}%)`);
      
      // Only progress to difficult if ALL average questions are mastered
      if (averageMasteryPercentage >= 100) {
        return 'difficult';
      } else {
        return 'average';
      }
    } else {
      return 'easy';
    }
    
  } catch (err) {
    console.error('Error in determineAppropriateDifficulty:', err);
    return 'easy'; // Default to easy
  }
}

// Get next difficulty level
function getNextDifficulty(currentDiff) {
  switch (currentDiff) {
    case 'easy': return 'average';
    case 'average': return 'difficult';
    case 'difficult': return 'difficult'; // Stay at difficult
    default: return 'easy';
  }
}

// Get previous difficulty level
function getPreviousDifficulty(currentDiff) {
  switch (currentDiff) {
    case 'difficult': return 'average';
    case 'average': return 'easy';
    case 'easy': return 'easy'; // Stay at easy
    default: return 'easy';
  }
}

// Update difficulty based on performance
function updateDifficulty(isCorrect) {
  if (isCorrect) {
    // Move to higher difficulty if doing well
    const nextDiff = getNextDifficulty(currentDifficulty);
    if (nextDiff !== currentDifficulty) {
      console.log(`Performance good, moving from ${currentDifficulty} to ${nextDiff}`);
      currentDifficulty = nextDiff;
    }
  } else {
    // Move to lower difficulty if struggling
    const prevDiff = getPreviousDifficulty(currentDifficulty);
    if (prevDiff !== currentDifficulty) {
      console.log(`Performance poor, moving from ${currentDifficulty} to ${prevDiff}`);
      currentDifficulty = prevDiff;
    }
  }
}

async function loadQuiz() {
  console.log('loadQuiz called');
  showLoadingPopup();
  await new Promise(res => setTimeout(res, 1000)); // Wait for animation (1s)
  
  // If this is the first question of a new quiz session
  if (currentQuizQuestions.length === 0) {
    console.log('No current quiz questions, selecting new ones...');
    try {
      currentQuizQuestions = await selectQuizQuestions();
      currentQuestionIndex = 0;
      quizSessionResults = [];
      console.log('Selected quiz questions:', currentQuizQuestions);
      
      // Check if we got any questions
      if (!currentQuizQuestions || currentQuizQuestions.length === 0) {
        console.error('No questions available for quiz');
        hideLoadingPopup();
        alert('No questions available. All topics may be completed or there may be a database issue. Please check the progress page or try again later.');
        return;
      }
    } catch (error) {
      console.error('Error selecting quiz questions:', error);
      hideLoadingPopup();
      alert(`Database Error: ${error.message}. Please check your database connection and table structure.`);
      return;
    }
  }
  
  // Get current question
  if (currentQuestionIndex >= currentQuizQuestions.length) {
    console.log('Quiz session complete, redirecting...');
    // Quiz session complete
    await completeQuizSession();
    return;
  }
  
  currentQuestion = currentQuizQuestions[currentQuestionIndex];
  quizStartTime = Date.now();
  
  console.log(`Question ${currentQuestionIndex + 1}/${currentQuizQuestions.length}:`, currentQuestion);
  
  hideLoadingPopup();
  
  // Update question text
  const questionElement = document.getElementById('question');
  if (questionElement) {
    questionElement.textContent = currentQuestion.question;
  } else {
    console.error('Question element not found');
  }
  
  // Update question title to include math topic, difficulty, and progress
  const questionNumberElem = document.querySelector('.title h2');
  if (questionNumberElem) {
    const topicText = currentTopic ? ` - ${currentTopic}` : '';
    const difficultyText = currentDifficulty ? ` (${currentDifficulty})` : '';
    const masteryText = currentQuestion && questionMastery[currentQuestion.id] ? 
      ` [${questionMastery[currentQuestion.id].correctCount}/2]` : '';
    questionNumberElem.textContent = `Question ${currentQuestionIndex + 1}/${currentQuizQuestions.length}${topicText}${difficultyText}${masteryText}`;
  }
  
  // Parse choices (assuming choices is stored as semicolon-separated string)
  let choices = Array.isArray(currentQuestion.choices) ? currentQuestion.choices : [];
  if (!Array.isArray(choices) || choices.length < 4) {
    console.error("Choices must be an array of at least 4 items");
    console.log("Available choices:", choices);
    hideLoadingPopup();
    alert('Error loading question choices. Please try again.');
    return;
  }
  
  // Update choice elements
  const firstChoice = document.getElementById('firstChoice');
  const secondChoice = document.getElementById('secondChoice');
  const thirdChoice = document.getElementById('thirdChoice');
  const fourthChoice = document.getElementById('fourthChoice');
  
  if (firstChoice && secondChoice && thirdChoice && fourthChoice) {
    firstChoice.textContent = choices[0];
    secondChoice.textContent = choices[1];
    thirdChoice.textContent = choices[2];
    fourthChoice.textContent = choices[3];
  } else {
    console.error('One or more choice elements not found');
  }
  
  // Reset choice styling
  document.querySelectorAll('.choice').forEach(choice => {
    choice.classList.remove('correct', 'wrong', 'selected');
  });
  
  // Enable answer selection for new question
  enableAnswerSelection();
  
  console.log('Starting timer...');
  startQuestionTimer();
}

// Complete quiz session and redirect to progress
async function completeQuizSession() {
  console.log('Quiz session complete. Results:', quizSessionResults);
  
  // Store all session results in localStorage
  const existingAttempts = JSON.parse(localStorage.getItem('currentQuizAttempts') || '[]');
  existingAttempts.push(...quizSessionResults);
  localStorage.setItem('currentQuizAttempts', JSON.stringify(existingAttempts));
  
  // Reset quiz session
  currentQuizQuestions = [];
  currentQuestionIndex = 0;
  quizSessionResults = [];
  
  // Redirect to progress page
  window.location.href = 'progress.html';
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
  death: { image: null, frameHeight: 64, totalFrames: 13, fps: 12 },
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
  loadImage('assets/animations/enemy1-player-idle.png').then(img => playerIdleImage = img),
  loadImage('assets/animations/enemy1-player-attack.png').then(img => playerAttackImage = img),
  loadImage('assets/animations/enemy1-player-death.png').then(img => playerDeathImage = img),
  loadImage('assets/animations/enemy1-attack-player.png').then(img => enemyAttackImage = img),
  loadImage('assets/animations/enemy1-death-player.png').then(img => enemyDeathImage = img),
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
  
  // Stop the timer when play button is pressed
  stopTimer();
  
  const selectedAnswer = selectedChoice.textContent.trim();
  
  // Use the current question data instead of fetching from database again
  if (!currentQuestion || !currentQuestion.answer) {
    console.error("No current question or answer available");
    return;
  }
  
  const correctAnswer = currentQuestion.answer.trim();
  const choices = document.querySelectorAll('.choice');
  
  choices.forEach(choice => {
    choice.classList.remove('correct', 'wrong');
    if (choice.textContent.trim() === correctAnswer) {
      choice.classList.add('correct');
    } else if (choice === selectedChoice) {
      choice.classList.add('wrong');
    }
  });
  
  const isCorrect = selectedAnswer === correctAnswer;
  const timeSpent = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
  
  // Update mastery tracking
  const questionId = currentQuestion.id;
  if (!questionMastery[questionId]) {
    questionMastery[questionId] = { correctCount: 0, lastAttempt: null };
  }
  
  // Update mastery based on current attempt
  if (isCorrect) {
    questionMastery[questionId].correctCount++;
    questionMastery[questionId].lastAttempt = 'correct';
    console.log(`Question ${questionId} correct count: ${questionMastery[questionId].correctCount}/2`);
  } else {
    questionMastery[questionId].lastAttempt = 'incorrect';
    console.log(`Question ${questionId} incorrect, correct count: ${questionMastery[questionId].correctCount}/2`);
  }
  
  // Record performance in student_answers table
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const studentId = session?.user?.id || null;

    const performanceRecord = {
      student_id: studentId,
      question_id: currentQuestion.id,
      math_topic: currentQuestion[topicColumnName],
      is_correct: isCorrect,
      time_taken_seconds: timeSpent,
      difficulty: currentQuestion.difficulty
    };
    
    const { error: performanceError } = await supabase
      .from('student_answers')
      .insert(performanceRecord);
    
    if (performanceError) {
      console.error('❌ Error recording performance in student_answers table:', performanceError);
      console.log('Error details:', performanceError);
      
      // Check if it's an RLS policy error
      if (performanceError.message && performanceError.message.includes('policy')) {
        console.log('🔒 This is a Row Level Security (RLS) policy error');
        console.log('Performance data will be stored in localStorage as fallback');
        
        // Store in localStorage as fallback
        const existingPerformance = JSON.parse(localStorage.getItem('userPerformanceData') || '[]');
        existingPerformance.push({
          ...performanceRecord,
          timestamp: new Date().toISOString(),
          stored_locally: true
        });
        localStorage.setItem('userPerformanceData', JSON.stringify(existingPerformance));
        console.log('✅ Performance data stored in localStorage as fallback');
      }
    } else {
      console.log('✅ Performance recorded in student_answers table:', performanceRecord);
    }
  } catch (err) {
    console.error('Failed to record performance:', err);
    
    // Store in localStorage as fallback
    const { data: { session } } = await supabase.auth.getSession();
    const studentId = session?.user?.id || null;

    const performanceRecord = {
      student_id: studentId,
      question_id: currentQuestion.id,
      math_topic: currentQuestion[topicColumnName],
      is_correct: isCorrect,
      time_taken_seconds: timeSpent,
      difficulty: currentQuestion.difficulty,
      timestamp: new Date().toISOString(),
      stored_locally: true
    };
    
    const existingPerformance = JSON.parse(localStorage.getItem('userPerformanceData') || '[]');
    existingPerformance.push(performanceRecord);
    localStorage.setItem('userPerformanceData', JSON.stringify(existingPerformance));
    console.log('✅ Performance data stored in localStorage as fallback due to error');
  }
  
  // Record the attempt for current session
  const attempt = {
    questionId: currentQuestion.id,
    question: currentQuestion.question,
    topic: currentQuestion[topicColumnName],
    difficulty: currentQuestion.difficulty,
    isCorrect: isCorrect,
    timeSpent: timeSpent,
    timestamp: new Date().toISOString(),
    masteryLevel: questionMastery[questionId].correctCount
  };
  
  // Add to session results
  quizSessionResults.push(attempt);
  
  if (isCorrect) {
    playPlayerAttack();
    countCorrectAnswer++;
    userPoint += scorePoints;
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
  
  // Wait for animation, then move to next question or complete session
  setTimeout(async () => {
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= currentQuizQuestions.length) {
      // Quiz session complete
      showLoadingPopup();
      setTimeout(async () => {
        hideLoadingPopup();
        await completeQuizSession();
      }, 800);
    } else {
      // Load next question
      await loadQuiz();
    }
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
document.addEventListener("DOMContentLoaded", async () => {
  console.log('DOM loaded, initializing quiz...');
  
  const choices = document.querySelectorAll('.choice');
  console.log('Found choice elements:', choices.length);

  choices.forEach(choice => {
    choice.addEventListener('click', () => {
      // Only allow selection if timer is active
      if (!timerActive) {
        return;
      }
      
      // Remove 'selected' class from all choices
      choices.forEach(c => c.classList.remove('selected'));

      // Add 'selected' class to the clicked one
      choice.classList.add('selected');
    });
  });

  // Add event listener for play button
  const playButton = document.querySelector('.playButton');
  if (playButton) {
    console.log('Play button found, adding event listener');
    playButton.addEventListener('click', () => {
      // Only allow submission if timer is active
      if (!timerActive) {
        return;
      }
      checkAnswerAndAnimate();
    });
  } else {
    console.error('Play button not found');
  }

  // Wait a bit for database structure test to complete
  console.log('Waiting for database structure test to complete...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Starting quiz load...');
  loadQuiz();
});

// Timer logic: display as a number, reset and start on each question
let timerInterval = null;
let timerSeconds = 60; // Set to 60 seconds per question
let timerActive = true; // Track if timer is active

function startQuestionTimer() {
  clearInterval(timerInterval);
  timerSeconds = 60; // Always reset to 60 seconds
  timerActive = true;
  
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    if (timerActive) {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerActive = false;
        disableAnswerSelection();
        handleTimeOut();
      }
    }
  }, 1000);
}

function stopTimer() {
  timerActive = false;
  clearInterval(timerInterval);
}

function disableAnswerSelection() {
  const choices = document.querySelectorAll('.choice');
  choices.forEach(choice => {
    choice.style.pointerEvents = 'none';
    choice.style.opacity = '0.5';
  });
  
  // Disable play button
  const playButton = document.querySelector('.playButton');
  if (playButton) {
    playButton.style.pointerEvents = 'none';
    playButton.style.opacity = '0.5';
  }
}

function enableAnswerSelection() {
  const choices = document.querySelectorAll('.choice');
  choices.forEach(choice => {
    choice.style.pointerEvents = 'auto';
    choice.style.opacity = '1';
  });
  
  // Enable play button
  const playButton = document.querySelector('.playButton');
  if (playButton) {
    playButton.style.pointerEvents = 'auto';
    playButton.style.opacity = '1';
  }
}

function updateTimerDisplay() {
  const timerElem = document.getElementById('timer-number');
  if (timerElem) {
    timerElem.textContent = timerSeconds;
    // Color logic: green > 40, orange 20-40, red < 20 (adjusted for 60-second timer)
    if (timerSeconds > 40) {
      timerElem.style.color = '#4caf50'; // green
      timerElem.style.borderColor = '#4caf50';
      timerElem.style.boxShadow = '0 0 12px #4caf50cc';
      timerElem.style.backgroundColor = 'rgba(76, 175, 80, 0.18)';
    } else if (timerSeconds > 20) {
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

let totalTimeSpent = 0;
let totalQuestionsAnswered = 0;

async function handleTimeOut() {
  playEnemyAttack();
  countIncorrectAnswer++;
  scoreRefresh();
  countStreak = 0;
  updateStreakFire();
  
  // Update mastery tracking for timeout (treated as incorrect)
  const questionId = currentQuestion.id;
  if (!questionMastery[questionId]) {
    questionMastery[questionId] = { correctCount: 0, lastAttempt: null };
  }
  
  questionMastery[questionId].lastAttempt = 'incorrect';
  console.log(`Question ${questionId} timed out, correct count: ${questionMastery[questionId].correctCount}/2`);
  
  // Record performance in student_answers table for timeout
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const studentId = session?.user?.id || null;

    const performanceRecord = {
      student_id: studentId,
      question_id: currentQuestion.id,
      math_topic: currentQuestion[topicColumnName],
      is_correct: false,
      time_taken_seconds: 60, // Full time spent since timeout
      difficulty: currentQuestion.difficulty
    };
    
    const { error: performanceError } = await supabase
      .from('student_answers')
      .insert(performanceRecord);
    
    if (performanceError) {
      console.error('❌ Error recording timeout performance in student_answers table:', performanceError);
      console.log('Error details:', performanceError);
      
      // Check if it's an RLS policy error
      if (performanceError.message && performanceError.message.includes('policy')) {
        console.log('🔒 This is a Row Level Security (RLS) policy error');
        console.log('Timeout performance data will be stored in localStorage as fallback');
        
        // Store in localStorage as fallback
        const existingPerformance = JSON.parse(localStorage.getItem('userPerformanceData') || '[]');
        existingPerformance.push({
          ...performanceRecord,
          timestamp: new Date().toISOString(),
          stored_locally: true
        });
        localStorage.setItem('userPerformanceData', JSON.stringify(existingPerformance));
        console.log('✅ Timeout performance data stored in localStorage as fallback');
      }
    } else {
      console.log('✅ Timeout performance recorded in student_answers table:', performanceRecord);
    }
  } catch (err) {
    console.error('Failed to record timeout performance:', err);
    
    // Store in localStorage as fallback
    const { data: { session } } = await supabase.auth.getSession();
    const studentId = session?.user?.id || null;

    const performanceRecord = {
      student_id: studentId,
      question_id: currentQuestion.id,
      math_topic: currentQuestion[topicColumnName],
      is_correct: false,
      time_taken_seconds: 60, // Full time spent since timeout
      difficulty: currentQuestion.difficulty,
      timestamp: new Date().toISOString(),
      stored_locally: true
    };
    
    const existingPerformance = JSON.parse(localStorage.getItem('userPerformanceData') || '[]');
    existingPerformance.push(performanceRecord);
    localStorage.setItem('userPerformanceData', JSON.stringify(existingPerformance));
    console.log('✅ Timeout performance data stored in localStorage as fallback due to error');
  }
  
  // Record timeout as incorrect attempt
  const timeSpent = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 60;
  const attempt = {
    questionId: currentQuestion.id,
    question: currentQuestion.question,
    topic: currentQuestion[topicColumnName],
    difficulty: currentQuestion.difficulty,
    isCorrect: false,
    timeSpent: timeSpent,
    timestamp: new Date().toISOString(),
    masteryLevel: questionMastery[questionId].correctCount
  };
  
  // Add to session results
  quizSessionResults.push(attempt);
  
  setTimeout(async () => {
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= currentQuizQuestions.length) {
      // Quiz session complete
      showLoadingPopup();
      setTimeout(async () => {
        hideLoadingPopup();
        await completeQuizSession();
      }, 800);
    } else {
      // Load next question
      await loadQuiz();
    }
  }, 3000);
}*/

// ================================================== New Quiz Logic for New Layout ==================================================
document.addEventListener('DOMContentLoaded', function() {
  // --- New: Fetch main_questions and sub_questions from Supabase ---
  let mainQuestions = [];
  let currentMainIdx = 0;
  let currentSubIdx = 0;
  let score = 0;
  let subQuestionResults = [];

  const quizHeader = document.querySelector('.quiz-header');
  const roundLabel = quizHeader.querySelector('.round-label');
  const questionLabel = quizHeader.querySelector('.question-label');
  const questionText = document.querySelector('.quiz-question-text');
  const choicesForm = document.querySelector('.quiz-choices-form');
  const submitBtn = document.querySelector('.quiz-submit-btn');
  const progressNodes = document.querySelectorAll('.progress-node');
  const loadingPopup = document.getElementById('loadingPopup');
  const quizMainArea = document.querySelector('.quiz-main-area');

  // Add score display at the top if not present
  let scoreDisplay = document.querySelector('.quiz-score-display');
  if (!scoreDisplay) {
    scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'quiz-score-display';
    scoreDisplay.style.cssText = 'position:absolute;top:1.5rem;right:2rem;font-size:1rem;font-family:Pixelify Sans,sans-serif;font-weight:700;color:#23282b;background:#ffd740;padding:0.3rem 0.8rem;border-radius:0.7rem;z-index:20;box-shadow:0 2px 8px #ffd74055;';
    quizHeader.appendChild(scoreDisplay);
  }

  function updateScoreDisplay() {
    let totalSubQuestions = 0;
    mainQuestions.forEach(mq => { if (mq.sub_questions) totalSubQuestions += mq.sub_questions.length; });
    scoreDisplay.textContent = `Score: ${score} / ${totalSubQuestions}`;
  }

  async function fetchQuestions() {
    console.log('Fetching questions from database...');
    
    try {
      // Fetch all main_questions
      const { data: mains, error: mainErr } = await supabase
        .from('main_questions')
        .select('*')
        .order('id', { ascending: true });
      
      if (mainErr) {
        console.error('❌ Error fetching main questions:', mainErr);
        alert('Error fetching main questions: ' + mainErr.message);
        return [];
      }
      
      console.log(`✅ Successfully fetched ${mains?.length || 0} main questions`);
      
      if (!mains || mains.length === 0) {
        console.log('No main questions found in database');
        return [];
      }
      
      // For each main_question, fetch its sub_questions
      for (const mq of mains) {
        console.log(`Fetching sub-questions for main question ${mq.id}...`);
        
        const { data: subs, error: subErr } = await supabase
          .from('sub_questions')
          .select('*')
          .eq('main_question_id', mq.id)
          .order('step_number', { ascending: true });
        
        if (subErr) {
          console.error(`❌ Error fetching sub-questions for main question ${mq.id}:`, subErr);
          alert('Error fetching sub-questions: ' + subErr.message);
          mq.sub_questions = [];
        } else {
          mq.sub_questions = subs || [];
          console.log(`✅ Found ${mq.sub_questions.length} sub-questions for main question ${mq.id}`);
        }
      }
      
      console.log('✅ All questions fetched successfully');
      return mains;
      
    } catch (err) {
      console.error('❌ Exception in fetchQuestions:', err);
      alert('Failed to fetch questions: ' + err.message);
      return [];
    }
  }

  function renderCurrentQuestion() {
    if (!mainQuestions.length) return;
    const mq = mainQuestions[currentMainIdx];
    const sq = mq.sub_questions[currentSubIdx];
    // Header
    roundLabel.textContent = `Round ${currentMainIdx + 1}`;
    questionLabel.innerHTML = `<span class='question-number'>Main Q${currentMainIdx + 1}</span> | Topic: ${mq.topic || ''} | Difficulty: <span style='color:${(mq.difficulty||'').toLowerCase()==='easy' ? '#388e3c' : '#B0323A'};'>${mq.difficulty||''}</span>`;
    // Main question as context (optional)
    let mainQHtml = mq.main_question ? `<div class='main-question-context'><b>Main Question:</b> ${mq.main_question}</div>` : '';
    // Remove sub-question from quiz-question-text (left column)
    questionText.innerHTML = mainQHtml;
    // --- Insert sub-question above choices in quiz-right ---
    const quizRight = document.querySelector('.quiz-right');
    if (quizRight) {
      // Remove any previous sub-question
      let prevSubQ = quizRight.querySelector('.sub-question-text');
      if (prevSubQ) prevSubQ.remove();
      // Create new sub-question div
      const subQDiv = document.createElement('div');
      subQDiv.className = 'sub-question-text';
      subQDiv.innerHTML = sq.question;
      // Insert above quiz-info-label
      const infoLabel = quizRight.querySelector('.quiz-info-label');
      if (infoLabel) {
        quizRight.insertBefore(subQDiv, infoLabel);
      } else {
        quizRight.prepend(subQDiv);
      }
    }
    // Choices as buttons
    let choices = Array.isArray(sq.choices) ? sq.choices : (typeof sq.choices === 'string' ? JSON.parse(sq.choices) : []);
    const buttonsHtml = choices.map((choice, i) => {
      const letter = String.fromCharCode(65 + i);
      return `<button type="button" class="quiz-choice-btn" data-choice="${letter}">${letter}) ${choice}</button>`;
    }).join('');
    const choicesButtons = quizRight.querySelector('.quiz-choices-buttons');
    if (choicesButtons) choicesButtons.innerHTML = buttonsHtml;
    // Add click event to each button
    const btns = quizRight.querySelectorAll('.quiz-choice-btn');
    btns.forEach(btn => {
      btn.disabled = false; // Enable buttons on new question
      btn.addEventListener('click', function() {
        if (btns[0].disabled) return; // Prevent selection if disabled
        btns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    // --- Dynamic Progress Bar ---
    const progressBar = document.querySelector('.progress-bar');
    progressBar.innerHTML = '';
    for (let i = 0; i < mq.sub_questions.length; i++) {
      const node = document.createElement('div');
      node.className = 'progress-node';
      progressBar.appendChild(node);
      if (i < mq.sub_questions.length - 1) {
        const line = document.createElement('div');
        line.className = 'progress-line';
        progressBar.appendChild(line);
      }
    }
    // Select the new nodes for progress logic
    const progressNodes = progressBar.querySelectorAll('.progress-node');
    progressNodes.forEach((node, i) => {
      node.classList.remove('active', 'checked', 'wrong');
      if (subQuestionResults[i] === true) {
        node.classList.add('checked');
      } else if (subQuestionResults[i] === false) {
        node.classList.add('wrong');
      }
      if (i === currentSubIdx) {
        node.classList.add('active');
      }
    });
    updateScoreDisplay();
    // Re-enable submit button and unlock submit for the next question
    submitLocked = false;
    submitBtn.disabled = false;
  }

  function showLoadingPopupFn(show) {
    if (loadingPopup) loadingPopup.classList.toggle('hidden', !show);
  }

  function showEndMessage() {
    stopQuizClock(); // Stop the quiz clock
    window.location.href = 'progress.html';
  }

  // --- Add running clock for new quiz layout ---
  let quizStartTimestamp = null;
  let quizTimerInterval = null;
  let elapsedSeconds = 0;
  let subQuestionStartTimestamp = null;
  
  // Add a clock display to the header
  let clockDisplay = document.querySelector('.quiz-clock-display');
  if (!clockDisplay) {
    clockDisplay = document.createElement('div');
    clockDisplay.className = 'quiz-clock-display';
    clockDisplay.style.cssText = 'position:absolute;top:1.5rem;left:2rem;font-size:1.3rem;font-family:Pixelify Sans,sans-serif;font-weight:700;color:#23282b;background:#e0e0e0;padding:0.5rem 1.2rem;border-radius:0.7rem;z-index:20;box-shadow:0 2px 8px #e0e0e055;';
    quizHeader.appendChild(clockDisplay);
  }
  
  function updateClockDisplay() {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    clockDisplay.textContent = `Time: ${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  function startQuizClock() {
    quizStartTimestamp = Date.now();
    elapsedSeconds = 0;
    updateClockDisplay();
    quizTimerInterval = setInterval(() => {
      elapsedSeconds = Math.floor((Date.now() - quizStartTimestamp) / 1000);
      updateClockDisplay();
    }, 1000);
    subQuestionStartTimestamp = Date.now(); // Start timer for first sub-question
  }
  
  function stopQuizClock() {
    if (quizTimerInterval) {
      clearInterval(quizTimerInterval);
      quizTimerInterval = null;
    }
    updateClockDisplay();
  }

  // --- Insert answer into user_answers on submit ---
  let submitLocked = false;
  submitBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    if (submitLocked) return;
    submitLocked = true;
    submitBtn.disabled = true;
    if (!mainQuestions.length) {
      submitLocked = false;
      submitBtn.disabled = false;
      return;
    }
    const mq = mainQuestions[currentMainIdx];
    const sq = mq.sub_questions[currentSubIdx];
    // Get selected button
    const quizRight = document.querySelector('.quiz-right');
    const selectedBtn = quizRight.querySelector('.quiz-choice-btn.selected');
    if (!selectedBtn) {
      alert('Please select an answer!');
      submitLocked = false;
      submitBtn.disabled = false;
      return;
    }
    let choices = Array.isArray(sq.choices) ? sq.choices : (typeof sq.choices === 'string' ? JSON.parse(sq.choices) : []);
    const answerIndex = selectedBtn.getAttribute('data-choice').charCodeAt(0) - 65;
    const isCorrect = choices[answerIndex] === sq.correct_answer;
    // Play sound effect for correct or wrong answer
    const correctSound = document.getElementById('correct-sound');
    const wrongSound = document.getElementById('wrong-sound');
    
    // Function to play sound with better error handling
    function playSound(audioElement, soundType) {
      if (audioElement) {
        try {
          audioElement.currentTime = 0;
          audioElement.play().then(() => {
            console.log(`${soundType} sound played successfully`);
          }).catch(error => {
            console.warn(`Could not play ${soundType} sound:`, error.message);
            // Fallback: create a simple beep sound using Web Audio API
            playFallbackSound(isCorrect);
          });
        } catch (error) {
          console.warn(`Error playing ${soundType} sound:`, error.message);
          // Fallback: create a simple beep sound using Web Audio API
          playFallbackSound(isCorrect);
        }
      } else {
        console.warn(`${soundType} sound element not found`);
        // Fallback: create a simple beep sound using Web Audio API
        playFallbackSound(isCorrect);
      }
    }
    
    // Better sound effects using Web Audio API
    function playFallbackSound(isCorrect) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (isCorrect) {
          // Correct answer: Happy ascending chime sound
          playCorrectSound(audioContext);
        } else {
          // Wrong answer: Sad descending sound
          playWrongSound(audioContext);
        }
        
        console.log(`Played ${isCorrect ? 'correct' : 'wrong'} sound effect`);
      } catch (error) {
        console.warn('Could not play sound effect:', error.message);
      }
    }
    
    // Correct answer sound - happy ascending chime
    function playCorrectSound(audioContext) {
      const frequencies = [523, 659, 784, 1047]; // C, E, G, C (ascending)
      const duration = 0.15;
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + (index * 0.1);
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    }
    
    // Wrong answer sound - descending chime (same style as correct)
    function playWrongSound(audioContext) {
      const frequencies = [400, 350, 300, 250]; // Lower frequencies for "wrong" feeling
      const duration = 0.2; // Slightly longer duration
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + (index * 0.15); // Slower timing
        gainNode.gain.setValueAtTime(0.15, startTime); // Lower volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    }
    
    if (isCorrect) {
      playSound(correctSound, 'correct');
    } else {
      playSound(wrongSound, 'wrong');
    }
    // Time taken for this sub-question
    let timeTakenSeconds = 0;
    if (subQuestionStartTimestamp) {
      timeTakenSeconds = Math.floor((Date.now() - subQuestionStartTimestamp) / 1000);
    }
    // Insert into user_answers
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const studentId = session?.user?.id || null;
      const answerRecord = {
        student_id: studentId,
        sub_question_id: sq.id,
        main_question_id: mq.id,
        is_correct: isCorrect,
        time_taken_seconds: timeTakenSeconds,
        difficulty: mq.difficulty
      };
      
      console.log('Attempting to insert answer record:', answerRecord);
      
      const { data: insertData, error: insertError } = await supabase
        .from('user_answers')
        .insert(answerRecord)
        .select();
      
      if (insertError) {
        console.error('❌ Error inserting into user_answers table:', insertError);
        console.log('Error details:', insertError);
        
        // Check if it's an RLS policy error
        if (insertError.message && insertError.message.includes('policy')) {
          console.log('🔒 This is a Row Level Security (RLS) policy error');
          console.log('Answer data will be stored in localStorage as fallback');
          
          // Store in localStorage as fallback
          const existingAnswers = JSON.parse(localStorage.getItem('userAnswersData') || '[]');
          existingAnswers.push({
            ...answerRecord,
            timestamp: new Date().toISOString(),
            stored_locally: true
          });
          localStorage.setItem('userAnswersData', JSON.stringify(existingAnswers));
          console.log('✅ Answer data stored in localStorage as fallback');
        }
      } else {
        console.log('✅ Successfully inserted answer into user_answers table:', insertData);
      }
    } catch (err) {
      console.error('Failed to insert answer into user_answers:', err);
      
      // Store in localStorage as fallback
      const { data: { session } } = await supabase.auth.getSession();
      const studentId = session?.user?.id || null;
      const answerRecord = {
        student_id: studentId,
        sub_question_id: sq.id,
        main_question_id: mq.id,
        is_correct: isCorrect,
        time_taken_seconds: timeTakenSeconds,
        difficulty: mq.difficulty,
        timestamp: new Date().toISOString(),
        stored_locally: true
      };
      
      const existingAnswers = JSON.parse(localStorage.getItem('userAnswersData') || '[]');
      existingAnswers.push(answerRecord);
      localStorage.setItem('userAnswersData', JSON.stringify(existingAnswers));
      console.log('✅ Answer data stored in localStorage as fallback due to error');
    }
    // Reset timer for next sub-question
    subQuestionStartTimestamp = Date.now();
    // --- Update dynamic progress bar after answer ---
    const progressBar = document.querySelector('.progress-bar');
    const progressNodes = progressBar.querySelectorAll('.progress-node');
    progressNodes[currentSubIdx]?.classList.remove('active');
    subQuestionResults[currentSubIdx] = isCorrect;
    if (isCorrect) {
      progressNodes[currentSubIdx]?.classList.add('checked');
      score++;
    } else {
      progressNodes[currentSubIdx]?.classList.add('wrong');
    }
    updateScoreDisplay();
    // Immediate feedback: highlight selected choice
    const btns = quizRight.querySelectorAll('.quiz-choice-btn');
    btns.forEach((btn, i) => {
      btn.classList.remove('correct', 'wrong');
      btn.disabled = true; // Disable all buttons after submit
      if (i === answerIndex) {
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
      } else if (isCorrect && choices[i] === sq.correct_answer) {
        btn.classList.add('correct');
      }
    });
    // Wait 1 second, then show loading popup and go to next sub-question/main-question
    setTimeout(() => {
      showLoadingPopupFn(true);
      setTimeout(() => {
        showLoadingPopupFn(false);
        // Next sub-question or next main question
        if (currentSubIdx + 1 < mq.sub_questions.length) {
          currentSubIdx++;
        } else {
          currentSubIdx = 0;
          currentMainIdx++;
        }
        if (currentMainIdx < mainQuestions.length && mainQuestions[currentMainIdx].sub_questions.length > 0) {
          renderCurrentQuestion();
          submitLocked = false;
          submitBtn.disabled = false;
        } else {
          showEndMessage();
        }
      }, 1200);
    }, 1000);
  });

  // Function to sync localStorage data back to database
  async function syncLocalStorageData() {
    try {
      // Sync user answers data
      const localAnswers = JSON.parse(localStorage.getItem('userAnswersData') || '[]');
      if (localAnswers.length > 0) {
        console.log(`Attempting to sync ${localAnswers.length} answers from localStorage...`);
        
        for (const answer of localAnswers) {
          if (answer.stored_locally) {
            const { data: { session } } = await supabase.auth.getSession();
            const studentId = session?.user?.id || null;
            
            const answerRecord = {
              student_id: studentId,
              sub_question_id: answer.sub_question_id,
              main_question_id: answer.main_question_id,
              is_correct: answer.is_correct,
              time_taken_seconds: answer.time_taken_seconds,
              difficulty: answer.difficulty
            };
            
            const { error: syncError } = await supabase
              .from('user_answers')
              .insert(answerRecord);
            
            if (!syncError) {
              console.log('✅ Successfully synced answer from localStorage');
            } else {
              console.log('❌ Failed to sync answer from localStorage:', syncError);
              break; // Stop syncing if we encounter an error
            }
          }
        }
        
        // Clear localStorage after successful sync
        localStorage.removeItem('userAnswersData');
        console.log('✅ localStorage data synced and cleared');
      }
    } catch (err) {
      console.error('Error syncing localStorage data:', err);
    }
  }

  // Initial fetch and render
  (async () => {
    showLoadingPopupFn(true);
    
    // Try to sync any localStorage data first
    await syncLocalStorageData();
    
    mainQuestions = await fetchQuestions();
    currentMainIdx = 0;
    currentSubIdx = 0;
    showLoadingPopupFn(false);
    if (mainQuestions.length && mainQuestions[0].sub_questions.length) {
      renderCurrentQuestion();
      startQuizClock(); // Start the quiz clock
    } else {
      questionText.innerHTML = 'No questions available.';
    }
  })();
}); 