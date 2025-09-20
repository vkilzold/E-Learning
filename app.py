import os
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from supabase import create_client, Client, ClientOptions


app = Flask(__name__, template_folder='.')

# A secret key is needed for session management.
# In a real app, you would set this in a secure environment variable.
# For now, we'll use a hardcoded key so it runs out-of-the-box.
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "a-very-secret-key-that-should-be-in-env")

# Enable Cross-Origin Resource Sharing (CORS) for all routes.
# This is useful for development when your front-end and back-end are separate.
CORS(app)

# Supabase configuration.
# NOTE: Replace with your actual Supabase URL and key.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://uwbkcarkmgawqhzcyrkc.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I")

# Create the Supabase client instance.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ----------------------
# STEP 3: Define your web application routes
# ----------------------

@app.route('/')
def index():
    """
    Renders the main index page.
    """
    # Updated path to reflect the folder structure.
    return render_template('index-folder/index.html')

@app.route('/dashboard')
def dashboard():
    """
    Renders the student dashboard page, fetching student info from the user_profiles table.
    """
    # Get the student ID from the server-side session.
    student_id = session.get("student_id")

    if not student_id:
        # If no student ID is found, handle this as a guest user or redirect to login.
        # Updated path to reflect the folder structure.
        return render_template('login-folder/login.html', message='Please log in to view your dashboard.')

    try:
        # Query the 'user_profiles' table for the student's data.
        response = supabase.table('user_profiles').select('*').eq('id', student_id).execute()
        student_data = response.data[0] if response.data else {'id': student_id, 'full_name': 'Guest'}
        student_full_name = student_data.get('full_name', 'Guest')
    except Exception as e:
        print(f"Error fetching data from Supabase: {e}")
        student_full_name = "Error fetching name"
    
    # Updated path to reflect the folder structure.
    return render_template('student-dashboard/dashboard.html', student_id=student_id, student_name=student_full_name)

@app.route('/set-session-id', methods=['POST'])
def set_session_id():
    """
    Endpoint to set the student_id in the Flask session after a client-side login.
    """
    data = request.get_json(force=True)
    student_id = data.get("student_id")
    if student_id:
        session["student_id"] = student_id
        return jsonify({"success": True, "message": "Session ID set."}), 200
    return jsonify({"success": False, "message": "No student ID provided."}), 400

@app.route('/quiz')
def quiz():
    """
    Renders the quiz page.
    """
    # Updated path to reflect the folder structure.
    return render_template('quiz/quiz.html')

@app.route('/predict', methods=['POST'])
def predict():
    """
    An API endpoint to handle predictions from the ML model.
    """
    try:
        data = request.get_json(force=True)
        input_features = data.get('features', [])
        
        # Placeholder prediction logic.
        if len(input_features) > 5 and all(isinstance(x, (int, float)) for x in input_features):
            prediction = 'Pass'
        else:
            prediction = 'Fail'
            
        return jsonify({'prediction': prediction})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ----------------------
# STEP 4: Run the app
# ----------------------
if __name__ == '__main__':
    # Run the Flask app in debug mode.
    app.run(debug=True)
