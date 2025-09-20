// --- Supabase Client Initialization ---
import { supabase } from '../utils/supabaseClient.js';

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

      // ✅ Define variables properly
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const fullName = `${firstName} ${lastName}`;
      const gender = document.getElementById('gender').value;
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      const confirmPassword = document.getElementById('confirmPassword').value.trim();
      const termsCheckbox = document.getElementById('termsCheckbox');
      const username = document.getElementById('User Name').value.trim();

      // ------------------------------------ Checks if all required fields are filled ------------------------------------
      if (!firstName || !lastName || !gender || !email || !password || !confirmPassword || !username) {
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
      const { data: existingUserData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            gender: gender,
            username: username
          }
        }
      });

      // ------------------------------------ Signup Error Handling ------------------------------------
      if (signupError) {
        message.textContent = `❌ Signup failed: ${signupError.message}`;
        message.style.color = 'red';
        return;
      }

      if (!existingUserData || !existingUserData.user) {
        message.textContent = '❌ Signup failed: Unexpected error.';
        message.style.color = 'red';
        return;
      }

      // ✅ Success (no need for manual insert because your DB trigger should handle it)
      message.textContent = '✅ Signup successful! Please check your email. Redirecting...';
      message.style.color = 'green';

      setTimeout(() => {
        window.location.href = '..templates/login.html';
      }, 1800);
    });
  }
});
