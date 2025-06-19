import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://uwbkcarkmgawqhzcyrkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    // DOM elements
    const nameElement = document.getElementById('studentFullName');
    const emailElement = document.getElementById('studentEmail');
    const classElement = document.getElementById('studentClassName'); // NEW: Get the class name element
    const logoutBtn = document.querySelector('.logout-btn');
    const addClassBtn = document.querySelector('.add-class-btn');
    const modal = document.getElementById('classModal');
    const closeBtn = document.querySelector('.modal .close');
    const joinBtn = document.getElementById('joinClassBtn');
    const classCodeInput = document.getElementById('classCodeInput');
    const modalMessage = document.getElementById('modalMessage');
    const radarStatsChartCanvas = document.getElementById('radarStatsChart');

    let currentUser = null; // Store user for repeated access

    // --- Authentication and Profile Loading ---
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            alert('❌ Failed to fetch user. Please log in again.');
            window.location.href = '../login folder/second-design/login.html';
            return;
        }
        currentUser = user;

        // Get profile from user_profiles, including class_id
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('full_name, email, class_id')
            .eq('id', currentUser.id)
            .single();

        if (profileError || !profile) {
            alert('⚠️ Could not load student profile. Please ensure your profile exists.');
            console.error("Profile loading error:", profileError);
            return;
        }

        // Update the dashboard content with profile data
        if (nameElement) nameElement.textContent = profile.full_name;
        if (emailElement) emailElement.textContent = profile.email;

        // NEW LOGIC: Display current class name
        if (classElement) { // Ensure the element exists
            if (profile.class_id) {
                const { data: currentClass, error: classError } = await supabase
                    .from('classes')
                    .select('name') // Only need the name
                    .eq('id', profile.class_id)
                    .single();

                if (!classError && currentClass) {
                    classElement.textContent = `Class: ${currentClass.name}`; // Display class name
                } else {
                    console.error("Error fetching joined class details:", classError);
                    classElement.textContent = `Class: Error loading details`; // Indicate an error
                }
            } else {
                classElement.textContent = 'Class: Not assigned'; // Default text if no class_id
            }
        }


    } catch (err) {
        console.error("Initialization error:", err);
        alert("An unexpected error occurred during page load. Please try again.");
        window.location.href = '../login folder/second-design/login.html';
        return;
    }


    // --- Logout functionality ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = '../login folder/second-design/login.html';
            } else {
                alert('Logout failed. Try again.');
                console.error("Logout error:", error);
            }
        });
    }


    // --- Add Class (Join Class) Modal Functionality ---
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

    // Join Class Logic
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

            // 1. Look up the class by class_code
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

            // 2. Update the student's user_profiles table with the found class_id
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

            // Success message and UI update
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