# model.py
import os
import dill
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler, OrdinalEncoder
from sklearn.metrics import accuracy_score
from xanfis.models.classic_anfis import AnfisClassifier


def _is_picklable(obj) -> bool:
    try:
        dill.dumps(obj)
        return True
    except Exception:
        return False


def _build_model_bundle(model: AnfisClassifier, init_params: dict) -> dict:
    # Capture only picklable parts of the model state
    state = {}
    for key, value in model.__dict__.items():
        if _is_picklable(value):
            state[key] = value
    return {
        "init_params": init_params,
        "state": state,
    }


def train_and_save_model():
    # 1. Load dataset
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, "scaffold_data.csv")
    print(f"📄 Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)

    # 2. Features and target
    X = df.drop("scaffold_level", axis=1)
    y = df["scaffold_level"].values

    # 3. Split categorical and numerical
    categorical_features = X[["difficulty"]]
    numerical_features = X[["accuracy", "hint_usage", "mistake", "ability"]].astype(float)

    # 4. Shuffle for reproducibility
    np.random.seed(42)
    indices = np.random.permutation(len(X))
    numerical_features = numerical_features.iloc[indices]
    categorical_features = categorical_features.iloc[indices]
    y = y[indices]

    # 5. Scale numerical
    print("🔧 Fitting MinMaxScaler on numerical features...")
    scaler = MinMaxScaler()
    numerical_scaled = scaler.fit_transform(numerical_features)

    # 6. Encode categorical
    print("🔤 Fitting OrdinalEncoder on difficulty...")
    encoder = OrdinalEncoder(categories=[["Easy", "Medium", "Hard"]])
    categorical_encoded = encoder.fit_transform(categorical_features).astype(float)

    # 7. Combine
    X_preprocessed = np.column_stack((numerical_scaled, categorical_encoded))

    # 8. Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_preprocessed, y, test_size=0.2, random_state=42
    )

    # 9. Grid search best num_rules
    num_rules_options = [15]
    best_accuracy = 0
    best_num_rules = None
    best_model = None

    for num_rules in num_rules_options:
        print(f"🚀 Training ANFIS with num_rules={num_rules} ...")
        init_params = dict(
            mf_class="Gaussian",
            num_rules=num_rules,
            epochs=200,
            n_patience=10,
            batch_size=32,
            optim="Adam",
            verbose=False,
        )
        model = AnfisClassifier(**init_params)
        model.fit(X_train, y_train)

        y_test_pred = model.predict(X_test)
        test_acc = accuracy_score(y_test, y_test_pred)
        print(f"✅ num_rules={num_rules}, Test Accuracy={test_acc:.4f}")

        if test_acc > best_accuracy:
            best_accuracy = test_acc
            best_num_rules = num_rules
            best_model = model
            best_init_params = init_params
            print(f"⭐ New best so far: num_rules={best_num_rules}, acc={best_accuracy:.4f}")

    print(f"🏁 Best configuration: num_rules={best_num_rules}, acc={best_accuracy:.4f}")

    # 10. Save model + preprocessing
    model_dir = os.path.join(base_dir, "model_files")
    os.makedirs(model_dir, exist_ok=True)

    scaler_path = os.path.join(model_dir, "scaler.pkl")
    encoder_path = os.path.join(model_dir, "encoder.pkl")
    model_path = os.path.join(model_dir, "anfis_model.pkl")

    # Build a serializable bundle instead of dumping the raw model object
    print("🧱 Building serializable model bundle...")
    model_bundle = _build_model_bundle(best_model, best_init_params)

    try:
        print(f"💾 Saving scaler -> {scaler_path}")
        with open(scaler_path, "wb") as f:
            dill.dump(scaler, f)
        print("✅ Scaler saved")
    except Exception as e:
        print(f"❌ Failed to save scaler: {e}")
        raise

    try:
        print(f"💾 Saving encoder -> {encoder_path}")
        with open(encoder_path, "wb") as f:
            dill.dump(encoder, f)
        print("✅ Encoder saved")
    except Exception as e:
        print(f"❌ Failed to save encoder: {e}")
        raise

    try:
        print(f"💾 Saving model bundle -> {model_path}")
        with open(model_path, "wb") as f:
            dill.dump(model_bundle, f)
        print("✅ Model bundle saved")
    except Exception as e:
        print(f"❌ Failed to save model: {e}")
        raise

    print("🎉 ✅ Model and preprocessing saved in 'model_files/'")

if __name__ == "__main__":
    train_and_save_model()

