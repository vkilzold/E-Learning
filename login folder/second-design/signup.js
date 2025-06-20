import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://uwbkcarkmgawqhzcyrkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I'; 
const supabase = createClient(supabaseUrl, supabaseKey);

function togglePassword(fieldId) {
  const passwordField = document.getElementById(fieldId);
  const toggle = passwordField.nextElementSibling;

  if (passwordField.type === 'password') {
    passwordField.type = 'text';
    toggle.textContent = 'Hide';
  } else {
    passwordField.type = 'password';
    toggle.textContent = 'Show';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const message = document.getElementById('message');
  const navigateToLoginBtn = document.getElementById('navigateToLoginBtn');
  const passwordToggles = document.querySelectorAll('.password-toggle');

  if (navigateToLoginBtn) {
    navigateToLoginBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }

  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const targetFieldId = toggle.dataset.target;
      if (targetFieldId) {
        togglePassword(targetFieldId);
      }
    });
  });

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      const confirmPassword = document.getElementById('confirmPassword').value.trim();
      const termsCheckbox = document.getElementById('termsCheckbox');
      const roleInput = document.querySelector('input[name="role"]:checked');
      const role = roleInput ? roleInput.value : '';

      if (!fullName || !email || !password || !confirmPassword || !role) {
        message.textContent = 'Please fill in all required fields.';
        message.style.color = 'red';
        return;
      }

      if (password !== confirmPassword) {
        message.textContent = 'Passwords do not match.';
        message.style.color = 'red';
        return;
      }

      if (!termsCheckbox.checked) {
        message.textContent = 'You must agree to the privacy and policy.';
        message.style.color = 'red';
        return;
      }

      message.textContent = 'Checking for existing email...';
      message.style.color = 'blue';

      //  Check if email already exists in Supabase Auth
      const { data: existingUserData, error: signupTry } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role }
        }
      });

      if (signupTry) {
        if (signupTry.message && signupTry.message.includes('already registered')) {
          message.textContent = '❌ This email is already registered. Try logging in.';
          message.style.color = 'orange';
          return;
        } else {
          message.textContent = `❌ Signup failed: ${signupTry.message}`;
          message.style.color = 'red';
          return;
        }
      }

      if (!existingUserData || !existingUserData.user) {
        message.textContent = '❌ Signup failed: Unexpected error.';
        message.style.color = 'red';
        return;
      }

      // ✅ Success
      message.textContent = '✅ Signup successful! Please check your email. Redirecting...';
      message.style.color = 'green';
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);

      
    });
    
  }
});
