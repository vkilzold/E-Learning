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


// ================================================== New Quiz Logic for New Layout ==================================================
document.addEventListener('DOMContentLoaded', function() {
    // --- New: Fetch main_questions and sub_questions from Supabase ---
    let mainQuestions = [];
    let currentMainIdx = 0;
    let currentSubIdx = 0;
    let score = 0;
    let roundCorrect = true; // New: Tracks if all sub-questions in the current round are correct
    let subQuestionResults = []; // This array now correctly tracks results per main question

    // --- New Mastery Logic Variables ---
    const easyAnswersNeeded = 10;
    const mediumAnswersNeeded = 7;
    const hardAnswersNeeded = 5;
    let currentDifficulty = 'Easy';
    let usedQuestionIds = [];
    
    // UI Elements
    const quizHeader = document.querySelector('.quiz-header');
    const roundLabel = quizHeader.querySelector('.round-label');
    const questionLabel = quizHeader.querySelector('.question-label');
    const questionText = document.querySelector('.quiz-question-text');
    const choicesForm = document.querySelector('.quiz-choices-form');
    const submitBtn = document.querySelector('.quiz-submit-btn');
    const progressNodes = document.querySelectorAll('.progress-node');
    const loadingPopup = document.getElementById('loadingPopup');
    const quizMainArea = document.querySelector('.quiz-main-area');
    const quizIntro = document.getElementById('quiz-intro');

    // Get the new modals and their elements
    const difficultyModal = document.getElementById('difficulty-modal');
    const difficultyModalTitle = document.getElementById('difficulty-modal-title');
    const difficultyModalText = document.getElementById('difficulty-modal-text');
    const difficultyModalOkBtn = document.getElementById('difficulty-modal-ok-btn');

    // Add score display at the top if not present
    let scoreDisplay = document.querySelector('.quiz-score-display');
    if (!scoreDisplay) {
        scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'quiz-score-display';
        scoreDisplay.style.cssText = 'position:absolute;top:1.5rem;right:2rem;font-size:1rem;font-family:Pixelify Sans,sans-serif;font-weight:700;color:#23282b;background:#ffd740;padding:0.3rem 0.8rem;border-radius:0.7rem;z-index:20;box-shadow:0 2px 8px #ffd74055;';
        quizHeader.appendChild(scoreDisplay);
    }

    // New: Timer variables
    let questionTimer = null;
    const QUESTION_TIME = 60;
    let timeLeft = QUESTION_TIME;

    // Add clock display to the header
    let clockDisplay = document.querySelector('.quiz-clock-display');
    if (!clockDisplay) {
        clockDisplay = document.createElement('div');
        clockDisplay.className = 'quiz-clock-display';
        clockDisplay.style.cssText = 'position:absolute;top:1.5rem;left:2rem;font-size:1.3rem;font-family:Pixelify Sans,sans-serif;font-weight:700;color:#23282b;background:#e0e0e0;padding:0.5rem 1.2rem;border-radius:0.7rem;z-index:20;box-shadow:0 2px 8px #e0e0e055;';
        quizHeader.appendChild(clockDisplay);
    }

    function updateScoreDisplay() {
        let maxScore;
        if (currentDifficulty === 'Easy') {
            maxScore = easyAnswersNeeded;
        } else if (currentDifficulty === 'Medium') {
            maxScore = mediumAnswersNeeded;
        } else {
            maxScore = hardAnswersNeeded;
        }
        scoreDisplay.textContent = `Score: ${score} / ${maxScore}`;
    }

    async function fetchQuestions(difficulty) {
        console.log(`Fetching ${difficulty} questions from database...`);
        
        try {
            // Fetch all main_questions for the given difficulty, excluding those already used
            const { data: mains, error: mainErr } = await supabase
                .from('main_questions')
                .select('*')
                .eq('difficulty', difficulty)
                .not('id', 'in', `(${usedQuestionIds.join(',')})`)
                .order('id', { ascending: true })
                .limit(100);
            
            if (mainErr) {
                console.error('❌ Error fetching main questions:', mainErr);
                alert('Error fetching main questions: ' + mainErr.message);
                return [];
            }
            
            console.log(`✅ Successfully fetched ${mains?.length || 0} main questions`);
            
            if (!mains || mains.length === 0) {
                console.log(`No more new ${difficulty} questions found. Resetting used questions list and re-fetching.`);
                usedQuestionIds = [];
                // Re-fetch without the 'not in' filter if no new questions are found
                return fetchQuestions(difficulty);
            }

            // For each main_question, fetch its sub_questions and hints
            for (const mq of mains) {
                console.log(`Fetching sub-questions for main question ${mq.id}...`);
                
                const { data: subs, error: subErr } = await supabase
                    .from('sub_questions')
                    .select('*, hints(first_hint, second_hint, third_hint)')
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
        if (!mainQuestions.length || currentMainIdx >= mainQuestions.length) {
            console.log("No more questions to render. Ending quiz.");
            showEndMessage();
            return;
        }

        const mq = mainQuestions[currentMainIdx];
        const sq = mq.sub_questions[currentSubIdx];

        if (!sq) {
            console.log("No sub-question found. Something is wrong with the question data.");
            // Skip to the next main question if sub-questions are missing
            currentMainIdx++;
            currentSubIdx = 0;
            subQuestionResults = [];
            roundCorrect = true;
            renderCurrentQuestion();
            return;
        }
        
        // Header
        roundLabel.textContent = `Round ${currentMainIdx + 1}`;
        questionLabel.innerHTML = `<span class='question-number'>Main Q${currentMainIdx + 1}</span> | Topic: ${mq.topic || ''} | Difficulty: <span style='color:${(mq.difficulty||'').toLowerCase()==='easy' ? '#388e3c' : (mq.difficulty||'').toLowerCase()==='medium' ? '#ff9800' : '#B0323A'};'>${mq.difficulty||''}</span> | Correct Streak: ${score}`;
        
        // Main question as context (optional)
        let mainQHtml = mq.main_question ? `<div class='main-question-context'>${mq.main_question}</div>` : '';
        
        // Render main question, sub-question, and hint in quiz-left
        const quizLeft = document.querySelector('.quiz-left');
        if (quizLeft) {
            quizLeft.innerHTML = '';
            // Main question
            if (mainQHtml) quizLeft.innerHTML += mainQHtml;
            // Sub-question
            const subQDiv = document.createElement('div');
            subQDiv.className = 'sub-question-text';
            subQDiv.innerHTML = sq.question;
            quizLeft.appendChild(subQDiv);
            // Hint button
            const hintBtn = document.createElement('div');
            hintBtn.className = 'quiz-help-icon';
            hintBtn.title = 'Hint';
            hintBtn.innerHTML = '?<span class="quiz-hint-label" style="display:none;">Hint</span>';
            quizLeft.appendChild(hintBtn);

            // Get the hint modal and its content element
            const helpModal = document.getElementById('quiz-help-modal');
            const hintTextElement = helpModal?.querySelector('p');
            
            // Update the hint modal content
            if (hintTextElement && sq.hints && sq.hints.first_hint) {
                hintTextElement.textContent = sq.hints.first_hint;
            } else if (hintTextElement) {
                hintTextElement.textContent = 'No hint available for this question.';
            }
            
            // Add modal and label logic
            const closeHelp = document.getElementById('close-help-modal');
            const quizHintLabel = hintBtn.querySelector('.quiz-hint-label');
            if (hintBtn && helpModal && closeHelp && quizHintLabel) {
                hintBtn.addEventListener('click', () => {
                    helpModal.style.display = 'flex';
                });
                closeHelp.addEventListener('click', () => {
                    helpModal.style.display = 'none';
                });
                helpModal.addEventListener('click', (e) => {
                    if (e.target === helpModal) helpModal.style.display = 'none';
                });
                hintBtn.addEventListener('mouseenter', () => {
                    quizHintLabel.style.display = 'inline-block';
                });
                hintBtn.addEventListener('mouseleave', () => {
                    quizHintLabel.style.display = 'none';
                });
            }
        }
        
        // Only render choices and submit in quiz-right
        const quizRight = document.querySelector('.quiz-right');
        if (quizRight) {
            // Remove any sub-question or hint
            let prevSubQ = quizRight.querySelector('.sub-question-text');
            if (prevSubQ) prevSubQ.remove();
            let prevHint = quizRight.querySelector('.quiz-help-icon');
            if (prevHint) prevHint.remove();
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
        
        // Reset the progress bar HTML for the new round
        if (currentSubIdx === 0) {
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

        // Start the question timer
        startQuestionTimer();
    }

    function showLoadingPopupFn(show) {
        if (loadingPopup) loadingPopup.classList.toggle('hidden', !show);
    }

    function showEndMessage() {
        if (questionTimer) {
            clearInterval(questionTimer);
        }
        window.location.href = 'progress.html';
    }

    function updateClockDisplay() {
        clockDisplay.textContent = `Time Left: ${timeLeft}s`;
    }
    
    function startQuestionTimer() {
        // Clear any existing timer to prevent multiple timers running at once
        if (questionTimer) {
            clearInterval(questionTimer);
        }
        timeLeft = QUESTION_TIME;
        updateClockDisplay();
        questionTimer = setInterval(() => {
            timeLeft--;
            updateClockDisplay();
            if (timeLeft <= 0) {
                clearInterval(questionTimer);
                // Handle timeout directly
                handleTimeout();
            }
        }, 1000);
    }

    function handleTimeout() {
        submitLocked = true;
        submitBtn.disabled = true;

        const mq = mainQuestions[currentMainIdx];
        const sq = mq.sub_questions[currentSubIdx];

        // Mark as incorrect
        const isCorrect = false;
        const timeTakenSeconds = QUESTION_TIME;

        processAnswer(sq, mq, isCorrect, timeTakenSeconds);
        showFeedbackModal(isCorrect);
    }

    // New: Centralized function to process answer and update UI
    async function processAnswer(sq, mq, isCorrect, timeTakenSeconds) {
        
        // Update roundCorrect flag
        if (!isCorrect) {
            roundCorrect = false;
        }

        // Play sound effect for correct or wrong answer
        const correctSound = document.getElementById('correct-sound');
        const wrongSound = document.getElementById('wrong-sound');
        
        function playSound(audioElement, soundType) {
            if (audioElement) {
                try {
                    audioElement.currentTime = 0;
                    audioElement.play().catch(error => console.warn(`Could not play ${soundType} sound:`, error.message));
                } catch (error) {
                    console.warn(`Error playing ${soundType} sound:`, error.message);
                }
            }
        }
        
        if (isCorrect) {
            playSound(correctSound, 'correct');
        } else {
            playSound(wrongSound, 'wrong');
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
            
            const { error: insertError } = await supabase
                .from('user_answers')
                .insert(answerRecord);
            
            if (insertError) {
                console.error('❌ Error inserting into user_answers table:', insertError);
                if (insertError.message && insertError.message.includes('policy')) {
                    console.log('🔒 This is a Row Level Security (RLS) policy error. Storing in localStorage as fallback.');
                    const existingAnswers = JSON.parse(localStorage.getItem('userAnswersData') || '[]');
                    existingAnswers.push({ ...answerRecord, timestamp: new Date().toISOString(), stored_locally: true });
                    localStorage.setItem('userAnswersData', JSON.stringify(existingAnswers));
                }
            } else {
                console.log('✅ Successfully inserted answer into user_answers table.');
            }
        } catch (err) {
            console.error('Failed to insert answer into user_answers:', err);
            const existingAnswers = JSON.parse(localStorage.getItem('userAnswersData') || '[]');
            const { data: { session } = {} } = await supabase.auth.getSession();
            existingAnswers.push({
                student_id: session?.user?.id || null,
                sub_question_id: sq.id,
                main_question_id: mq.id,
                is_correct: isCorrect,
                time_taken_seconds: timeTakenSeconds,
                difficulty: mq.difficulty,
                timestamp: new Date().toISOString(),
                stored_locally: true
            });
            localStorage.setItem('userAnswersData', JSON.stringify(existingAnswers));
            console.log('✅ Answer data stored in localStorage as fallback due to error');
        }
        
        // Update UI
        const progressBar = document.querySelector('.progress-bar');
        const progressNodes = progressBar.querySelectorAll('.progress-node');
        progressNodes[currentSubIdx]?.classList.remove('active');
        subQuestionResults[currentSubIdx] = isCorrect;
        if (isCorrect) {
            progressNodes[currentSubIdx]?.classList.add('checked');
        } else {
            progressNodes[currentSubIdx]?.classList.add('wrong');
        }

        const quizRight = document.querySelector('.quiz-right');
        const btns = quizRight.querySelectorAll('.quiz-choice-btn');
        btns.forEach(btn => btn.disabled = true);
    }
    
    // New: Centralized function to show feedback modal
    function showFeedbackModal(isCorrect) {
        const feedbackStatus = document.getElementById('quiz-feedback-status');
        const feedbackExplanation = document.querySelector('.quiz-feedback-explanation');
        if (feedbackStatus && feedbackExplanation) {
            if (isCorrect) {
                feedbackStatus.textContent = 'CORRECT';
                feedbackStatus.className = 'quiz-feedback-status';
                feedbackExplanation.textContent = 'You are on a roll! Keep it up!';
            } else {
                feedbackStatus.textContent = 'INCORRECT';
                feedbackStatus.className = 'quiz-feedback-status incorrect';
                feedbackExplanation.textContent = 'Don’t worry, you can try again. We’ll re-focus on this topic to help you master it.';
            }
        }
        const feedbackModal = document.getElementById('quiz-feedback-modal');
        if (feedbackModal) feedbackModal.style.display = 'flex';
    }


    // --- Insert answer into user_answers on submit ---
    let submitLocked = false;
    submitBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        if (submitLocked) return;
        submitLocked = true;
        submitBtn.disabled = true;

        clearInterval(questionTimer);

        if (!mainQuestions.length) {
            submitLocked = false;
            submitBtn.disabled = false;
            return;
        }

        const mq = mainQuestions[currentMainIdx];
        const sq = mq.sub_questions[currentSubIdx];
        
        const quizRight = document.querySelector('.quiz-right');
        const selectedBtn = quizRight.querySelector('.quiz-choice-btn.selected');

        if (!selectedBtn) {
            alert('Please select an answer!');
            submitLocked = false;
            submitBtn.disabled = false;
            startQuestionTimer(); // Restart timer
            return;
        }
        
        let choices = Array.isArray(sq.choices) ? sq.choices : (typeof sq.choices === 'string' ? JSON.parse(sq.choices) : []);
        const answerIndex = selectedBtn.getAttribute('data-choice').charCodeAt(0) - 65;
        const isCorrect = choices[answerIndex] === sq.correct_answer;
        let timeTakenSeconds = QUESTION_TIME - timeLeft;
        
        // Highlight selected choice and correct answer
        const btns = quizRight.querySelectorAll('.quiz-choice-btn');
        btns.forEach((btn, i) => {
            btn.classList.remove('correct', 'wrong');
            if (i === answerIndex) {
                btn.classList.add(isCorrect ? 'correct' : 'wrong');
            } else if (choices[i] === sq.correct_answer) {
                btn.classList.add('correct');
            }
        });

        processAnswer(sq, mq, isCorrect, timeTakenSeconds);
        showFeedbackModal(isCorrect);
    });

    // Function to sync localStorage data back to database
    async function syncLocalStorageData() {
        try {
            const localAnswers = JSON.parse(localStorage.getItem('userAnswersData') || '[]');
            if (localAnswers.length > 0) {
                console.log(`Attempting to sync ${localAnswers.length} answers from localStorage...`);
                for (const answer of localAnswers) {
                    if (answer.stored_locally) {
                        const { data: { session } = {} } = await supabase.auth.getSession();
                        const answerRecord = { ...answer, student_id: session?.user?.id || null };
                        delete answerRecord.stored_locally;
                        delete answerRecord.timestamp;
                        const { error: syncError } = await supabase.from('user_answers').insert(answerRecord);
                        if (!syncError) {
                            console.log('✅ Successfully synced answer from localStorage');
                        } else {
                            console.log('❌ Failed to sync answer from localStorage:', syncError);
                            break;
                        }
                    }
                }
                localStorage.removeItem('userAnswersData');
                console.log('✅ localStorage data synced and cleared');
            }
        } catch (err) {
            console.error('Error syncing localStorage data:', err);
        }
    }

    // New function to fetch and render questions for the current difficulty
    async function fetchAndRenderQuestions() {
        showLoadingPopupFn(true);
        mainQuestions = await fetchQuestions(currentDifficulty);
        showLoadingPopupFn(false);
        if (mainQuestions.length > 0 && mainQuestions[0].sub_questions.length > 0) {
            const progressBar = document.querySelector('.progress-bar');
            if (progressBar) progressBar.innerHTML = '';
            
            subQuestionResults = [];
            roundCorrect = true;
            renderCurrentQuestion();
        } else {
            questionText.innerHTML = `No ${currentDifficulty} questions available. Quiz finished!`;
            showEndMessage();
        }
    }

    // Initial fetch and render
    (async () => {
        await syncLocalStorageData();
        fetchAndRenderQuestions();
    })();

    const feedbackModal = document.getElementById('quiz-feedback-modal');
const feedbackNextBtn = document.getElementById('quiz-feedback-next-btn');
const helpModal = document.getElementById('quiz-help-modal'); // Get the hint modal element here

if (feedbackNextBtn) {
    feedbackNextBtn.addEventListener('click', function() {
        if (feedbackModal) feedbackModal.style.display = 'none';
        
        // --- THIS IS THE NEW LINE ---
        if (helpModal) helpModal.style.display = 'none'; 
        
        const mq = mainQuestions[currentMainIdx];
        
        if (currentSubIdx + 1 < mq.sub_questions.length) {
            currentSubIdx++;
            renderCurrentQuestion();
        } else {
            // This is the last sub-question of the round
            if (roundCorrect) {
                score++;
            }
            updateScoreDisplay();

            const easyGoal = 10;
            const mediumGoal = 7;
            const hardGoal = 5;

            if (currentDifficulty === 'Easy' && score >= easyGoal) {
                difficultyModalTitle.textContent = `Level Up!`;
                difficultyModalText.textContent = `You've mastered the Easy scenarios. Get ready for the Medium challenge!`;
                if (difficultyModal) difficultyModal.style.display = 'flex';
            } else if (currentDifficulty === 'Medium' && score >= mediumGoal) {
                difficultyModalTitle.textContent = `Level Up!`;
                difficultyModalText.textContent = `You've mastered the Medium scenarios. Get ready for the Hard challenge!`;
                if (difficultyModal) difficultyModal.style.display = 'flex';
            } else if (currentDifficulty === 'Hard' && score >= hardGoal) {
                difficultyModalTitle.textContent = `Congratulations!`;
                difficultyModalText.textContent = `You have completed all difficulties. Your quiz journey is now complete.`;
                if (difficultyModal) difficultyModal.style.display = 'flex';
            } else {
                roundCorrect = true;
                subQuestionResults = []; 
                usedQuestionIds.push(mainQuestions[currentMainIdx].id);
                currentSubIdx = 0;
                currentMainIdx++;

                if (currentMainIdx >= mainQuestions.length) {
                    console.log('All questions in the current set have been answered. Fetching more questions...');
                    currentMainIdx = 0;
                    fetchAndRenderQuestions();
                } else {
                    renderCurrentQuestion();
                }
            }
        }
        submitLocked = false;
        submitBtn.disabled = false;
    });
}

    if (difficultyModalOkBtn) {
        difficultyModalOkBtn.addEventListener('click', function() {
            if (difficultyModal) difficultyModal.style.display = 'none';
            
            let nextDifficulty = '';
            if (currentDifficulty === 'Easy') {
                nextDifficulty = 'Medium';
            } else if (currentDifficulty === 'Medium') {
                nextDifficulty = 'Hard';
            }
            
            if (nextDifficulty) {
                currentDifficulty = nextDifficulty;
                score = 0;
                roundCorrect = true;
                currentMainIdx = 0;
                currentSubIdx = 0;
                subQuestionResults = [];
                usedQuestionIds = [];
                fetchAndRenderQuestions();
            } else {
                showEndMessage();
            }
        });
    }
});