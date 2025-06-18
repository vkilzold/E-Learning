import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://uwbkcarkmgawqhzcyrkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I';
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate class code: 4 random letters/numbers
function generateClassCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

document.addEventListener('DOMContentLoaded', async () => {
    const scrollBox = document.querySelector('.class-section .scroll-box');
    const teacherInfo = document.querySelector('.teacher-info');
    const modal = document.getElementById('classModal');
    const closeBtn = document.querySelector('.close-btn');
    const addClassBtn = document.querySelector('.class-section .action-btn');
    const addClassForm = document.getElementById('addClassForm');
    const classNameInput = document.getElementById('className');
  
    // 🔐 Get current logged-in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      alert("❌ Unable to fetch user. Please log in again.");
      return;
    }
  
    // 👤 Fetch teacher name
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
  
    if (profileError || !profile) {
      alert("⚠️ Failed to load teacher profile.");
      return;
    }
  
    // ✏️ Display teacher name
    teacherInfo.innerHTML = `<strong>Teacher:</strong> ${profile.full_name}<br>Subject: Programming<br>Section: BSCS3IS1`;
  
    // 🧾 Show modal form
    addClassBtn.addEventListener('click', () => {
      classNameInput.value = '';
      modal.style.display = 'flex';
    });
  
    // ❌ Close modal
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  
    // ✅ Form submit
    addClassForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const className = classNameInput.value.trim();
      if (!className) return;
  
      const classCode = generateClassCode();
  
      const { data: newClass, error } = await supabase
        .from('classes')
        .insert([{ name: className, class_code: classCode, created_by: user.id }])
        .select()
        .single();
  
      if (error) {
        alert(`❌ Failed to create class: ${error.message}`);
        return;
      }
  
      const newDiv = document.createElement('div');
      newDiv.className = 'item';
      newDiv.textContent = `${newClass.name} (${newClass.class_code})`;
      scrollBox.appendChild(newDiv);
  
      modal.style.display = 'none';
    });
  
    // 📋 Load existing classes
    const { data: classList, error: classListError } = await supabase
      .from('classes')
      .select('name, class_code')
      .eq('created_by', user.id);
  
    if (!classListError && classList && classList.length > 0) {
      scrollBox.innerHTML = '';
      classList.forEach(cls => {
        const item = document.createElement('div');
        item.className = 'item';
        item.textContent = `${cls.name} (${cls.class_code})`;
        scrollBox.appendChild(item);
      });
    }
  });