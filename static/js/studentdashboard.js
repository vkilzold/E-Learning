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