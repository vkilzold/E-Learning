import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://uwbkcarkmgawqhzcyrkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I'; 
const supabase = createClient(supabaseUrl, supabaseKey);

const signupForm = document.getElementById('signupForm');
const message = document.getElementById('message');

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const role = document.querySelector('input[name="role"]:checked').value;

  // Sign up using Supabase Auth
  console.log("Signing up with:", email, password, fullName, role);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: role }
    }
  });
  console.log("Supabase response:", data, error);


  if (error) {
    message.textContent = `❌ Signup failed: ${error.message}`;
    return;
  }

  message.style.color = 'green';
  message.textContent = `✅ Signup successful! Please check your email to verify.`;
});
