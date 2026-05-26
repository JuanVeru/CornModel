import io
import numpy as np
from PIL import Image
from .config import MODEL_PATH

# Global variable to cache the loaded model
_model = None


def _build_and_load_weights(model_path: str):
    """
    Builds the exact MobileNetV2-based architecture that was used during training
    and loads only the weights from the .keras file.

    This approach COMPLETELY BYPASSES Keras deserialization (load_model / from_config),
    which breaks across Keras 3.x sub-versions because the model was trained in Google
    Colab (Keras 3.3+) but the backend runs TensorFlow 2.16.1 which bundles Keras 3.0.5.

    Architecture reproduced from training code:
        base_model = MobileNetV2(input_shape=(224, 224, 3), include_top=False, weights='imagenet')
        base_model.trainable = False
        x = GlobalAveragePooling2D()(base_model.output)
        x = Dropout(0.5)(x)
        predictions = Dense(3, activation='softmax')(x)
        model = Model(inputs=base_model.input, outputs=predictions)
    """
    import tensorflow as tf
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
    from tensorflow.keras.models import Model

    print("[*] Rebuilding MobileNetV2 architecture from scratch (bypassing deserialization)...")

    # Rebuild exact same graph - weights=None avoids downloading ImageNet weights
    # since we will load the trained weights immediately after
    base_model = MobileNetV2(input_shape=(224, 224, 3), include_top=False, weights=None)

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.5)(x)
    predictions = Dense(3, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=predictions)

    # Load weights from the .keras file (skips architecture deserialization entirely)
    print(f"[*] Loading weights from: {model_path}")
    model.load_weights(model_path)

    print("[*] Architecture rebuilt and weights loaded successfully.")
    return model


def load_keras_model():
    """Loads the model into memory if not already cached."""
    global _model
    if _model is None:
        try:
            _model = _build_and_load_weights(MODEL_PATH)
        except Exception as e:
            print(f"[!] Error loading Keras model: {e}")
            raise e
    return _model


def predict_leaf_image(image_bytes: bytes) -> tuple[str, float]:
    """
    Preprocess raw image bytes and query the loaded Keras model.

    Classes (alphabetical order matching training folder structure):
        0: 'Blight'
        1: 'Common_Rust'
        2: 'Healthy'

    Returns:
        tuple[str, float]: (clase_predicha, porcentaje_confianza)
    """
    model = load_keras_model()

    # 1. Decode image bytes with PIL
    img = Image.open(io.BytesIO(image_bytes))

    # 2. Force RGB (strips alpha channels from PNG uploads)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # 3. Resize to 224x224 as required by MobileNetV2
    img = img.resize((224, 224), Image.Resampling.BILINEAR)

    # 4. Convert to float32 numpy array
    img_array = np.array(img, dtype=np.float32)

    # 5. Add batch dimension: (224, 224, 3) -> (1, 224, 224, 3)
    img_array = np.expand_dims(img_array, axis=0)

    # 6. Run inference
    predictions = model.predict(img_array)

    # 7. Decode result
    nombres_clases = ['Blight', 'Common_Rust', 'Healthy']
    winning_idx = int(np.argmax(predictions[0]))
    confidence = float(np.max(predictions[0]) * 100.0)
    predicted_class = nombres_clases[winning_idx]

    return predicted_class, confidence
