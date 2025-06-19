import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://uwbkcarkmgawqhzcyrkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I';
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate random class code
function generateClassCode() {
return Math.random().toString(36).substring(2, 6).toUpperCase();
}

document.addEventListener('DOMContentLoaded', async () => {
const scrollBox = document.querySelector('.class-section .scroll-box'); // Main class display
const studentBox = document.querySelector('.student-section .scroll-box'); // Main student display
const teacherInfo = document.querySelector('.teacher-info');

const addClassBtn = document.getElementById('addClassBtn');
const addClassForm = document.getElementById('addClassForm');
const classNameInput = document.getElementById('className');
const modal = document.getElementById('classModal'); // Add class modal
const closeAddClassBtn = document.getElementById('closeAddClass');

const selectClassBtn = document.getElementById('selectClassBtn'); // Button to open class selection modal
const selectClassModal = document.getElementById('selectClassModal'); // Class selection modal
const closeSelectClassBtn = document.getElementById('closeSelectClass');
const classSelectionList = document.getElementById('classSelectionList'); // UL inside class selection modal

const viewStudentsModal = document.getElementById('viewStudentsModal');
const modalStudentList = document.getElementById('modalStudentList'); // Correctly targeting the UL inside the view students modal
const closeViewBtn = document.querySelector('.close-view-btn');
const viewStudentsBtn = document.getElementById('viewStudentsBtn'); // Correctly targeting the View button by ID


// --- Declare selectedClassId in a scope accessible by all relevant listeners ---
let selectedClassId = null; // Initialize as null here, accessible by all functions


// 🔐 Get current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
 alert("❌ Unable to fetch user. Please log in again.");
 return;
 }

 // ---------------------------------------------Profile part---------------------------------------------
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

teacherInfo.innerHTML = `<strong>Teacher:</strong> ${profile.full_name}`;

// ---------------------------------------------Add Class modal---------------------------------------------
// Show "Add Class" Modal
 addClassBtn.addEventListener('click', () => {
 classNameInput.value = '';
 modal.style.display = 'flex';
});

// Close "Add Class" Modal
 closeAddClassBtn.addEventListener('click', () => {
 modal.style.display = 'none';
 });

// Submit new class
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

    // Create item for main class display and add event listener
  const newDiv = document.createElement('div');
  newDiv.className = 'item';
  newDiv.textContent = `${newClass.name} (${newClass.class_code})`;
  newDiv.dataset.classId = newClass.id; // Store ID
      newDiv.addEventListener('click', () => {
          highlightClass(newDiv); // Add visual highlight
          selectedClassId = newClass.id; // --- FIX: Set selectedClassId here ---
          showStudentsForClass(newClass.id); // Show students in dashboard studentBox when class is clicked
    });
 scrollBox.appendChild(newDiv);

    // Create button for class selection modal and add event listener
    const newModalBtn = document.createElement('button');
    newModalBtn.className = 'item'; // Use 'item' class for styling consistency
    newModalBtn.textContent = `${newClass.name} (${newClass.class_code})`;
    newModalBtn.addEventListener('click', async () => {
        selectedClassId = newClass.id; // --- FIX: Set selectedClassId here as well ---
        await showStudentsForClass(newClass.id); // Load students into the dashboard's student list
        selectClassModal.style.display = 'none'; // Close the selection modal
    });
    classSelectionList.appendChild(newModalBtn);

 modal.style.display = 'none';
});

// ---------------------------------------------Display Class---------------------------------------------
 // Load existing classes
 const { data: classList, error: classListError } = await supabase
  .from('classes')
  .select('id, name, class_code')
  .eq('created_by', user.id);

 if (!classListError && classList) {
  scrollBox.innerHTML = '';
  classSelectionList.innerHTML = '';

  classList.forEach(cls => {
  // Display in main Class Box
  const item = document.createElement('div');
  item.className = 'item';
  item.textContent = `${cls.name} (${cls.class_code})`;
  item.dataset.classId = cls.id; // Store class ID in a data attribute

      // --- FIX: Add event listener to each class item in the main scrollBox ---
      item.addEventListener('click', () => {
          highlightClass(item); // Add visual highlight
          selectedClassId = cls.id; // --- FIX: Set selectedClassId here ---
          showStudentsForClass(cls.id); // Show students in dashboard studentBox when class is clicked
      });
 scrollBox.appendChild(item);

  // Display as a button in Modal for Selection
  const btn = document.createElement('button');
  btn.className = 'item'; // Use 'item' class for styling consistency
  btn.textContent = `${cls.name} (${cls.class_code})`;
        // Add click listener for selection from modal
  btn.addEventListener('click', async () => {
            selectedClassId = cls.id; // --- FIX: Set global selectedClassId when class is chosen from modal ---
  await showStudentsForClass(cls.id); // Load students into the dashboard's student list
  selectClassModal.style.display = 'none'; // Close the selection modal
  });
  classSelectionList.appendChild(btn);
  });
  } else if (classListError) {
    console.error("Error loading class list:", classListError);
    if (scrollBox) scrollBox.innerHTML = '<div class="item">Error loading classes.</div>';
} else {
    if (scrollBox) scrollBox.innerHTML = '<div class="item">No classes created yet.</div>';
}

function highlightClass(element) {
    const currentSelected = document.querySelector('.class-section .scroll-box .item.selected');
    if (currentSelected) {
        currentSelected.classList.remove('selected');
    }
    element.classList.add('selected');
}

// ---------------------------------------------Selecting a Class---------------------------------------------
 // Show Select Class Modal
 selectClassBtn.addEventListener('click', () => {
 selectClassModal.style.display = 'flex';
 });

// Close Select Class Modal
 closeSelectClassBtn.addEventListener('click', () => {
 selectClassModal.style.display = 'none';
 });

 // Fetch and display students by class_id into the dashboard's studentBox
  async function showStudentsForClass(classId) {
  const { data: students, error } = await supabase
  .from('user_profiles')
  .select('full_name')
  .eq('class_id', classId);

  if (error) {
    alert(`❌ Failed to load students for class display: ${error.message}`);
    return;
  }

  studentBox.innerHTML = ''; // This is the main student list on the dashboard
  if (students.length === 0) {
    studentBox.innerHTML = '<div class="item">No students in this class.</div>';
    return;
  }

  students.forEach(student => {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = student.full_name;
    studentBox.appendChild(item);
  });
  }

// ---------------------------------------------View button Student---------------------------------------------

if (viewStudentsBtn) { 
 viewStudentsBtn.addEventListener('click', async () => {
 if (!selectedClassId) { // This check now relies on selectedClassId being set
  alert("⚠️ Please select a class first.");
  return;
 }
 // Fetch students for the selected class
 const { data: students, error } = await supabase
 .from('user_profiles')
 .select('full_name')
 .eq('class_id', selectedClassId); // Uses the globally tracked selectedClassId

if (error) {
 alert(`❌ Failed to load students: ${error.message}`);
 console.error("Load Students Error:", error);
 return;
 }

// Populate the UL inside the View Students modal
  if (modalStudentList) { // Ensure the modal UL exists
      modalStudentList.innerHTML = ''; // Clear previous list
  if (students.length === 0) {
      modalStudentList.innerHTML = '<li>No students enrolled in this class yet.</li>';
  } else {
      students.forEach(student => {
      const li = document.createElement('li');
      li.textContent = student.full_name;
      modalStudentList.appendChild(li);
  });
  }
  } else {
      console.error("Error: modalStudentList element not found in the DOM.");
  }

 // Show the View Students modal
if (viewStudentsModal) { // Ensure the modal itself exists
 viewStudentsModal.style.display = 'flex'; // Show the modal
 } else {
 console.error("Error: viewStudentsModal element not found in the DOM.");
}
 });
}

 // Close student modal
 if (closeViewBtn) { // Ensure close button exists
closeViewBtn.addEventListener('click', () => {
if (viewStudentsModal) { // Ensure modal exists
 viewStudentsModal.style.display = 'none';
 }
});
}
});