import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://uwbkcarkmgawqhzcyrkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I';
const supabase = createClient(supabaseUrl, supabaseKey);

// Ensure DOM elements are available before accessing them
document.addEventListener('DOMContentLoaded', () => {

    const signupForm = document.getElementById('signupForm');
    const message = document.getElementById('message');

    // Add a check to ensure signupForm exists
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const roleInput = document.querySelector('input[name="role"]:checked'); // Get the checked radio button
            const role = roleInput ? roleInput.value : ''; // Get its value safely

            // Basic validation
            if (!fullName || !email || !password || !role) {
                if (message) {
                    message.textContent = 'Please fill in all required fields (Full Name, Email, Password, and select a Role).';
                    message.style.color = 'red';
                }
                return;
            }

            // Display "Signing up..." message
            if (message) {
                message.textContent = 'Signing up...';
                message.style.color = 'blue';
            }


            // Sign up using Supabase Auth
            console.log("Signing up with:", email, "password:", password ? "******" : "empty", "full_name:", fullName, "role:", role); // Don't log actual password
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName, role: role }
                }
            });
            console.log("Supabase response:", data, error);


            if (error) {
                if (message) {
                    message.textContent = `❌ Signup failed: ${error.message}`;
                    message.style.color = 'red';
                }
                return;
            }

            // --- START OF NEW/MODIFIED LOGIC ---
            if (message) {
                message.style.color = 'green';
                message.textContent = `✅ Signup successful! Please check your email to verify. Redirecting to login...`;
            }

            // Redirect to login.html after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            // --- END OF NEW/MODIFIED LOGIC ---

        });
    } else {
        console.error("Error: signupForm element not found in the DOM.");
    }
});