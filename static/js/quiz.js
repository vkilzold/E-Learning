// ---------------------- Supabase Setup ----------------------
import { supabase } from "../utils/supabaseClient.js";

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
    // Force-hide any modals on load
    const modalsToHide = [
        document.getElementById('quiz-help-modal'),
        document.getElementById('prestart-difficulty-modal')
    ];
    modalsToHide.forEach(m => { if (m) m.style.display = 'none'; });
    // --- New: Fetch main_questions and sub_questions from Supabase ---
    let mainQuestions = [];
    let currentMainIdx = 0;
    let currentSubIdx = 0;
    let score = 0;
    let roundCorrect = true;
    let subQuestionResults = [];

    // --- New Mastery Logic Variables ---
    const easyAnswersNeeded = 5;
    const mediumAnswersNeeded = 4;
    const hardAnswersNeeded = 3;
    let currentDifficulty = 'Easy';
    let pendingNextDifficulty = '';
    let usedQuestionIds = [];

    // --- User Progress Tracking Variables ---
    let difficultyProgressData = {
        totalMainQuestions: 0,        // Total main questions attempted in current difficulty
        correctMainQuestions: 0,      // Correct main questions in current difficulty
        hintUsageCount: 0,           // Number of times hint was used in current difficulty
        mistakeCount: 0,             // Number of incorrect main question attempts in current difficulty
        mainQuestionAttempts: [],    // Track each main question attempt for ability calculation
        points: 0                    // Accumulated points for correct sub-questions in this difficulty
    };

    // --- User Scaffold Level ---
    let userScaffoldLevel = 0; // Default to Low (0) scaffold level

    // Function to fetch user's current scaffold level
    async function fetchUserScaffoldLevel() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const studentId = session?.user?.id || null;

            if (!studentId) {
                console.log('User not logged in, using default scaffold level (0)');
                userScaffoldLevel = 0;
                return;
            }

            // Always check the database first to get the user's actual scaffold level
            const { data: userProfile, error } = await supabase
                .from('user_profiles')
                .select('scaffold_level')
                .eq('id', studentId)
                .single();

            if (error) {
                console.error('❌ Error fetching user scaffold level:', error);
                userScaffoldLevel = 0; // Default to Low (0) if database error
            } else if (userProfile && userProfile.scaffold_level !== null) {
                // Use the actual scaffold level from the database
                userScaffoldLevel = userProfile.scaffold_level;
                console.log(`✅ User scaffold level from database: ${userScaffoldLevel}`);
            } else {
                // If no scaffold level is set in database, use default (0)
                console.log('No scaffold level found in database, using default (0)');
                userScaffoldLevel = 0;
            }
        } catch (err) {
            console.error('Exception fetching user scaffold level:', err);
            userScaffoldLevel = 0; // Default to Low (0) if any exception occurs
        }
    }

    // Function to reset progress tracking for new difficulty
    function resetDifficultyProgress() {
        difficultyProgressData = {
            totalMainQuestions: 0,
            correctMainQuestions: 0,
            hintUsageCount: 0,
            mistakeCount: 0,
            mainQuestionAttempts: [],
            points: 0
        };
    }

    // Function to get the appropriate hint based on user's scaffold level
    function getHintByScaffoldLevel(hints) {
        if (!hints) return 'No hint available for this question.';
        
        // Map scaffold level to hint type
        // scaffold_level 0 = Low = first_hint (most basic)
        // scaffold_level 1 = Medium = second_hint (moderate)
        // scaffold_level 2 = High = third_hint (most advanced)
        let selectedHint;
        let hintType;
        
        switch (userScaffoldLevel) {
            case 0:
                selectedHint = hints.first_hint || 'No basic hint available.';
                hintType = 'first_hint (Low scaffold)';
                break;
            case 1:
                selectedHint = hints.second_hint || hints.first_hint || 'No moderate hint available.';
                hintType = 'second_hint (Medium scaffold)';
                break;
            case 2:
                selectedHint = hints.third_hint || hints.second_hint || hints.first_hint || 'No advanced hint available.';
                hintType = 'third_hint (High scaffold)';
                break;
            default:
                selectedHint = hints.first_hint || 'No hint available for this question.';
                hintType = 'first_hint (default)';
        }
        
        console.log(`🎯 Selected ${hintType} for scaffold level ${userScaffoldLevel}`);
        return selectedHint;
    }

    // Function to calculate ability score based on performance
    function calculateAbilityScore() {
        const attempts = (difficultyProgressData && difficultyProgressData.mainQuestionAttempts) || [];
        if (attempts.length === 0) return 0;

        // Prefer explicit metrics on difficultyProgressData if present
        let accuracy = (typeof difficultyProgressData?.accuracy === 'number') ? difficultyProgressData.accuracy : null;
        let hintUsage = (typeof difficultyProgressData?.hintUsage === 'number') ? difficultyProgressData.hintUsage : null;
        let mistakes = (typeof difficultyProgressData?.mistakes === 'number') ? difficultyProgressData.mistakes : null;

        // If any metric is missing, try to compute reasonable fallbacks from attempts
        if (accuracy === null || hintUsage === null || mistakes === null) {
            let totalSub = 0;
            let correctSubs = 0;
            let totalHintsCount = 0;
            let attemptsWithHint = 0;
            let mistakesSum = 0;
            let perfectRounds = 0;

            for (const a of attempts) {
                // Sub-question level counts if available
                const total = (typeof a.totalCount === 'number') ? a.totalCount
                            : (typeof a.totalSubQuestions === 'number') ? a.totalSubQuestions
                            : null;
                const correct = (typeof a.correctCount === 'number') ? a.correctCount
                            : (typeof a.correctSubQuestions === 'number') ? a.correctSubQuestions
                            : null;

                if (total != null) totalSub += total;
                if (correct != null) correctSubs += (correct != null ? correct : 0);

                // mistakes per attempt if available
                if (typeof a.mistakes === 'number') {
                    mistakesSum += a.mistakes;
                } else if (total != null && correct != null) {
                    mistakesSum += Math.max(0, total - correct);
                } else {
                    // fallback: if we know if the attempt was perfect or not
                    if (a.isPerfect) {
                        // zero mistakes for perfect
                    } else {
                        // count 1 mistake for a non-perfect attempt as a conservative fallback
                        mistakesSum += 1;
                    }
                }

                // hint usage: either numeric hintsUsed or boolean flags
                if (typeof a.hintsUsed === 'number') {
                    totalHintsCount += a.hintsUsed;
                    if (a.hintsUsed > 0) attemptsWithHint++;
                } else if (a.hintUsed || a.usedHint || a.hints) {
                    attemptsWithHint++;
                    totalHintsCount += 1;
                }

                if (a.isPerfect) perfectRounds++;
            }

            // Compute accuracy fallback: prefer sub-question accuracy, else use perfect-round ratio
            if (accuracy === null) {
                if (totalSub > 0) {
                    accuracy = correctSubs / totalSub;
                } else {
                    accuracy = attempts.length > 0 ? (perfectRounds / attempts.length) : 0;
                }
            }

            // Compute hintUsage fallback as fraction of attempts where a hint was used
            if (hintUsage === null) {
                hintUsage = attempts.length > 0 ? (attemptsWithHint / attempts.length) : 0;
                // if we have totalHintsCount and totalSub, normalize to average hints per attempt (optional)
                // but the rule expects a proportion, so fraction-of-attempts-with-hint is reasonable
            }

            // Compute mistakes fallback as total mistakes across attempts
            if (mistakes === null) {
                mistakes = mistakesSum;
            }
        }

        // Apply the requested rule-set:
        // if Accuracy >= 0.8 and HintUsage < 0.3 and Mistakes <= 2 → ability = 1
        // else if Accuracy < 0.5 or HintUsage > 0.5 or Mistakes >= 5 → ability = -1
        // else → ability = 0
        if (accuracy >= 0.75 && hintUsage < 0.3 && mistakes <= 2) {
            return 1;
        } else if (accuracy < 0.5 || hintUsage > 0.5 || mistakes >= 5) {
            return -1;
        } else {
            return 0;
        }
    }

    // Function to insert user progress data into database
    async function insertUserProgress(difficulty) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const studentId = session?.user?.id || null;

            if (!studentId) {
                console.log('User not logged in, skipping progress insertion.');
                return;
            }

            // Calculate metrics - accuracy as decimal (0-1) with 3 decimal places
            const accuracy = difficultyProgressData.totalMainQuestions > 0 
                ? parseFloat(((difficultyProgressData.correctMainQuestions / difficultyProgressData.totalMainQuestions)).toFixed(3))
                : 0;
            
            // Calculate hint usage as percentage (0-1), capped at 1.00 with 3 decimal places
            const hintUsagePercentage = difficultyProgressData.totalMainQuestions > 0 
                ? Math.min(1.00, parseFloat((difficultyProgressData.hintUsageCount / difficultyProgressData.totalMainQuestions).toFixed(3)))
                : 0;
            
            const abilityScore = calculateAbilityScore();

            const progressRecord = {
                student_id: studentId,
                accuracy: accuracy,
                hint_usage: hintUsagePercentage,  // Now storing as percentage (0-1)
                mistake: difficultyProgressData.mistakeCount,
                ability: abilityScore,
                difficulty: difficulty.toLowerCase(),
                correct_answers: difficultyProgressData.correctMainQuestions,
                points: difficultyProgressData.points || 0,
                last_updated: new Date().toISOString()
            };

            console.log(`Inserting progress data for ${difficulty}:`, progressRecord);

            // Insert new record for each difficulty completion
            const { error: insertError } = await supabase
                .from('user_progress')
                .insert(progressRecord);

            if (insertError) {
                console.error('❌ Error inserting user progress:', insertError);
            } else {
                console.log('✅ Successfully inserted user progress data.');
                
                // Call ML prediction endpoint to update scaffold level
                await predictAndUpdateScaffoldLevel(studentId, accuracy, hintUsagePercentage, difficultyProgressData.mistakeCount, abilityScore, difficulty.toLowerCase());
            }

        } catch (err) {
            console.error('Exception in insertUserProgress:', err);
        }
    }

    // Function to call ML prediction and update scaffold level
    async function predictAndUpdateScaffoldLevel(studentId, accuracy, hintUsagePercentage, mistakeCount, ability, difficulty) {
        try {
            console.log('🤖 Calling ML prediction for scaffold level...');
            
            const predictionData = {
                student_id: studentId,
                accuracy: accuracy,
                hint_usage: hintUsagePercentage,  // Now passing percentage (0-1)
                mistake_count: mistakeCount,
                ability: ability,
                difficulty: difficulty
            };

            console.log('Prediction data:', predictionData);

            const response = await fetch('/predict-scaffold-level', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(predictionData)
            });

            const result = await response.json();

            if (result.success) {
                console.log(`✅ Scaffold level updated to: ${result.scaffold_level}`);
                // Optionally show a notification to the user
                // You can add a UI notification here if desired
            } else {
                console.error('❌ Failed to update scaffold level:', result.error);
            }

        } catch (err) {
            console.error('❌ Error calling ML prediction:', err);
        }
    }


    // UI Elements
    const quizHeader = document.querySelector('.quiz-header');
    const roundLabel = quizHeader.querySelector('.round-label');
    const questionLabel = quizHeader.querySelector('.question-label');
    const questionText = document.querySelector('.quiz-question-text');
    const submitBtn = document.querySelector('.quiz-submit-btn');
    const loadingPopup = document.getElementById('loadingPopup');
    const quizMainArea = document.querySelector('.quiz-new-layout');
    const quizIntro = document.getElementById('quiz-intro');
    const startQuizBtn = document.getElementById('start-quiz-btn');

    // Get the new modals and their elements
    const difficultyModal = document.getElementById('difficulty-modal');
    const difficultyModalTitle = document.getElementById('difficulty-modal-title');
    const difficultyModalText = document.getElementById('difficulty-modal-text');
    const difficultyModalOkBtn = document.getElementById('difficulty-modal-ok-btn');
    const quizChoicesButtons = document.querySelector('.quiz-choices-buttons');

    // --- Simple 'select answer' modal (replace native alert) ---
    // We'll create it once and reuse it to avoid blocking the event loop or
    // interfering with the running timer.
    let selectAnswerModal = document.getElementById('select-answer-modal');
    function ensureSelectAnswerModal() {
        if (selectAnswerModal) return selectAnswerModal;
        // overlay
        const overlay = document.createElement('div');
        overlay.id = 'select-answer-modal';
        overlay.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:20000;pointer-events:auto;';
        // backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(2px);';
        overlay.appendChild(backdrop);
        // modal box
        const box = document.createElement('div');
    box.style.cssText = 'position:relative;background:#fff7f0;padding:1.2rem 1.4rem;border-radius:0.8rem;min-width:300px;max-width:90%;box-shadow:0 8px 24px rgba(0,0,0,0.16);border:1px solid #e6d6c7;font-family:inherit;color:#222;';
        const msg = document.createElement('div');
        msg.id = 'select-answer-modal-msg';
        msg.textContent = 'Please select an answer!';
        msg.style.cssText = 'margin-bottom:1rem;font-size:1rem;';
        box.appendChild(msg);
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;justify-content:center;';
        const ok = document.createElement('button');
        ok.textContent = 'OK';
    ok.style.cssText = 'background:#8B5E3C;color:#fff;border:2px solid #6f452b;padding:0.5rem 1rem;border-radius:0.6rem;cursor:pointer;font-weight:700;box-shadow:0 2px 0 rgba(0,0,0,0.08);';
        ok.addEventListener('click', () => {
            overlay.style.display = 'none';
            // focus first choice to help the user
            const first = document.querySelector('.quiz-choice-btn');
            if (first) try { first.focus(); } catch (_) {}
        });
        btnRow.appendChild(ok);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        // click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
                const first = document.querySelector('.quiz-choice-btn');
                if (first) try { first.focus(); } catch (_) {}
            }
        });
        document.body.appendChild(overlay);
        selectAnswerModal = overlay;
        return selectAnswerModal;
    }

    function showSelectAnswerModal(message) {
        const m = ensureSelectAnswerModal();
        if (message) {
            const el = m.querySelector('#select-answer-modal-msg');
            if (el) el.textContent = message;
        }
        m.style.display = 'flex';
        // ensure the OK button is focused for quick keyboard dismissal
        const ok = m.querySelector('button');
        if (ok) try { ok.focus(); } catch (_) {}
    }

    // Create Attempts-Limit Modal by cloning the existing difficulty modal for consistent styling
    let attemptsLimitModal = document.getElementById('attempts-limit-modal');
    let attemptsLimitModalTitle = document.getElementById('attempts-limit-modal-title');
    let attemptsLimitModalText = document.getElementById('attempts-limit-modal-text');
    let attemptsLimitModalOkBtn = document.getElementById('attempts-limit-modal-ok-btn');
    if (!attemptsLimitModal && difficultyModal) {
        const clone = difficultyModal.cloneNode(true);
        clone.id = 'attempts-limit-modal';
        // Update inner elements' IDs and copy references
        const titleEl = clone.querySelector('#difficulty-modal-title');
        if (titleEl) {
            titleEl.id = 'attempts-limit-modal-title';
            titleEl.textContent = 'Heads up!';
        }
        const textEl = clone.querySelector('#difficulty-modal-text');
        if (textEl) {
            textEl.id = 'attempts-limit-modal-text';
            textEl.textContent = 'You\'ve answered 10 main questions but didn\'t reach the required score for this difficulty. Let\'s review your progress and try again later.';
        }
        const okBtnEl = clone.querySelector('#difficulty-modal-ok-btn');
        if (okBtnEl) {
            okBtnEl.id = 'attempts-limit-modal-ok-btn';
            okBtnEl.textContent = 'View Progress';
        }
        clone.style.display = 'none';
        document.body.appendChild(clone);
        attemptsLimitModal = clone;
        attemptsLimitModalTitle = document.getElementById('attempts-limit-modal-title');
        attemptsLimitModalText = document.getElementById('attempts-limit-modal-text');
        attemptsLimitModalOkBtn = document.getElementById('attempts-limit-modal-ok-btn');
    }


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

    // Audio elements (populated on DOMContentLoaded)
    let correctAudioEl = document.getElementById('correct-sound');
    let wrongAudioEl = document.getElementById('wrong-sound');
    let audioPrimed = false;
    // Shared AudioContext to use for priming and fallback beeps
    let audioCtx = null;

    // Attempt a robust priming strategy that works across browsers:
    // 1) Resume/create an AudioContext (best for Chrome/modern browsers)
    // 2) Try a very-low-volume unmuted play() of the <audio> elements during the user gesture
    // 3) Fallback to starting a tiny silent AudioBuffer on the AudioContext
    async function primeAudioIfNeeded() {
        if (audioPrimed) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx && !audioCtx) {
                try {
                    audioCtx = new AudioCtx();
                } catch (e) {
                    // some browsers may still throw here
                    audioCtx = null;
                }
            }

            // Try to resume an existing/suspended AudioContext
            if (audioCtx && audioCtx.state === 'suspended') {
                try {
                    await audioCtx.resume();
                    console.log('AudioContext resumed during priming');
                    audioPrimed = true;
                    return;
                } catch (e) {
                    // ignore and continue to other strategies
                }
            }

            // Try to play a very-low-volume unmuted snippet from the audio elements
            const ca = document.getElementById('correct-sound');
            const wa = document.getElementById('wrong-sound');
            const els = [ca, wa].filter(Boolean);
            for (const a of els) {
                try {
                    const prevVol = a.volume;
                    // set almost-silent volume but ensure not muted so playback is considered a gesture
                    a.muted = false;
                    a.volume = 0.001;
                    const p = a.play();
                    if (p && typeof p.then === 'function') {
                        await p;
                    }
                    // pause and reset
                    try { a.pause(); a.currentTime = 0; } catch (_) {}
                    a.volume = prevVol;
                    audioPrimed = true;
                    console.log('Primed via <audio> element play');
                    return;
                } catch (e) {
                    // try next element
                    try { a.pause(); a.currentTime = 0; a.muted = false; } catch (_) {}
                }
            }

            // Last-resort: start a tiny silent buffer on the AudioContext
            if (audioCtx) {
                try {
                    const buffer = audioCtx.createBuffer(1, 1, audioCtx.sampleRate || 44100);
                    const src = audioCtx.createBufferSource();
                    src.buffer = buffer;
                    src.connect(audioCtx.destination);
                    src.start(0);
                    // no need to stop, it is silent and tiny
                    audioPrimed = true;
                    console.log('Primed via AudioContext buffer source');
                    return;
                } catch (e) {
                    console.warn('AudioContext buffer priming failed:', e && e.message ? e.message : e);
                }
            }
        } catch (e) {
            console.warn('Audio priming failed:', e && e.message ? e.message : e);
        }
        // If we reach here, priming didn't succeed; leave audioPrimed=false so future gestures can retry
    }

    // Warm up audio playback to avoid first-play delays in some browsers
    (function warmupAudio() {
        try {
            if (correctAudioEl) { correctAudioEl.preload = 'auto'; correctAudioEl.muted = false; }
            if (wrongAudioEl) { wrongAudioEl.preload = 'auto'; wrongAudioEl.muted = false; }
            // try to play silently then pause to prime decoding (best-effort)
            if (correctAudioEl && correctAudioEl.readyState < 3) correctAudioEl.load();
            if (wrongAudioEl && wrongAudioEl.readyState < 3) wrongAudioEl.load();
        } catch (e) {
            console.warn('Audio warmup failed:', e && e.message ? e.message : e);
        }
    })();

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
            // Build case-insensitive difficulty variants including synonyms
            const base = (difficulty || '').toLowerCase();
            const variantsMap = {
                easy: ['Easy','easy','EASY'],
                medium: ['Medium','medium','MEDIUM','Average','average','AVERAGE'],
                hard: ['Hard','hard','HARD','Difficult','difficult','DIFFICULT']
            };
            const diffVariants = variantsMap[base] || [difficulty, base, base.toUpperCase(), base.charAt(0).toUpperCase() + base.slice(1)];
            let query = supabase
                .from('main_questions')
                .select('*')
                .in('difficulty', diffVariants)
                .limit(100);
                
            // Exclude usedQuestionIds only when there are any
            if (Array.isArray(usedQuestionIds) && usedQuestionIds.length > 0) {
                query = query.not('id', 'in', `(${usedQuestionIds.join(',')})`);
            }
            const { data: mains, error: mainErr } = await query;
            
            if (mainErr) {
                console.error('❌ Error fetching main questions:', mainErr);
                alert('Error fetching main questions: ' + mainErr.message);
                return [];
            }
            
            if (mains && mains.length > 0) {
                mains.sort(() => Math.random() - 0.5); // shuffle locally
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
            console.log("No more questions to render for this difficulty.");
            // Try fetching a fresh set once before giving up
            (async () => {
                const fresh = await fetchQuestions(currentDifficulty);
                if (Array.isArray(fresh) && fresh.length > 0 && fresh[0].sub_questions && fresh[0].sub_questions.length > 0) {
                    mainQuestions = fresh;
                    currentMainIdx = 0;
                    currentSubIdx = 0;
                    subQuestionResults = [];
                    roundCorrect = true;
                    renderCurrentQuestion();
                } else {
                    showEndMessage();
                }
            })();
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

            // Update hint content (always inline below the hint button)
            const appropriateHint = sq.hints ? getHintByScaffoldLevel(sq.hints) : 'No hint available for this question.';
            if (hintTextElement) {
                hintTextElement.textContent = appropriateHint;
            }
            // Inline help text is set, stays hidden until button click
            try {
                const inlineHelp = document.getElementById('quiz-inline-help');
                const inlineText = inlineHelp ? inlineHelp.querySelector('.quiz-inline-help-text') : null;
                if (inlineHelp && inlineText) {
                    inlineText.textContent = appropriateHint;
                    // Keep hidden by default; visibility is toggled on button click
                    inlineHelp.classList.remove('visible');
                }
            } catch (_) {}

            // Add inline hint behavior
            const closeHelp = document.getElementById('close-help-modal');
            const quizHintLabel = hintBtn.querySelector('.quiz-hint-label');
            if (hintBtn && helpModal && closeHelp && quizHintLabel) {
                const newHintBtn = hintBtn.cloneNode(true);
                hintBtn.parentNode.replaceChild(newHintBtn, hintBtn);
                const newCloseHelp = closeHelp.cloneNode(true);
                closeHelp.parentNode.replaceChild(newCloseHelp, closeHelp);

                // **Record hint usage when the button is clicked**
                newHintBtn.addEventListener('click', () => {
                    recordHintUsage(sq.id); // Call the new function
                    // Always show inline help below the hint button; do not open modal
                    let inlineHelp = document.getElementById('quiz-inline-help');
                    if (!inlineHelp) {
                        inlineHelp = document.createElement('div');
                        inlineHelp.id = 'quiz-inline-help';
                        inlineHelp.className = 'quiz-inline-help';
                        inlineHelp.innerHTML = '<div class="quiz-inline-help-title">Hint</div><div class="quiz-inline-help-text"></div>';
                        const left = document.querySelector('.quiz-left');
                        if (left) left.appendChild(inlineHelp);
                    }
                    const inlineText = inlineHelp.querySelector('.quiz-inline-help-text');
                    if (inlineText) inlineText.textContent = appropriateHint;
                    inlineHelp.classList.add('visible');
                    inlineHelp.style.display = 'block';
                });
                // Close button and overlay no longer used for hint modal
                newHintBtn.addEventListener('mouseenter', () => {
                    newHintBtn.querySelector('.quiz-hint-label').style.display = 'inline-block';
                });
                newHintBtn.addEventListener('mouseleave', () => {
                    newHintBtn.querySelector('.quiz-hint-label').style.display = 'none';
                });
            }
        }

        // Choices as buttons
        let choices = Array.isArray(sq.choices) ? sq.choices : (typeof sq.choices === 'string' ? JSON.parse(sq.choices) : []);
        const buttonsHtml = choices.map((choice, i) => {
            const letter = String.fromCharCode(65 + i);
            return `<button type="button" class="quiz-choice-btn" data-choice="${letter}">${letter}) ${choice}</button>`;
        }).join('');
        if (quizChoicesButtons) quizChoicesButtons.innerHTML = buttonsHtml;

        // Add click event to each button
        const btns = quizChoicesButtons.querySelectorAll('.quiz-choice-btn');
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

        // Start the question timer (force reset for a new question)
        startQuestionTimer(true);
    }

    function showLoadingPopupFn(show, message) {
        if (!loadingPopup) return;
        try {
            const p = loadingPopup.querySelector('.popup-content p');
            if (message && p) p.textContent = message;
        } catch (_) {}
        loadingPopup.classList.toggle('hidden', !show);
    }

    function showEndMessage() {
        if (questionTimer) {
            clearInterval(questionTimer);
        }
        window.location.href = '/progress';
    }

    function updateClockDisplay() {
        clockDisplay.textContent = `Time Left: ${timeLeft}s`;
    }

    function startQuestionTimer(forceReset = false) {
        // If a timer is already running and we're not explicitly forcing a reset,
        // leave it alone. This prevents unintended restarts (for example when
        // validation alerts or other UI actions occur).
        if (questionTimer && !forceReset) {
            return;
        }

        // Clear any existing timer when forcing a reset
        if (questionTimer) {
            clearInterval(questionTimer);
            questionTimer = null;
        }

        // Reset countdown only when forcing a new question
        timeLeft = QUESTION_TIME;
        updateClockDisplay();
        questionTimer = setInterval(() => {
            timeLeft--;
            updateClockDisplay();
            if (timeLeft <= 0) {
                clearInterval(questionTimer);
                questionTimer = null;
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
            // Prefer the provided <audio> element. Ensure it's unmuted and set a reasonable volume.
            if (audioElement) {
                try {
                    audioElement.muted = false;
                    audioElement.volume = Math.min(1, Math.max(0, audioElement.volume || 0.9));
                    // reset to start
                    try { audioElement.pause(); } catch (_) {}
                    audioElement.currentTime = 0;
                    console.log(`Attempting to play ${soundType} audio element`);
                    const playPromise = audioElement.play();
                    if (playPromise && typeof playPromise.then === 'function') {
                        playPromise.then(() => {
                            console.log(`${soundType} audio.play() succeeded`);
                        }).catch(err => {
                             // inalis ko yung nag eeror dine
                            playBeepFallback(soundType);
                        });
                    }
                } catch (error) {
                    console.warn(`Error playing ${soundType} sound:`, error && error.message ? error.message : error);
                    playBeepFallback(soundType);
                }
                return;
            }
            // No audio element available, use WebAudio fallback
            playBeepFallback(soundType);
        }

        // Small WebAudio fallback beep for environments where <audio> cannot play
        function playBeepFallback(type) {
            try {
                const AudioCtxCtor = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtxCtor && !audioCtx) return;
                // Prefer existing/resumed audioCtx
                if (!audioCtx && AudioCtxCtor) {
                    try { audioCtx = new AudioCtxCtor(); } catch (e) { audioCtx = null; }
                }
                if (!audioCtx) return;
                const ctx = audioCtx;
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = (type === 'correct') ? 'sine' : 'square';
                o.frequency.value = (type === 'correct') ? 880 : 220; // Hz
                // Smooth envelope for a short beep
                const now = ctx.currentTime;
                g.gain.setValueAtTime(0.0001, now);
                g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
                o.connect(g);
                g.connect(ctx.destination);
                o.start(now);
                // stop after 140ms
                const stopAt = now + 0.14;
                try { o.stop(stopAt); } catch (_) {}
                // do not close the shared context
            } catch (e) {
                console.warn('WebAudio fallback failed:', e && e.message ? e.message : e);
            }
        }

        if (isCorrect) {
            playSound(correctSound, 'correct');
        } else {
            playSound(wrongSound, 'wrong');
        }

        // Award points for a correct sub-question based on the main question difficulty
        try {
            const diffKey = (mq && mq.difficulty) ? String(mq.difficulty).toLowerCase() : 'easy';
            const pointsMap = { easy: 5, medium: 10, hard: 15 };
            if (isCorrect) {
                const pts = pointsMap[diffKey] || 0;
                difficultyProgressData.points = (difficultyProgressData.points || 0) + pts;
                console.log(`✅ Awarded ${pts} points for correct sub-question (difficulty=${diffKey}). Total points: ${difficultyProgressData.points}`);
            }
        } catch (err) {
            console.error('Error awarding points:', err);
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
            const feedbackModalEl = document.getElementById('quiz-feedback-modal');
            if (feedbackModalEl) {
                // Ensure visible and on top
                feedbackModalEl.classList.remove('hidden');
                feedbackModalEl.style.display = 'flex';
                feedbackModalEl.style.zIndex = '10000';
                // Prevent background interaction while open
                feedbackModalEl.style.pointerEvents = 'auto';
                // Lock background scroll
                document.body.style.overflow = 'hidden';

                // Enable Next button and focus it
                if (feedbackNextBtn) {
                    feedbackNextBtn.disabled = false;
                    feedbackNextBtn.style.pointerEvents = 'auto';
                    try { feedbackNextBtn.focus(); } catch (_) {}
                }

                // Attach overlay click handler to allow clicking outside the modal to act like Next
                if (!feedbackModalOverlayHandler) {
                    feedbackModalOverlayHandler = function(e) {
                        if (e.target === feedbackModalEl) {
                            if (feedbackNextBtn) {
                                try { feedbackNextBtn.click(); } catch (_) {}
                            }
                        }
                    };
                    feedbackModalEl.addEventListener('click', feedbackModalOverlayHandler);
                }
            } else {
                console.warn('Feedback modal element not found');
            }
    }


    // --- Insert answer into user_answers on submit ---
    let submitLocked = false;
    submitBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        // Ensure audio is primed by a user gesture so first sounds can play
        try { await primeAudioIfNeeded(); } catch (_) {}
        if (submitLocked) return;
        submitLocked = true;
        submitBtn.disabled = true;

        // Do NOT clear the question timer yet. If the user clicked Submit without
        // selecting an answer, we should leave the countdown running. The timer
        // will only be cleared when a valid answer is submitted below.

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
            // Validation failure: show non-blocking modal and keep the timer running.
            showSelectAnswerModal('Please select an answer!');
            submitLocked = false;
            submitBtn.disabled = false;
            // Nudge keyboard users to the first choice for easier selection
            const firstChoice = quizRight.querySelector('.quiz-choice-btn');
            if (firstChoice) {
                try { firstChoice.focus(); } catch (_) {}
            }
            return;
        }

        // Stop timer only when a valid answer is actually submitted
        if (questionTimer) {
            clearInterval(questionTimer);
            questionTimer = null;
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
        // Do NOT auto-advance; require the user to click the Next button on the feedback modal
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


    // --- Start Quiz Button Listener ---
    async function beginQuizFlow() {
        // Guard against re-entry
        if (beginQuizFlow.__running) return; beginQuizFlow.__running = true;
        const preModal = document.getElementById('prestart-difficulty-modal');
        const preTitle = document.getElementById('prestart-modal-title');
        const preText = document.getElementById('prestart-modal-text');
        const preOk = document.getElementById('prestart-modal-ok-btn');

        // Safely toggle sections if present
        if (quizIntro) quizIntro.classList.add('hidden');
        if (quizMainArea) quizMainArea.classList.remove('hidden');
        await syncLocalStorageData();
        await fetchUserScaffoldLevel();

        // Determine recommended difficulty: priority is localStorage from progress page, else compute from DB
        let recommended = localStorage.getItem('startingDifficulty');
        if (!(recommended === 'Easy' || recommended === 'Medium' || recommended === 'Hard')) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const studentId = session?.user?.id || null;
                if (studentId) {
                    const [{ data: latestProgress }, userProfile] = await Promise.all([
                        supabase
                            .from('user_progress')
                            .select('accuracy, difficulty')
                            .eq('student_id', studentId)
                            .order('last_updated', { ascending: false })
                            .limit(1)
                            .maybeSingle(),
                        supabase
                            .from('user_profiles')
                            .select('scaffold_level')
                            .eq('id', studentId)
                            .single()
                    ]);
                    const lastDiff = latestProgress?.difficulty || 'easy';
                    const accDec = typeof latestProgress?.accuracy === 'number' ? latestProgress.accuracy : 0;
                    const scaffold = typeof userProfile?.scaffold_level === 'number' ? userProfile.scaffold_level : 0;
                    const rec = (() => {
                        const accPct = accDec * 100;
                        const canAdjust = (scaffold === 0 || scaffold === 1) && accPct >= 75;
                        const cur = (lastDiff || 'easy').toLowerCase();
                        if (cur === 'easy') return (scaffold === 2 || !canAdjust) ? 'Easy' : 'Medium';
                        if (cur === 'medium') return (scaffold === 2 || !canAdjust) ? 'Easy' : 'Hard';
                        return (scaffold === 2 || !canAdjust) ? 'Medium' : 'Hard';
                    })();
                    recommended = rec;
                } else {
                    recommended = 'Easy';
                }
            } catch (_) {
                recommended = 'Easy';
            }
        }

        if (preTitle && preText) {
            preTitle.textContent = 'Get Ready';
            preText.textContent = `We will start at ${recommended} difficulty based on your recent performance.`;
        }
        if (preModal && preOk) {
            preModal.style.display = 'flex';
            const onStart = async () => {
                preOk.removeEventListener('click', onStart);
                preModal.style.display = 'none';
                currentDifficulty = (recommended === 'Easy' || recommended === 'Medium' || recommended === 'Hard') ? recommended : 'Easy';
                localStorage.removeItem('startingDifficulty');
                score = 0;
                usedQuestionIds = [];
                resetDifficultyProgress();
                fetchAndRenderQuestions();
            };
            preOk.addEventListener('click', onStart);
        } else {
            currentDifficulty = (recommended === 'Easy' || recommended === 'Medium' || recommended === 'Hard') ? recommended : 'Easy';
            localStorage.removeItem('startingDifficulty');
            score = 0;
            usedQuestionIds = [];
            resetDifficultyProgress();
            fetchAndRenderQuestions();
        }
    }

    if (startQuizBtn && quizMainArea) {
        startQuizBtn.addEventListener('click', beginQuizFlow);
    }

    // Auto-start unconditionally on load; flow determines difficulty from recommendation or DB
    beginQuizFlow();


    const feedbackModal = document.getElementById('quiz-feedback-modal');
    const feedbackNextBtn = document.getElementById('quiz-feedback-next-btn');
    const helpModal = document.getElementById('quiz-help-modal');
    // Overlay click handler reference so we can remove it when modal is closed
    let feedbackModalOverlayHandler = null;

    // Records hint usage locally (DB table for logging not available)
    async function recordHintUsage(subQuestionId) {
        try {
            // Track hint usage in progress data
            difficultyProgressData.hintUsageCount++;
            
            // No server table exists for logging hint usage on your project.
            // Persist a lightweight local record instead to avoid network errors.
            try {
                const events = JSON.parse(localStorage.getItem('hintUsageEvents') || '[]');
                events.push({ subQuestionId, at: new Date().toISOString() });
                localStorage.setItem('hintUsageEvents', JSON.stringify(events));
            } catch (e) { /* ignore storage errors */ }
        } catch (err) {
            console.error('An error occurred while trying to record hint usage:', err.message);
        }
    }

    // --- RESTRUCTURED FEEDBACK NEXT BUTTON LISTENER ---
    if (feedbackNextBtn) {
        feedbackNextBtn.addEventListener('click', async function() {
            // Hide modals and cleanup overlay handler if present
            if (feedbackModal) {
                feedbackModal.style.display = 'none';
                // Remove overlay click handler if attached
                if (feedbackModalOverlayHandler) {
                    try { feedbackModal.removeEventListener('click', feedbackModalOverlayHandler); } catch (_) {}
                    feedbackModalOverlayHandler = null;
                }
            }
            if (helpModal) helpModal.style.display = 'none';
            // Restore body scrolling
            document.body.style.overflow = '';

            const mq = mainQuestions[currentMainIdx];

            // This is the core logic that was preventing the quiz from advancing.
            // When the last sub-question of a round is answered, check for level-up before advancing to the next main question.
            if (currentSubIdx + 1 < mq.sub_questions.length) {
                // If there are more sub-questions, just advance to the next one
                currentSubIdx++;
                renderCurrentQuestion();
            } else {
                // If this is the last sub-question, track main question completion
                difficultyProgressData.totalMainQuestions++;
                
                // Track if this main question was completed correctly
                const isPerfect = subQuestionResults.every(result => result === true);
                if (isPerfect && roundCorrect) {
                    difficultyProgressData.correctMainQuestions++;
                } else {
                    difficultyProgressData.mistakeCount++;
                }
                
                // Add to main question attempts for ability calculation
                difficultyProgressData.mainQuestionAttempts.push({
                    questionId: mq.id,
                    isPerfect: isPerfect && roundCorrect,
                    subResults: [...subQuestionResults]
                });
                
                // If this is the last sub-question, check for a level-up
                if (roundCorrect) {
                    score++;
                }
                updateScoreDisplay();

                const easyGoal = 5;
                const mediumGoal = 4;
                const hardGoal = 3;

                let showDifficultyModal = false;
                let passedThisDifficulty = false;
                if (currentDifficulty === 'Easy' && score >= easyGoal) {
                    // Insert progress data for Easy difficulty
                    await insertUserProgress('Easy');
                    passedThisDifficulty = true;
                    showDifficultyModal = true;
                } else if (currentDifficulty === 'Medium' && score >= mediumGoal) {
                    // Insert progress data for Medium difficulty
                    await insertUserProgress('Medium');
                    passedThisDifficulty = true;
                    showDifficultyModal = true;
                } else if (currentDifficulty === 'Hard' && score >= hardGoal) {
                    // Insert progress data for Hard difficulty
                    await insertUserProgress('Hard');
                    passedThisDifficulty = true;
                    showDifficultyModal = true;
                }

                if (showDifficultyModal) {
                    // Show a loading popup while we wait for the model update and scaffold fetch
                    showLoadingPopupFn(true, 'Preparing results...');
                    // yield a frame so the browser can render the popup before we start awaiting
                    await new Promise((res) => requestAnimationFrame(res));
                    // Wait for model update then fetch scaffold level to decide next step
                    await new Promise(resolve => setTimeout(resolve, 2500));
                    await fetchUserScaffoldLevel();
                    // Hide loading popup before showing the difficulty modal
                    showLoadingPopupFn(false);

                    // Calculate current accuracy for difficulty adjustment decision
                    const currentAccuracy = difficultyProgressData.totalMainQuestions > 0 
                        ? (difficultyProgressData.correctMainQuestions / difficultyProgressData.totalMainQuestions) * 100
                        : 0;
                    
                    // Check if user meets both scaffold level and accuracy requirements for difficulty adjustment
                    const canAdjustDifficulty = (userScaffoldLevel === 0 || userScaffoldLevel === 1) && currentAccuracy >= 75;
                    
                    console.log(`📊 Difficulty Adjustment Check - Scaffold Level: ${userScaffoldLevel}, Accuracy: ${currentAccuracy.toFixed(1)}%, Can Adjust: ${canAdjustDifficulty}`);

                    // Rule-based difficulty adjustment using scaffold level AND 75% accuracy requirement
                    // scaffold_level: 0=Low, 1=Medium, 2=High
                    if (currentDifficulty === 'Easy') {
                        if (userScaffoldLevel === 2 || !canAdjustDifficulty) {
                            pendingNextDifficulty = 'Easy';
                            difficultyModalTitle.textContent = `Keep Practicing`;
                            if (userScaffoldLevel === 2) {
                                difficultyModalText.textContent = `We'll keep you on Easy for now to strengthen fundamentals.`;
                            } else {
                                difficultyModalText.textContent = `Keep practicing to reach 75% accuracy before advancing. Current: ${currentAccuracy.toFixed(1)}%`;
                            }
                        } else {
                            pendingNextDifficulty = 'Medium';
                            difficultyModalTitle.textContent = `Level Up!`;
                            difficultyModalText.textContent = `Great job! You've reached 75% accuracy and are ready for Medium challenges.`;
                        }
                    } else if (currentDifficulty === 'Medium') {
                        if (userScaffoldLevel === 2 || !canAdjustDifficulty) {
                            pendingNextDifficulty = 'Easy';
                            difficultyModalTitle.textContent = `Adjusting Difficulty`;
                            if (userScaffoldLevel === 2) {
                                difficultyModalText.textContent = `We'll step back to Easy to reinforce concepts.`;
                            } else {
                                difficultyModalText.textContent = `Let's step back to Easy to improve accuracy. Current: ${currentAccuracy.toFixed(1)}%`;
                            }
                        } else {
                            pendingNextDifficulty = 'Hard';
                            difficultyModalTitle.textContent = `Level Up!`;
                            difficultyModalText.textContent = `You're doing well! You've reached 75% accuracy and are ready for Hard challenges.`;
                        }
                    } else if (currentDifficulty === 'Hard') {
                        if (userScaffoldLevel === 2 || !canAdjustDifficulty) {
                            pendingNextDifficulty = 'Medium';
                            difficultyModalTitle.textContent = `Adjusting Difficulty`;
                            if (userScaffoldLevel === 2) {
                                difficultyModalText.textContent = `We'll step back to Medium to consolidate skills.`;
                            } else {
                                difficultyModalText.textContent = `Let's step back to Medium to improve accuracy. Current: ${currentAccuracy.toFixed(1)}%`;
                            }
                        } else {
                            pendingNextDifficulty = 'Hard';
                            difficultyModalTitle.textContent = `Keep Going!`;
                            difficultyModalText.textContent = `You're staying on Hard — continue practicing to master these challenges.`;
                        }
                    }

                    if (difficultyModal) {
                        // Add a 'Back to Progress' button alongside the OK button if not already present
                        try {
                            // Avoid creating duplicates
                            let backBtn = difficultyModal.querySelector('.difficulty-back-btn');
                            if (!backBtn) {
                                backBtn = document.createElement('button');
                                backBtn.className = 'difficulty-back-btn';
                                backBtn.textContent = 'Back to Progress';
                                // Stronger, visible styling to match modal buttons
                                backBtn.style.cssText = 'margin-left:0.6rem;background:#d9534f;color:#fff;border-radius:0.5rem;padding:0.6rem 0.9rem;border:2px solid #b43a3a;cursor:pointer;font-weight:700;';

                                // Prefer a dedicated '.modal-actions' area; otherwise append to '.modal-content'
                                const modalActions = difficultyModal.querySelector('.modal-actions');
                                if (modalActions) {
                                    modalActions.appendChild(backBtn);
                                } else {
                                    const modalContent = difficultyModal.querySelector('.modal-content') || difficultyModal;
                                    // Place the button near the OK button if possible
                                    const okBtn = modalContent.querySelector('#difficulty-modal-ok-btn');
                                    if (okBtn && okBtn.parentNode) {
                                        okBtn.parentNode.insertBefore(backBtn, okBtn.nextSibling);
                                    } else {
                                        modalContent.appendChild(backBtn);
                                    }
                                }

                                backBtn.addEventListener('click', () => { window.location.href = '/progress'; });
                            }
                            // Ensure the button is displayed (in case CSS hidden it)
                            if (backBtn) backBtn.style.display = 'inline-block';
                        } catch (e) {
                            console.error('Error adding Back to Progress button:', e);
                        }
                        difficultyModal.style.display = 'flex';
                    }
                } else {
                    // If user has attempted 10 main questions and hasn't reached the goal, show attempts-limit modal
                    const currentGoal = currentDifficulty === 'Easy' ? easyGoal : (currentDifficulty === 'Medium' ? mediumGoal : hardGoal);
                    if (difficultyProgressData.totalMainQuestions >= 10 && score < currentGoal) {
                        // Insert progress on failure to trigger ML prediction
                        await insertUserProgress(currentDifficulty);
                        if (attemptsLimitModal) attemptsLimitModal.style.display = 'flex';
                        return; // Stop progressing further
                    }
                    // If no level-up, proceed to the next main question
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

    // --- DIFFICULTY MODAL OK BUTTON LISTENER ---
    // When user clicks OK on the difficulty modal we should apply the pending difficulty
    // (if any), reset the progress for the new difficulty and fetch a new set of questions.
    if (difficultyModal && difficultyModalOkBtn) {
        const applyPendingDifficultyAndContinue = async () => {
            try {
                if (difficultyModal) difficultyModal.style.display = 'none';

                // Apply pending difficulty if provided, otherwise keep current
                if (pendingNextDifficulty && pendingNextDifficulty !== currentDifficulty) {
                    currentDifficulty = pendingNextDifficulty;
                }

                // Reset state for the new difficulty
                pendingNextDifficulty = '';
                score = 0;
                usedQuestionIds = [];
                resetDifficultyProgress();
                subQuestionResults = [];
                roundCorrect = true;
                currentSubIdx = 0;
                currentMainIdx = 0;

                // Fetch and render questions for the (possibly) new difficulty
                await fetchAndRenderQuestions();
            } catch (err) {
                console.error('Error applying difficulty change:', err);
            }
        };

        difficultyModalOkBtn.addEventListener('click', function() {
            applyPendingDifficultyAndContinue();
        });

        // Allow clicking outside the modal to also proceed
        difficultyModal.addEventListener('click', function(e) {
            if (e.target === difficultyModal) {
                applyPendingDifficultyAndContinue();
            }
        });
    } else if (difficultyModal) {
        // Ensure it's hidden by default if elements are missing
        difficultyModal.style.display = 'none';
    }

    // --- ATTEMPTS-LIMIT MODAL OK BUTTON LISTENER ---
    if (attemptsLimitModal && attemptsLimitModalOkBtn) {
        attemptsLimitModalOkBtn.addEventListener('click', function() {
            attemptsLimitModal.style.display = 'none';
            window.location.href = '/progress';
        });
        // Allow clicking outside to close and go to progress as well
        attemptsLimitModal.addEventListener('click', function(e) {
            if (e.target === attemptsLimitModal) {
                attemptsLimitModal.style.display = 'none';
                window.location.href = '/progress';
            }
        });
    }
    
    // Test function to verify hint selection logic (for debugging)
    function testHintSelection() {
        console.log('🧪 Testing hint selection logic...');
        
        const testHints = {
            first_hint: 'This is the basic hint',
            second_hint: 'This is the moderate hint',
            third_hint: 'This is the advanced hint'
        };
        
        // Test with different scaffold levels
        const originalLevel = userScaffoldLevel;
        
        console.log('Testing scaffold level 0 (Low - Default):');
        userScaffoldLevel = 0;
        console.log('Result:', getHintByScaffoldLevel(testHints));
        
        console.log('Testing scaffold level 1 (Medium):');
        userScaffoldLevel = 1;
        console.log('Result:', getHintByScaffoldLevel(testHints));
        
        console.log('Testing scaffold level 2 (High):');
        userScaffoldLevel = 2;
        console.log('Result:', getHintByScaffoldLevel(testHints));
        
        // Restore original level
        userScaffoldLevel = originalLevel;
        console.log('✅ Hint selection test completed');
    }
    
    // Uncomment the line below to run the test
    // testHintSelection();
});