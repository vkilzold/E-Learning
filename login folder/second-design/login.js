// login.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://uwbkcarkmgawqhzcyrkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I'; 
const supabase = createClient(supabaseUrl, supabaseKey);

const loginForm = document.getElementById('loginForm');
const message = document.getElementById('message');

// OPTIONAL: Go to signup page
const navigateToSignupBtn = document.getElementById('navigateToSignupBtn');
if (navigateToSignupBtn) {
  navigateToSignupBtn.addEventListener('click', () => {
    window.location.href = 'signup.html';
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  // Step 1: Log in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    message.textContent = `❌ Login failed: ${error.message}`;
    return;
  }

  // Step 2: Check email confirmation
  if (!data.user?.confirmed_at) {
    message.textContent = '⚠️ Please verify your email before logging in.';
    return;
  }

  // Step 3: Optionally check user profile in public.user_profiles
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    message.textContent = '⚠️ Login failed: user profile not found.';
    return;
  }

  // Step 4: Redirect
  message.style.color = 'green';
  message.textContent = '✅ Login successful! Redirecting...';

  setTimeout(() => {
    window.location.href = 'sampledashboard.html';
  }, 1500);
});
