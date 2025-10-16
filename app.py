import os
import dill
import numpy as np
from flask import Flask, render_template, request, jsonify, session
from flask import send_from_directory
from flask_cors import CORS
from supabase import create_client, Client, ClientOptions
from xanfis.models.classic_anfis import AnfisClassifier
from model import train_and_save_model

app = Flask(__name__)


app.secret_key = os.environ.get("FLASK_SECRET_KEY", "a-very-secret-key-that-should-be-in-env")


CORS(app)


SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://uwbkcarkmgawqhzcyrkc.supabase.co")
# Use service role key for server-side operations (bypasses RLS)
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA0MjQ0MCwiZXhwIjoyMDY0NjE4NDQwfQ.-UqR2yuq9-wu58CuRXgEjQ_Lcuvp_q8hKERhdh3Ubiw")
# Keep anon key for client-side operations if needed
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YmtjYXJrbWdhd3FoemN5cmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDI0NDAsImV4cCI6MjA2NDYxODQ0MH0.BozcjvIAFN94yzI3KPOAdJrR6BZRsKZgnAVbqYw3b_I")

# Create the Supabase client instance with service role for server operations
print("✅ Using Supabase service role key for server operations")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def _is_nonempty_file(path: str) -> bool:
    return os.path.exists(path) and os.path.getsize(path) > 0


def _safe_load_pickle(path: str):
    with open(path, 'rb') as f:
        return dill.load(f)


def _reconstruct_model_from_bundle(bundle: dict) -> AnfisClassifier:
    init_params = bundle.get('init_params', {})
    state = bundle.get('state', {})
    model = AnfisClassifier(**init_params)
    # set picklable attributes back
    for key, value in state.items():
        setattr(model, key, value)
    return model


def load_ml_models():
    """Load the ML model and preprocessing objects. If missing/empty/corrupted, train once and then load."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(base_dir, 'model_files')
    model_path = os.path.join(model_dir, 'anfis_model.pkl')
    scaler_path = os.path.join(model_dir, 'scaler.pkl')
    encoder_path = os.path.join(model_dir, 'encoder.pkl')

    def train_if_needed(reason: str):
        print(f"ℹ️ {reason} Training model once...")
        train_and_save_model()

    try:
        # Ensure model files exist and are non-empty; otherwise train
        if not (_is_nonempty_file(model_path) and _is_nonempty_file(scaler_path) and _is_nonempty_file(encoder_path)):
            missing = []
            for p in (model_path, scaler_path, encoder_path):
                if not _is_nonempty_file(p):
                    missing.append(os.path.basename(p))
            train_if_needed(f"Model artifacts missing or empty: {', '.join(missing)}.")

        # Try loading; if any pickle is corrupted, retrain once and retry
        try:
            bundle = _safe_load_pickle(model_path)
            model = _reconstruct_model_from_bundle(bundle)
            scaler = _safe_load_pickle(scaler_path)
            encoder = _safe_load_pickle(encoder_path)
        except Exception as e:
            print(f"⚠️ Artifact load failed ({e}). Retraining once...")
            train_if_needed("Corrupted artifacts detected.")
            bundle = _safe_load_pickle(model_path)
            model = _reconstruct_model_from_bundle(bundle)
            scaler = _safe_load_pickle(scaler_path)
            encoder = _safe_load_pickle(encoder_path)
        
        print("✅ ML models loaded successfully!")
        return model, scaler, encoder
    except Exception as e:
        print(f"❌ Error loading ML models: {e}")
        return None, None, None

# Load models at startup
ml_model, ml_scaler, ml_encoder = load_ml_models()

def map_scaffold_level_to_number(scaffold_level_output):
    """
    Map ML model output to database storage format
    
    Args:
        scaffold_level_output: int or str - predicted scaffold level from ML model
    
    Returns:
        int - corresponding number for database storage (0=Low, 1=Medium, 2=High)
    """
    # Convert to int and return directly (0, 1, 2 mapping)
    try:
        result = int(scaffold_level_output)
        if result in [0, 1, 2]:
            return result
        else:
            return 1  # Default to Medium (1) for invalid values
    except (ValueError, TypeError):
        return 1  # Default to Medium (1) if conversion fails


def predict_scaffold_level(accuracy, hint_usage, mistake_count, ability, difficulty):
    """
    Predict scaffold level using the ML model
    
    Args:
        accuracy: float - accuracy as decimal (0-1) with 4 decimal places
        hint_usage: float - hint usage count or rate; we will treat it consistently with training
        mistake_count: int - number of mistakes
        ability: float - ability score (-1, 0, or 1)
        difficulty: str - difficulty level ('easy', 'medium', 'hard')
    
    Returns:
        int - predicted scaffold level number for database storage
    """
    if ml_model is None or ml_scaler is None or ml_encoder is None:
        print("❌ ML models not loaded, returning default scaffold level")
        return 2  # Default to Medium (2)
    
    try:
        # Normalize difficulty to match training encoder categories: ["Easy", "Medium", "Hard"]
        difficulty_title = str(difficulty).strip().title()  # -> Easy/Medium/Hard

        # Ensure accuracy is in decimal format (0-1) with 4 decimal places
        accuracy_decimal = round(float(accuracy), 4)
        
        # Prepare input arrays following the training pipeline order
        # Numerical features order during training: [accuracy, hint_usage, mistake, ability]
        numerical_features = np.array([[accuracy_decimal, float(hint_usage), float(mistake_count), float(ability)]])
        numerical_scaled = ml_scaler.transform(numerical_features)

        # Categorical features: [[difficulty]]
        categorical_features = np.array([[difficulty_title]])
        categorical_encoded = ml_encoder.transform(categorical_features).astype(float)

        # Combine exactly as in training: numerical_scaled + categorical_encoded
        X_preprocessed = np.column_stack((numerical_scaled, categorical_encoded))
        
        # Predict
        prediction = ml_model.predict(X_preprocessed)
        scaffold_level_raw = prediction[0]
        
        # Convert prediction to database number
        scaffold_level_number = map_scaffold_level_to_number(scaffold_level_raw)
        
        # Determine the meaning for logging
        meaning_map = {0: "Low", 1: "Medium", 2: "High"}
        meaning = meaning_map.get(scaffold_level_number, "Unknown")
        
        print(f"✅ Predicted Scaffold Level: {scaffold_level_raw} -> {scaffold_level_number} ({meaning})")
        return scaffold_level_number
        
    except Exception as e:
        print(f"❌ Error in prediction: {e}")
        return 2  # Default to Medium (2)

# ----------------------
# STEP 3: Define your web application routes
# ----------------------

@app.route('/')
def index():
    """
    Renders the main index page.
    """
    # Now Flask will look for index.html directly in the 'templates' folder.
    return render_template('index.html') #should be index.html but is quiz for testing

@app.route('/dashboard')
def dashboard():
    """
    Renders the student dashboard page, fetching student info from the user_profiles table.
    """
    # Get the student ID from the server-side session.
    student_id = session.get("student_id")

    if not student_id:
        # If no student ID is found, handle this as a guest user or redirect to login.
        # This now assumes you have a login.html in the 'templates' folder.
        return render_template('dashboard.html', message='Please log in to view your dashboard.')

    try:
        # Query the 'user_profiles' table for the student's data.
        response = supabase.table('user_profiles').select('*').eq('id', student_id).execute()
        student_data = response.data[0] if response.data else {'id': student_id, 'full_name': 'Guest'}
        student_full_name = student_data.get('full_name', 'Guest')
    except Exception as e:
        print(f"Error fetching data from Supabase: {e}")
        student_full_name = "Error fetching name"
    
    # This now assumes you have a dashboard.html in the 'templates' folder.
    return render_template('dashboard.html', student_id=student_id, student_name=student_full_name)

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
    # This now assumes you have a quiz.html in the 'templates' folder.
    return render_template('quiz.html')

@app.route('/signup')
def signup():
    """
    Renders the sign-up page.
    """
    # This assumes you have a signup.html in the 'templates' folder.
    return render_template('signup.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/title')
def title():
    return render_template('title.html')

@app.route('/progress')
def progress():
    return render_template('progress.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static', 'images'),
        'favicon.jpg',
        mimetype='image/jpeg')

# Serve badge image files from the repository 'badges' folder at /badges/<filename>
@app.route('/badges/<path:filename>')
def serve_badge(filename):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    badges_dir = os.path.join(base_dir, 'badges')
    # send_from_directory will return a 404 if file not found
    return send_from_directory(badges_dir, filename)

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

@app.route('/predict-scaffold-level', methods=['POST'])
def predict_scaffold_level_endpoint():
    """
    API endpoint to predict scaffold level and update user profile
    """
    try:
        data = request.get_json(force=True)
        student_id = data.get('student_id')
        accuracy = data.get('accuracy', 0)
        hint_usage = data.get('hint_usage', 0)  
        mistake_count = data.get('mistake_count', 0)
        ability = data.get('ability', 0)
        difficulty = data.get('difficulty', 'easy')
        
        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400
        
        # Format accuracy to 4 decimal places for consistency
        accuracy = round(float(accuracy), 4)
        print(f"📊 Received data - Accuracy: {accuracy}, Hint Usage: {hint_usage}, Mistakes: {mistake_count}, Ability: {ability}, Difficulty: {difficulty}")
        
        # Predict scaffold level
        scaffold_level = predict_scaffold_level(accuracy, hint_usage, mistake_count, ability, difficulty)
        
        # Update user_profiles table with the predicted scaffold level
        try:
            update_response = supabase.table('user_profiles').update({
                'scaffold_level': scaffold_level
            }).eq('id', student_id).execute()
            
            # Supabase may return empty data when no rows are returned in certain configs.
            # Consider it success if no error is raised; optionally re-fetch to verify.
            if update_response.error if hasattr(update_response, 'error') else False:
                print(f"❌ Failed to update scaffold level for student {student_id}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to update scaffold level'
                }), 500
            else:
                print(f"✅ Updated scaffold level for student {student_id}: {scaffold_level}")
                return jsonify({
                    'success': True,
                    'scaffold_level': scaffold_level,
                    'message': 'Scaffold level updated successfully'
                }), 200
                
        except Exception as e:
            print(f"❌ Error updating scaffold level: {e}")
            return jsonify({
                'success': False,
                'error': f'Database update failed: {str(e)}'
            }), 500
        
    except Exception as e:
        print(f"❌ Error in predict_scaffold_level_endpoint: {e}")
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    # Run the Flask app in debug mode.
    app.run(debug=True)
