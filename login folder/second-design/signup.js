// --- Supabase Client Initialization ---
import { supabase } from '../../utils/supabaseClient.js';
// ------------------------------------ Password eye Function ------------------------------------
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

// ------------------------------------ Navigate to Login Button ------------------------------------
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

// ------------------------------------ Signup Form ------------------------------------
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

// ------------------------------------ Checks if all required fields are filled ------------------------------------
      if (!fullName || !email || !password || !confirmPassword || !role) {
        message.textContent = 'Please fill in all required fields.';
        message.style.color = 'red';
        return;
      }
// ------------------------------------ password and confirm password fields match ------------------------------------
      if (password !== confirmPassword) {
        message.textContent = 'Passwords do not match.';
        message.style.color = 'red';
        return;
      }
// ------------------------------------ privacy and policy terms ------------------------------------
      if (!termsCheckbox.checked) {
        message.textContent = 'You must agree to the privacy and policy.';
        message.style.color = 'red';
        return;
      }

// ------------------------------------ Display "Signing Up" Message ------------------------------------
      message.textContent = 'Signing up....';
      message.style.color = 'blue';

// ------------------------------------ Supabase User Registration (Sign Up) ------------------------------------
      //  Check if email already exists in Supabase Auth
      const { data: existingUserData, error: signupTry } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role }
        }
      });

// ------------------------------------ Signup Error Handling ------------------------------------
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

// ------------------------------------ Signup Success Message ------------------------------------
      // ✅ Success
      message.textContent = '✅ Signup successful! Please check your email. Redirecting...';
      message.style.color = 'green';
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1800);

      
    });
    
  }
});
