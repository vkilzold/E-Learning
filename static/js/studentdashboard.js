// --- Supabase Client Initialization ---
import { supabase } from '../utils/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const nameElement = document.getElementById('studentFullName');
    const emailElement = document.getElementById('studentEmail');
    const classElement = document.getElementById('studentClassName');
    const addClassBtn = document.querySelector('.add-class-btn');
    const modal = document.getElementById('classModal');
    const closeBtn = document.querySelector('.modal .close');
    const joinBtn = document.getElementById('joinClassBtn');
    const classCodeInput = document.getElementById('classCodeInput');
    const modalMessage = document.getElementById('modalMessage');
    const radarStatsChartCanvas = document.getElementById('radarStatsChart');
    const logoutBtn = document.querySelector('.logout-btn');
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');

    let currentUser = null; // Store user for repeated access
    
// ------------------------------------ Authentication and Profile Loading ------------------------------------
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            alert('❌ Failed to fetch user. Please log in again.');
            window.location.href = '/login';
            return;
        }
        currentUser = user;

        // Get profile from user_profiles, including class_id
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('id', currentUser.id)
            .single();

        if (profileError || !profile) {
            alert('⚠️ Could not load student profile. Please ensure your profile exists.');
            console.error("Profile loading error:", profileError);
            return;
        }

        // --- Academic Summary Stats ---
        async function updateAcademicSummary(userId) {
            const totalItemsElem = document.getElementById('totalItemsAnswered');
            const avgScoreElem = document.getElementById('averageScore');
            const lastActiveElem = document.getElementById('lastActive');

            // Fetch all answers for this user (now from user_answers)
            const { data: answers, error } = await supabase
                .from('user_answers')
                .select('is_correct, answered_at')
                .eq('student_id', userId);

            if (error) {
                if (totalItemsElem) totalItemsElem.textContent = '-';
                if (avgScoreElem) avgScoreElem.textContent = '-';
                if (lastActiveElem) lastActiveElem.textContent = '-';
                console.error('Error fetching academic summary:', error);
                return;
            }

            // Total items answered
            const totalAnswered = answers.length;
            if (totalItemsElem) totalItemsElem.textContent = totalAnswered;

            // Average score (percentage of correct answers)
            const correctCount = answers.filter(a => a.is_correct === true).length;
            const avgScore = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
            if (avgScoreElem) avgScoreElem.textContent = totalAnswered > 0 ? `${avgScore}%` : '-';

            // Last active (latest answered_at)
            let lastActive = '-';
            if (answers.length > 0) {
                // answered_at may be null or undefined, so filter those out
                const validDates = answers
                    .map(a => a.answered_at)
                    .filter(date => !!date)
                    .sort();
                if (validDates.length > 0) {
                    // Get the latest date
                    const latest = validDates[validDates.length - 1];
                    // Format as readable date
                    const dateObj = new Date(latest);
                    lastActive = dateObj.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                }
            }
            if (lastActiveElem) lastActiveElem.textContent = lastActive;
        }
        // Call the function with the current user id
        updateAcademicSummary(currentUser.id);

        // Helper: simple HTML escape to avoid XSS when inserting usernames
        function escapeHtml(str) {
            if (str == null) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        // Render leaderboard array into the dashboard DOM
        function renderLeaderboard(leaderboard) {
            const container = document.querySelector('.leaderboard-section .scroll-box');
            if (!container) return;
            container.innerHTML = '';

            if (!leaderboard || leaderboard.length === 0) {
                container.innerHTML = '<div class="item">No leaderboard data available.</div>';
                return;
            }

            leaderboard.forEach((u, idx) => {
                const rank = idx + 1;
                const name = escapeHtml(u.username || u.full_name || u.email || 'Unknown');
                // Ensure points and pct are integers (no decimals)
                const rawPoints = (typeof u.total_points !== 'undefined') ? u.total_points : (u.correct_count || 0);
                const points = Number.isFinite(Number(rawPoints)) ? Math.round(Number(rawPoints)) : 0;
                const rawPct = (typeof u.average_accuracy !== 'undefined') ? u.average_accuracy : (u.avg_pct || null);
                const pct = (rawPct !== null && typeof rawPct !== 'undefined') ? Math.round(Number(rawPct)) : null;

                const item = document.createElement('div');
                item.className = 'item';
                // Add special classes for top 3 ranks so CSS will style them (gold/silver/bronze)
                if (rank === 1) item.classList.add('leaderboard-rank-1');
                else if (rank === 2) item.classList.add('leaderboard-rank-2');
                else if (rank === 3) item.classList.add('leaderboard-rank-3');

                const nameSpan = document.createElement('span');
                nameSpan.className = 'leaderboard-name';
                nameSpan.innerHTML = `${rank}. ${name}`;

                const pointsSpan = document.createElement('span');
                pointsSpan.className = 'leaderboard-points';
                // Only show points in the leaderboard (no percentage)
                pointsSpan.textContent = `${points} pts`;

                item.appendChild(nameSpan);
                item.appendChild(pointsSpan);
                container.appendChild(item);
            });
        }

        // Load leaderboard directly from the leaderboard table (server-side aggregated)
        async function loadLeaderboard() {
            try {
                // Fetch top 10 by total_points descending
                const { data, error } = await supabase
                    .from('leaderboard')
                    .select('student_id, username, total_points, average_accuracy')
                    .order('total_points', { ascending: false })
                    .limit(10);

                if (error) {
                    console.error('Error fetching leaderboard table:', error);
                    renderLeaderboard([]);
                    return;
                }

                // Normalize rows if necessary and render
                const leaderboard = (data || []).map(r => ({
                    id: r.student_id,
                    username: r.username,
                    total_points: r.total_points,
                    average_accuracy: r.average_accuracy
                }));

                renderLeaderboard(leaderboard);
            } catch (err) {
                console.error('Failed to load leaderboard:', err);
                renderLeaderboard([]);
            }
        }

        // Load and render leaderboard after loading profile/stats
        loadLeaderboard(currentUser.id);
        // Fetch and render the latest user_progress row for Recent Activity
        // This will show accuracy, difficulty, correct/mistake counts, total questions, points, and date.
        async function fetchLatestProgress(userId) {
            try {
                const { data, error } = await supabase
                    .from('user_progress')
                    .select('accuracy, difficulty, correct_answers, mistake, points, last_updated')
                    .eq('student_id', userId)
                    .order('last_updated', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching latest user_progress:', error);
                    return;
                }
                if (!data) return;
                renderLatestProgress(data);
            } catch (err) {
                console.error('Failed to fetch latest progress:', err);
            }
        }

        function renderLatestProgress(row) {
            const list = document.querySelector('.activity-list');
            if (!list) return;

            const totalQuestions = (Number(row.correct_answers) || 0) + (Number(row.mistake) || 0);
            const correct = (row.correct_answers != null) ? Number(row.correct_answers) : '-';
            const mistakes = (row.mistake != null) ? Number(row.mistake) : '-';
            const points = (row.points != null) ? Number(row.points) : '-';
            const accuracy = (row.accuracy != null) ? `${Math.round(Number(row.accuracy) * 100)}%` : '-';
            const difficulty = row.difficulty || '-';
            const dateStr = row.last_updated ? new Date(row.last_updated).toLocaleString() : '-';

            // Clear existing content
            list.innerHTML = '';

            // Create header with timestamp
            const header = document.createElement('div');
            header.className = 'activity-item-header';
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid var(--icon-blue);';
            header.innerHTML = `
                <div style="display:flex;align-items:center;gap:0.6rem;">
                    <i class="fas fa-chart-line" style="color: var(--icon-blue);"></i>
                    <strong style="color: var(--text-main);">Latest Performance</strong>
                </div>
                <small style="color: var(--text-muted);">${escapeHtml(dateStr)}</small>
            `;
            list.appendChild(header);

            // Create column grid container
            const columnsContainer = document.createElement('div');
            columnsContainer.className = 'activity-columns';

            // Helper to create a column with icon, label, and value
            function createColumn(iconClass, label, value) {
                const column = document.createElement('div');
                column.className = 'activity-column';
                column.innerHTML = `
                    <i class="${iconClass}"></i>
                    <div class="activity-label">${escapeHtml(label)}</div>
                    <div class="activity-value">${escapeHtml(String(value))}</div>
                `;
                return column;
            }

            // Add columns: difficulty, accuracy, correct, mistakes
            columnsContainer.appendChild(createColumn('fas fa-sliders-h', 'Difficulty', difficulty));
            columnsContainer.appendChild(createColumn('fas fa-percentage', 'Accuracy', accuracy));
            columnsContainer.appendChild(createColumn('fas fa-check-circle', 'Correct', correct));
            columnsContainer.appendChild(createColumn('fas fa-times-circle', 'Mistakes', mistakes));

            list.appendChild(columnsContainer);
        }

        // Kick off fetching the latest progress for this user
        fetchLatestProgress(currentUser.id);

        // ----------------- Time Spent: sum time_taken_seconds -----------------
        function formatDuration(totalSeconds) {
            const seconds = Math.max(0, Number(totalSeconds) || 0);
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            if (hours > 0) return `${hours}h ${minutes}m`;
            if (minutes > 0) return `${minutes}m ${secs}s`;
            return `${secs}s`;
        }

        async function updateTotalTimeSpent(userId) {
            try {
                const { data, error } = await supabase
                    .from('user_answers')
                    .select('time_taken_seconds')
                    .eq('student_id', userId);
                if (error) {
                    console.error('Error fetching time_taken_seconds:', error);
                    const el = document.getElementById('totalTimeSpent');
                    if (el) el.textContent = '-';
                    return;
                }
                const total = (data || []).reduce((sum, row) => {
                    const v = Number(row?.time_taken_seconds);
                    return sum + (Number.isFinite(v) ? v : 0);
                }, 0);
                const el = document.getElementById('totalTimeSpent');
                if (el) el.textContent = formatDuration(total);
            } catch (e) {
                console.error('Failed to compute total time spent:', e);
                const el = document.getElementById('totalTimeSpent');
                if (el) el.textContent = '-';
            }
        }

        // Update total time spent on load
        updateTotalTimeSpent(currentUser.id);

        // ----------------- Badges: fetch and render -----------------
        const BADGE_DEFS = {
            fast_learner: { label: 'Fast Learner', file: 'fast_learner.svg' },
            quiz_crusher: { label: 'Quiz Crusher', file: 'quiz_crusher.svg' },
            active_learner: { label: 'Active Learner', file: 'active_learner.svg' },
            persistent: { label: 'Persistent', file: 'persistent.svg' },
            hall_of_fame: { label: 'Hall of Fame', file: 'hall_of_fame.svg' },
            consistent: { label: 'Consistent', file: 'consistent.svg' },
            math_master: { label: 'Math Master', file: 'math_master.svg' },
            // Note: filename in repo has a typo; match actual file name
            critical_thinking: { label: 'Critical Thinking', file: 'critical_thinking.svg' },
            top_scorer: { label: 'Top Scorer', file: 'top_scorer.svg' },
            // Repo contains "problem_solving.svg" so point to that file
            problem_solver: { label: 'Problem Solver', file: 'problem_solving.svg' },
            explorer: { label: 'Explorer', file: 'explorer.svg' },
            streak_master: { label: 'Streak Master', file: 'streak_master.svg' }
        };

        // Helper: return canonical badge URL under the webroot
        function badgeUrl(filename) {
            // Use the exact path provided by the server: /badges/<filename>
            return `/badges/${filename}`;
        }

        // Create congrats modal (appended to body) if not exists
        function ensureBadgeModal() {
            if (document.getElementById('badgeCongratsModal')) return;
            const modal = document.createElement('div');
            modal.id = 'badgeCongratsModal';
            modal.className = 'modal hidden';
                                    modal.innerHTML = `
                                            <div class="modal-content" style="min-width:18rem; text-align:center;">
                                                <h3 id="badgeCongratsTitle">Congratulations — you've earned a badge!</h3>
                                                <div id="badgeCongratsBody" style="margin:1rem 0;"></div>
                                                <div style="display:flex;justify-content:center;align-items:center;margin-top:0.5rem;">
                                                    <button id="badgeCongratsOk" class="play-btn" style="min-width:6rem;">OK</button>
                                                </div>
                                            </div>`;
            document.body.appendChild(modal);
            const ok = modal.querySelector('#badgeCongratsOk');
            ok.addEventListener('click', () => { modal.classList.add('hidden'); modal.style.display = 'none'; });
        }

        // Show badge congrats (queues multiple badges)
        async function showBadgeCongratsQueue(badges) {
            if (!Array.isArray(badges) || badges.length === 0) return;
            ensureBadgeModal();
            const modal = document.getElementById('badgeCongratsModal');
            const body = modal.querySelector('#badgeCongratsBody');
            const title = modal.querySelector('#badgeCongratsTitle');
            const okBtn = modal.querySelector('#badgeCongratsOk');

            // Show badges one by one
            for (const b of badges) {
                body.innerHTML = '';
                title.textContent = "Congratulations — you've earned a badge!";
                const img = document.createElement('img');
                // set up fallback chain
                // Use canonical /badges/<filename> path. If it fails to load, fall back silently to a tiny transparent gif.
                img.src = badgeUrl(b.file);
                img.onerror = () => { img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; };
                img.alt = b.label;
                img.style.width = '140px';
                img.style.height = '140px';
                img.style.objectFit = 'contain';
                img.style.display = 'block';
                img.style.margin = '0.5rem auto';
                const lbl = document.createElement('div');
                lbl.textContent = b.label;
                lbl.style.fontWeight = '700';
                lbl.style.marginTop = '0.5rem';
                body.appendChild(img);
                body.appendChild(lbl);

                modal.classList.remove('hidden');
                modal.style.display = 'flex';

                // wait for ok click
                await new Promise(resolve => {
                    const handler = () => { okBtn.removeEventListener('click', handler); resolve(); };
                    okBtn.addEventListener('click', handler);
                });
                // small pause between modals
                await new Promise(r => setTimeout(r, 200));
            }
        }

        // Latest fetched state (kept for re-render after updates)
        let latestBadgeRow = null;
        let latestNotificationsMap = {};

        // Render badges into .badge-grid
        // Only render badges that are achieved in `badges` AND have a true `notified` in badge_notifications.
        // If badgeRow is null/empty, show a "No badges yet" message.
        // showCongrats (boolean) controls whether newly-earned badges should trigger the congrats modal.
        function renderBadges(badgeRow, showCongrats = false, notificationsMap = {}) {
            latestBadgeRow = badgeRow;
            latestNotificationsMap = notificationsMap || {};
            const grid = document.querySelector('.badge-grid');
            if (!grid) return;
            grid.innerHTML = '';

            if (!badgeRow) {
                // No data yet — show a small informative message
                const msg = document.createElement('div');
                msg.className = 'no-badges';
                msg.textContent = 'No badges earned yet.';
                msg.style.padding = '0.5rem';
                msg.style.color = '#666';
                grid.appendChild(msg);
                return;
            }

            const seenBadges = JSON.parse(localStorage.getItem('seenBadges') || '[]');
            const newlyEarned = [];
            let anyRendered = false;

            for (const key of Object.keys(BADGE_DEFS)) {
                const def = BADGE_DEFS[key];
                const badgeTrue = !!badgeRow[key];
                const notifiedTrue = !!notificationsMap[key];

                // Only show if both badge table has true and notifications table has been marked notified
                if (!(badgeTrue && notifiedTrue)) {
                    // If badge exists in badge table but not notified yet, queue for congrats (handled below)
                    if (badgeTrue && !seenBadges.includes(key)) {
                        newlyEarned.push({ key, label: def.label, file: def.file });
                        seenBadges.push(key);
                    }
                    continue;
                }

                anyRendered = true;
                const node = document.createElement('div');
                node.className = 'badge achieved';
                node.title = def.label;

                const img = document.createElement('img');
                img.src = badgeUrl(def.file);
                // If the image is missing, fall back silently to a transparent gif (no retries)
                img.onerror = () => { img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; };
                img.alt = def.label;
                img.className = 'badge-img';

                const lbl = document.createElement('div');
                lbl.textContent = def.label;
                lbl.className = 'badge-label';

                node.appendChild(img);
                node.appendChild(lbl);
                grid.appendChild(node);
            }

            // update seen badges storage
            localStorage.setItem('seenBadges', JSON.stringify(seenBadges));

            if (!anyRendered) {
                const msg = document.createElement('div');
                msg.className = 'no-badges';
                msg.textContent = 'No badges earned yet.';
                msg.style.padding = '0.5rem';
                msg.style.color = '#fbfbfc';
                grid.appendChild(msg);
            }

            // show congrats for newly earned badges only if allowed by caller
            if (showCongrats && newlyEarned.length > 0) {
                showBadgeCongratsQueue(newlyEarned.map(b => ({ label: b.label, file: b.file })) );
            }
        }

        // Fetch badges and badge_notifications for current user and render. Returns an object with both rows/maps.
        async function fetchBadgesAndNotifications(userId) {
            try {
                const [{ data: badgeRow, error: badgeErr }, { data: notifications, error: notifErr }] = await Promise.all([
                    supabase.from('badges').select(Object.keys(BADGE_DEFS).join(', ')).eq('student_id', userId).maybeSingle(),
                    supabase.from('badge_notifications').select('badge_name, notified').eq('student_id', userId)
                ]);

                if (badgeErr) {
                    console.error('Error fetching badges:', badgeErr);
                }
                if (notifErr) {
                    console.error('Error fetching badge_notifications:', notifErr);
                }

                // Convert notifications array to a map: badge_name -> boolean
                const notificationsMap = {};
                if (Array.isArray(notifications)) {
                    for (const n of notifications) {
                        if (n && n.badge_name) notificationsMap[n.badge_name] = !!n.notified;
                    }
                }

                return { badgeRow: badgeRow || null, notificationsMap };
            } catch (err) {
                console.error('Failed to load badges/notifications:', err);
                return { badgeRow: null, notificationsMap: {} };
            }
        }

    // Render locked placeholders immediately so the UI is populated fast
    renderBadges(null);

    // Determine whether to run badge checks (and show congrats modal)
        function cameFromProgressOrLogin() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const fromParam = (urlParams.get('from') || '').toLowerCase();
                if (fromParam === 'progress' || fromParam === 'login') return true;
                const ref = (document.referrer || '').toLowerCase();
                if (ref.includes('/progress') || ref.endsWith('/progress') || ref.includes('/login') || ref.endsWith('/login')) return true;
            } catch (e) {
                // ignore parsing errors and default to not running
            }
            return false;
        }

        // Only fetch badges (and possibly show congrats) when the user arrived from progress or login pages
        // Always fetch badges data so achieved badges are shown on the dashboard.
        // But only trigger the congrats modal if the user came from progress/login.
        const showCongrats = cameFromProgressOrLogin();
        // Fetch both badges and notifications, render and possibly show congrats modal
        const { badgeRow, notificationsMap } = await fetchBadgesAndNotifications(currentUser.id);
        renderBadges(badgeRow, false, notificationsMap); // initial render: show only notified badges

        // Determine mismatches: badge true but notification not true
        const mismatches = [];
        for (const key of Object.keys(BADGE_DEFS)) {
            const badgeVal = badgeRow ? !!badgeRow[key] : false;
            const notifVal = !!notificationsMap[key];
            if (badgeVal && !notifVal) mismatches.push({ key, label: BADGE_DEFS[key].label, file: BADGE_DEFS[key].file });
        }

        // If we should show congrats (arrived from progress/login) and there are mismatches, show modal queue
        if (showCongrats && mismatches.length > 0) {
            // Show each mismatch in the modal; when user clicks OK for each, upsert notification
            ensureBadgeModal();
            const modal = document.getElementById('badgeCongratsModal');
            const body = modal.querySelector('#badgeCongratsBody');
            const okBtn = modal.querySelector('#badgeCongratsOk');

            for (const m of mismatches) {
                body.innerHTML = '';
                const img = document.createElement('img');
                img.src = badgeUrl(m.file);
                img.onerror = () => { img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; };
                img.alt = m.label;
                img.style.width = '140px';
                img.style.height = '140px';
                img.style.objectFit = 'contain';
                img.style.display = 'block';
                img.style.margin = '0.5rem auto';
                const lbl = document.createElement('div');
                lbl.textContent = m.label;
                lbl.style.fontWeight = '700';
                lbl.style.marginTop = '0.5rem';
                body.appendChild(img);
                body.appendChild(lbl);
                modal.classList.remove('hidden');
                modal.style.display = 'flex';

                // Wait for OK click, then upsert notification for this badge
                await new Promise(async resolve => {
                    const handler = async () => {
                        okBtn.removeEventListener('click', handler);
                        modal.classList.add('hidden');
                        modal.style.display = 'none';
                        try {
                            // Update-only: set notified=true for existing notification row.
                            // We deliberately avoid inserting a new row from the client.
                            try {
                                const { data: updateData, error: updateErr, count } = await supabase
                                    .from('badge_notifications')
                                    .update({ notified: true })
                                    .eq('student_id', currentUser.id)
                                    .eq('badge_name', m.key)
                                    .select();

                                if (updateErr) {
                                    console.error('Failed to update badge_notifications:', updateErr);
                                } else if (!Array.isArray(updateData) || updateData.length === 0) {
                                    // No existing row was updated. We intentionally do not insert from the client.
                                    console.warn(`No badge_notifications row found for student_id=${currentUser.id}, badge_name=${m.key}. Skipping client-side insert.`);
                                }
                            } catch (e) {
                                console.error('Error updating badge_notifications:', e);
                            }
                        } catch (e) {
                            console.error('Error updating badge_notifications:', e);
                        }

                        // Refresh notifications map and re-render badges to show this badge
                        const refreshed = await fetchBadgesAndNotifications(currentUser.id);
                        renderBadges(refreshed.badgeRow || null, false, refreshed.notificationsMap || {});
                        resolve();
                    };
                    okBtn.addEventListener('click', handler);
                });

                // small pause before next modal
                await new Promise(r => setTimeout(r, 150));
            }
        }

// ------------------------------------ Update Dashboard Content ------------------------------------
        if (nameElement) nameElement.textContent = profile.full_name;
        if (emailElement) emailElement.textContent = profile.email;


// ------------------------------------ Display Current Class Name ------------------------------------
        if (classElement) {
            classElement.textContent = 'Class: Not assigned'; // Or any default message
        }


    } catch (err) {
        console.error("Initialization error:", err);
        alert("An unexpected error occurred during page load. Please try again.");
        window.location.href = '/login';
        return;
    }

// ------------------------------------ Logout Functionality ------------------------------------
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logoutModal.style.display = 'flex';
        });
    }
    
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });
    }
    
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = '/login';
            } else {
                alert('Logout failed. Try again.');
                console.error("Logout error:", error);
            }
        });
    }


// ------------------------------------ add class button to open modal ------------------------------------
    if (addClassBtn) {
        addClassBtn.addEventListener('click', () => {
            if (modal) {
                modal.classList.remove('hidden');
                classCodeInput.value = '';
                modalMessage.textContent = '';
                modalMessage.style.color = '';
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }

// ------------------------------------ joining a class ------------------------------------
    if (joinBtn) {
        joinBtn.addEventListener('click', async () => {
            const inputCode = classCodeInput.value.trim();

            if (!inputCode) {
                if (modalMessage) {
                    modalMessage.textContent = '⚠️ Please enter a class code.';
                    modalMessage.style.color = 'orange';
                }
                return;
            }

            // Look up the class by class_code
            const { data: foundClass, error: lookupError } = await supabase
                .from('classes')
                .select('id, name') // Only select name, no need for class_code for display here
                .eq('class_code', inputCode)
                .single();

            if (lookupError || !foundClass) {
                if (modalMessage) {
                    modalMessage.textContent = '❌ Class code not found.';
                    modalMessage.style.color = 'red';
                }
                console.error("Class lookup error:", lookupError);
                return;
            }

            // Update the student's user_profiles table with the found class_id
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ class_id: foundClass.id })
                .eq('id', currentUser.id);

            if (updateError) {
                if (modalMessage) {
                    modalMessage.textContent = '❌ Failed to join class. Please try again.';
                    modalMessage.style.color = 'red';
                }
                console.error("Update profile error:", updateError);
                return;
            }

// ------------------------------------ Success Message and UI Update ------------------------------------
            if (modalMessage) {
                modalMessage.textContent = `✅ Successfully joined "${foundClass.name}"!`;
                modalMessage.style.color = 'green';
            }

            // NEW: Update the class name display on the dashboard immediately
            if (classElement) {
                classElement.textContent = `Class: ${foundClass.name}`;
            }

            // Close modal and reload page after a short delay
            setTimeout(() => {
                if (modal) modal.classList.add('hidden');
            }, 1500);
        });
    }
});