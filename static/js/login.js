// --- Supabase Client Initialization ---
import { supabase } from '../utils/supabaseClient.js';

// These elements are used for interacting with the login form, displaying messages,
// and navigating to other pages.
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const message = document.getElementById('message');
    const navigateToSignupBtn = document.getElementById('navigateToSignupBtn');
    const loginButton = document.querySelector('.login-btn'); 
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

// ------------------------------------ User Session Check Function ------------------------------------
    // Check if user was logged out from dashboard
    async function checkIfLoggedOut() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            // If no user or error, user was logged out
            if (error || !user) {
                return true;
            }
            return false;
        } catch (err) {
            // If there's any error, assume user was logged out
            return true;
        }
    }

// ------------------------------------  Page Initialization Function ------------------------------------
    // Initialize page
    async function initializePage() {
        // Check if user was logged out first
        const wasLoggedOut = await checkIfLoggedOut();
        
        // Only load saved credentials if user wasn't logged out
        if (!wasLoggedOut) {
            // Load saved credentials if "Remember me" was checked
            function loadSavedCredentials() {
                const savedEmail = localStorage.getItem('rememberedEmail');
                const savedPassword = localStorage.getItem('rememberedPassword');
                const wasRemembered = localStorage.getItem('rememberMe') === 'true';
                
                if (wasRemembered && savedEmail && savedPassword) {
                    if (emailInput) emailInput.value = savedEmail;
                    if (passwordInput) passwordInput.value = savedPassword;
                }
            }

            loadSavedCredentials();
        }
    }

    // Initialize the page
    initializePage();

    // Prevent form submission and handle it manually
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("Form submission prevented, handling manually");
        });
    }

// ------------------------------------ Login Button Functionality ------------------------------------
    // Event listener for the Login button
    if (loginButton) {
        console.log("Login button found and event listener attached");
        loginButton.addEventListener('click', async (e) => {
            console.log("Login button clicked");
            e.preventDefault(); 

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

            // Check for invalid email or password
            if (error) {
                if (message) {
                    message.textContent = '❌ Incorrect email or password.';
                    message.style.color = 'red';
                }
                console.error("Login Error:", error.message);
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

// ------------------------------------ Supabase Authentication ------------------------------------
            // check user profile in public.user_profiles
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('full_name,email')
                .eq('id', data.user.id)
                .single();

// ------------------------------------ Login Error Handling ------------------------------------
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

            // Redirect all users to the student dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        });
    } else {
        console.error("Error: Login button with class 'login-btn' not found.");
    }

    // Event listener for the "Sign up" button (to navigate to signup.html)
    if (navigateToSignupBtn) {
        navigateToSignupBtn.addEventListener('click', () => {
            window.location.href = '/signup';
        });
    } else {
        console.warn("Warning: navigateToSignupBtn element not found in the DOM.");
    }

    // Event listener for the "Sign up" link (to navigate to signup.html)
    const navigateToSignupLink = document.getElementById('navigateToSignupLink');
    if (navigateToSignupLink) {
        console.log("Sign up link found and event listener attached");
        navigateToSignupLink.addEventListener('click', (e) => {
            console.log("Sign up link clicked, navigating to signup.html");
            e.preventDefault();
            window.location.href = '/signup';
        });
    } else {
        console.error("Error: navigateToSignupLink element not found in the DOM.");
    }

});