from pathlib import Path
from time import perf_counter
from typing import Optional
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Replace these imports/paths with the artifacts produced when you train/export
# the models from your notebooks.
# Example:
# import joblib
# vectorizer = joblib.load("artifacts/tfidf.joblib")
# models = {
#   "Logistic Regression": joblib.load("artifacts/logistic_regression.joblib"),
#   "SVM": joblib.load("artifacts/svm.joblib"),
#   "KNN": joblib.load("artifacts/knn.joblib"),
# }

app = FastAPI(title="Amazon Review Sentiment API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

LABELS = {0: "Negative", 1: "Neutral", 2: "Positive"}

class AnalyzeRequest(BaseModel):
    review: str
    model: str = "Logistic Regression"
    compare_models: bool = False

def clean_text(text: str) -> str:
    # Keep this function aligned with the preprocessing used to train your
    # actual TF-IDF vectorizer. Do not silently change preprocessing at serving time.
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text

def load_artifacts():
    """
    TODO: load your exported vectorizer/classifiers here.

    The uploaded Logistic Regression notebook trains:
      TfidfVectorizer(max_features=10000, stop_words="english")
      LogisticRegression(max_iter=1000, random_state=42)

    KNN and linear SVM use the same TF-IDF matrices in that notebook.

    Return:
      vectorizer, models
    where models is keyed by:
      Logistic Regression, SVM, KNN
    """
    return None, {}

@app.get("/api/health")
def health():
    vectorizer, models = load_artifacts()
    return {"status": "ok", "artifacts_loaded": bool(vectorizer and models)}

@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    if not req.review.strip():
        raise HTTPException(400, "Review text is required.")

    vectorizer, models = load_artifacts()
    if not vectorizer or not models:
        raise HTTPException(
            503,
            "Model artifacts are not configured. Export the trained TF-IDF vectorizer "
            "and Logistic Regression/SVM/KNN models, then implement load_artifacts()."
        )

    if req.model not in models:
        raise HTTPException(400, f"Unknown model: {req.model}")

    start = perf_counter()
    x = vectorizer.transform([clean_text(req.review)])

    def predict_one(name):
        model = models[name]
        label = int(model.predict(x)[0])
        confidence = None
        if hasattr(model, "predict_proba"):
            confidence = float(max(model.predict_proba(x)[0]))
        elif hasattr(model, "decision_function"):
            # Prefer a calibrated classifier if confidence must be probabilistic.
            confidence = None
        return {
            "sentiment": LABELS[label],
            "confidence": confidence,
            "model": name,
        }

    selected = predict_one(req.model)
    elapsed = round((perf_counter() - start) * 1000, 2)

    response = {
        "sentiment": selected["sentiment"],
        "confidence": selected["confidence"],
        "model": req.model,
        "tfidf_status": "processed",
        "prediction_time_ms": elapsed,
    }

    if req.compare_models:
        response["models"] = {name: predict_one(name) for name in models}

    return response
