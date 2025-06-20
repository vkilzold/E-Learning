import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://uwbkcarkmgawqhzcyrkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I'; 
const supabase = createClient(supabaseUrl, supabaseKey);


document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const message = document.getElementById('message');
    const navigateToSignupBtn = document.getElementById('navigateToSignupBtn');
    const loginButton = document.querySelector('.login-btn'); 
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Load saved credentials if "Remember me" was checked
    function loadSavedCredentials() {
        const savedEmail = localStorage.getItem('rememberedEmail');
        const savedPassword = localStorage.getItem('rememberedPassword');
        const wasRemembered = localStorage.getItem('rememberMe') === 'true';
        
        if (wasRemembered && savedEmail && savedPassword) {
            if (emailInput) emailInput.value = savedEmail;
            if (passwordInput) passwordInput.value = savedPassword;
            if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
        }
    }

    // Save credentials to localStorage
    function saveCredentials(email, password) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
        localStorage.setItem('rememberMe', 'true');
    }

    // Clear saved credentials
    function clearSavedCredentials() {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        localStorage.removeItem('rememberMe');
    }

    // Check if user was logged out from dashboard
    async function checkIfLoggedOut() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            // If no user or error, user was logged out
            if (error || !user) {
                // Clear saved credentials when user is logged out
                clearSavedCredentials();
                return true;
            }
            return false;
        } catch (err) {
            // If there's any error, assume user was logged out and clear credentials
            clearSavedCredentials();
            return true;
        }
    }

    // Initialize page
    async function initializePage() {
        // Check if user was logged out first
        const wasLoggedOut = await checkIfLoggedOut();
        
        // Only load saved credentials if user wasn't logged out
        if (!wasLoggedOut) {
            loadSavedCredentials();
        }
    }

    // Initialize the page
    initializePage();

    // Remember me checkbox event listener
    if (rememberMeCheckbox) {
        rememberMeCheckbox.addEventListener('change', () => {
            if (!rememberMeCheckbox.checked) {
                // If unchecked, clear saved credentials
                clearSavedCredentials();
                // Clear the input fields
                if (emailInput) emailInput.value = '';
                if (passwordInput) passwordInput.value = '';
            }
        });
    }

    // Event listener for the Login button
    if (loginButton) {
        loginButton.addEventListener('click', async (e) => {
            e.preventDefault(); 

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';
            const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

            if (!email || !password) {
                if (message) {
                    message.textContent = 'Please enter both email and password.';
                    message.style.color = 'red';
                }
                return;
            }

            // Handle "Remember me" functionality
            if (rememberMe) {
                saveCredentials(email, password);
            } else {
                clearSavedCredentials();
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

            //in default go to classcode but if the user is a teacher he/she wil go directly to dashboard 
            setTimeout(() => {
                if (profile.role === 'teacher') {
                    window.location.href = '\\teacher dashboard/teacherdashboard.html';
                } else if (profile.role === 'student') {
                    window.location.href = '\\student dashboard/dashboard.html';
                }
            }, 1500);
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