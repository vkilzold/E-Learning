// login.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://uwbkcarkmgawqhzcyrkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I'; 
const supabase = createClient(supabaseUrl, supabaseKey);


document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const message = document.getElementById('message');
    const navigateToSignupBtn = document.getElementById('navigateToSignupBtn');
    const loginButton = document.querySelector('.login-btn'); 


    // Event listener for the Login button
    if (loginButton) {
        loginButton.addEventListener('click', async (e) => {
            e.preventDefault(); 

            const emailInput = document.getElementById('email'); 
            const passwordInput = document.getElementById('password'); 

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';


            if (!email || !password) {
                if (message) {
                    message.textContent = 'Please enter both email and password.';
                    message.style.color = 'red';
                }
                return;
            }

            // Display "Logging in..." message immediately
            if (message) {
                message.textContent = 'Logging in...';
                message.style.color = 'blue';
            }


            // Log in with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (message) {
                    message.textContent = `❌ Login failed: ${error.message}`;
                    message.style.color = 'red';
                }
                console.error("Login Error:", error);
                return;
            }

            // Check email confirmation
            if (!data.user?.email_confirmed_at) { 
                if (message) {
                    message.textContent = '⚠️ Please verify your email before logging in.';
                    message.style.color = 'orange';
                }
                return;
            }

            // check user profile in public.user_profiles
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                if (message) {
                    message.textContent = '⚠️ Login failed: user profile not found or access denied (RLS issue?).';
                    message.style.color = 'orange';
                }
                console.error("Profile Fetch Error:", profileError);
                return;
            }

            // Login successful message and redirect
            if (message) {
                message.style.color = 'green';
                message.textContent = '✅ Login successful! Redirecting...';
            }


            setTimeout(() => {
                window.location.href = '\\classcode/classcode.html';
            }, 1500); // Redirect after 1.5 seconds

        });
    } else {
        console.error("Error: Login button with class 'login-btn' not found.");
    }


    // Event listener for the "Sign up" button (to navigate to signup.html)
    if (navigateToSignupBtn) {
        navigateToSignupBtn.addEventListener('click', () => {
            window.location.href = 'signup.html';
        });
    } else {
        console.warn("Warning: navigateToSignupBtn element not found in the DOM.");
    }

});