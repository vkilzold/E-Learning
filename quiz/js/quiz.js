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
    let subQuestionResults = []; // This array now correctly tracks results per main question

    // --- New Mastery Logic Variables ---
    const correctAnswersNeeded = 10;
    let correctAnswersCount = 0;
    let currentDifficulty = 'Easy';
    let usedQuestionIds = [];

    const quizHeader = document.querySelector('.quiz-header');
    const roundLabel = quizHeader.querySelector('.round-label');
    const questionLabel = quizHeader.querySelector('.question-label');
    const questionText = document.querySelector('.quiz-question-text');
    const choicesForm = document.querySelector('.quiz-choices-form');
    const submitBtn = document.querySelector('.quiz-submit-btn');
    const progressNodes = document.querySelectorAll('.progress-node');
    const loadingPopup = document.getElementById('loadingPopup');
    const quizMainArea = document.querySelector('.quiz-main-area');

    // Get the new modal and its elements
    const scenarioTransitionModal = document.getElementById('scenario-transition-modal');
    const closeScenarioModal = document.getElementById('close-scenario-modal');
    const scenarioTransitionTitle = document.getElementById('scenario-transition-title');
    const scenarioTransitionText = document.getElementById('scenario-transition-text');
    const scenarioNextBtn = document.getElementById('scenario-next-btn');


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
        questionLabel.innerHTML = `<span class='question-number'>Main Q${currentMainIdx + 1}</span> | Topic: ${mq.topic || ''} | Difficulty: <span style='color:${(mq.difficulty||'').toLowerCase()==='easy' ? '#388e3c' : (mq.difficulty||'').toLowerCase()==='medium' ? '#ff9800' : '#B0323A'};'>${mq.difficulty||''}</span> | Correct Streak: ${correctAnswersCount}`;
        
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

            // Add modal and label logic
            const helpModal = document.getElementById('quiz-help-modal');
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
        
        // Fix: Reset the progress bar HTML for the new round
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
                        playFallbackSound(isCorrect);
                    });
                } catch (error) {
                    console.warn(`Error playing ${soundType} sound:`, error.message);
                    playFallbackSound(isCorrect);
                }
            } else {
                console.warn(`${soundType} sound element not found`);
                playFallbackSound(isCorrect);
            }
        }
        
        // Better sound effects using Web Audio API
        function playFallbackSound(isCorrect) {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (isCorrect) {
                    playCorrectSound(audioContext);
                } else {
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
            correctAnswersCount++; // New: Increment correct answers count
        } else {
            progressNodes[currentSubIdx]?.classList.add('wrong');
            correctAnswersCount = 0; // New: Reset count on a wrong answer
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
        
        // Set feedback modal status and explanation
        const feedbackStatus = document.getElementById('quiz-feedback-status');
        const feedbackExplanation = document.querySelector('.quiz-feedback-explanation');
        if (feedbackStatus && feedbackExplanation) {
            if (isCorrect) {
                feedbackStatus.textContent = 'CORRECT';
                feedbackStatus.className = 'quiz-feedback-status';
                feedbackExplanation.textContent = 'You are on a roll! Keep it up!'; // Customize for correct answer
            } else {
                feedbackStatus.textContent = 'INCORRECT';
                feedbackStatus.className = 'quiz-feedback-status incorrect';
                feedbackExplanation.textContent = 'Don’t worry, you can try again. We’ll re-focus on this topic to help you master it.'; // Customize for incorrect answer
            }
        }
        
        // Show feedback modal
        const feedbackModal = document.getElementById('quiz-feedback-modal');
        if (feedbackModal) feedbackModal.style.display = 'flex';
        // Do NOT load the next question here
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

    // New function to fetch and render questions for the current difficulty
    async function fetchAndRenderQuestions() {
        showLoadingPopupFn(true);
        mainQuestions = await fetchQuestions(currentDifficulty);
        showLoadingPopupFn(false);
        if (mainQuestions.length > 0 && mainQuestions[0].sub_questions.length > 0) {
            // New: Reset the progress bar HTML for the new difficulty
            const progressBar = document.querySelector('.progress-bar');
            if (progressBar) progressBar.innerHTML = '';

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
        startQuizClock(); // Start the quiz clock
    })();

    // Find feedback modal and next button
    const feedbackModal = document.getElementById('quiz-feedback-modal');
    const feedbackNextBtn = document.getElementById('quiz-feedback-next-btn');

    if (feedbackNextBtn) {
        feedbackNextBtn.addEventListener('click', function() {
            if (feedbackModal) feedbackModal.style.display = 'none';
            
            // New logic to handle difficulty progression
            if (correctAnswersCount >= correctAnswersNeeded) {
                console.log(`Mastery achieved for ${currentDifficulty} difficulty! Moving to the next level.`);
                
                let nextDifficulty = '';
                if (currentDifficulty === 'Easy') {
                    nextDifficulty = 'Medium';
                } else if (currentDifficulty === 'Medium') {
                    nextDifficulty = 'Hard';
                }
                
                if (nextDifficulty) {
                    scenarioTransitionTitle.textContent = `Scenario Complete!`;
                    scenarioTransitionText.textContent = `You've mastered the ${currentDifficulty} questions. Get ready for the ${nextDifficulty} challenge!`;
                    if (scenarioTransitionModal) scenarioTransitionModal.style.display = 'flex';
                } else {
                    console.log('Congratulations! You have completed all difficulties.');
                    showEndMessage();
                }
            } else {
                // If mastery is not achieved, move to the next sub-question
                if (currentSubIdx + 1 < mainQuestions[currentMainIdx].sub_questions.length) {
                    currentSubIdx++;
                } else {
                    // Fix: Reset the subQuestionResults array when moving to a new main question
                    subQuestionResults = []; 
                    
                    // If all sub-questions for the current main question are answered, move to the next main question
                    // and add the current main question ID to the used questions list.
                    usedQuestionIds.push(mainQuestions[currentMainIdx].id);
                    currentSubIdx = 0;
                    currentMainIdx++;
                }

                // If all main questions in the current set are exhausted, refetch questions for the current difficulty.
                if (currentMainIdx >= mainQuestions.length) {
                    console.log('All questions in the current set have been answered. Fetching more questions...');
                    currentMainIdx = 0;
                    fetchAndRenderQuestions();
                } else {
                    renderCurrentQuestion();
                }
            }
            submitLocked = false;
            submitBtn.disabled = false;
        });
    }

    // New event listener for the scenario transition modal's "Continue" button
    if (scenarioNextBtn) {
        scenarioNextBtn.addEventListener('click', function() {
            if (scenarioTransitionModal) scenarioTransitionModal.style.display = 'none';
            
            let nextDifficulty = '';
            if (currentDifficulty === 'Easy') {
                nextDifficulty = 'Medium';
            } else if (currentDifficulty === 'Medium') {
                nextDifficulty = 'Hard';
            }
            
            currentDifficulty = nextDifficulty;
            // Reset all counters for the new difficulty
            correctAnswersCount = 0;
            currentMainIdx = 0;
            currentSubIdx = 0;
            subQuestionResults = [];
            usedQuestionIds = [];
            fetchAndRenderQuestions();
        });
    }

    // Optional: Close the new modal by clicking the 'x' button
    if (closeScenarioModal) {
      closeScenarioModal.addEventListener('click', () => {
        if (scenarioTransitionModal) scenarioTransitionModal.style.display = 'none';
      });
    }
});