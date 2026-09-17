# Amazon Review Sentiment Dashboard

A responsive ML dashboard for an Amazon customer-review sentiment project.

## Included

- Dashboard with KPI cards, sentiment distribution and recent reviews
- Analyze Review workflow
- Logistic Regression / SVM / KNN selector
- Compare Models view
- Previous Reviews table with search/filter/sort
- Review Statistics
- Model Performance
- About/System architecture page
- Local browser save for demonstration
- Python FastAPI contract at `POST /api/analyze`

## Important source alignment

The uploaded Logistic Regression notebook defines sentiment from rating:

- Negative = rating < 3
- Neutral = 3 <= rating < 4
- Positive = rating >= 4

It reports 1,462 usable reviews after preprocessing: 1,109 Positive, 347 Neutral, 6 Negative.

Its TF-IDF setup is `max_features=10000, stop_words="english"`. Logistic Regression, KNN and linear SVM are evaluated on the resulting TF-IDF features.

The dashboard displays the notebook's observed evaluation results rather than invented scores. KNN accuracy/F1 are directly printed by the notebook. Weighted precision/recall/F1 for Logistic Regression and SVM in the UI are calculated from their 3-class confusion matrices because the notebook's later classification-report cell has a label-handling inconsistency.

The Random Forest notebook is intentionally not treated as a sentiment classifier: it predicts High Product (rating >= 4) vs Not High Product.

## Run frontend

Open `index.html` in a browser. It works in demo mode if the Python API is unavailable.

To connect to the API from another host:

```js
localStorage.setItem("reviewApiBase", "http://localhost:8000");
```

Then refresh.

## Run backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Implement `load_artifacts()` in `backend/main.py` with the exported TF-IDF vectorizer and trained models.

## Recommended model export

Inside your training notebook, after fitting:

```python
import joblib

joblib.dump(tfidf, "artifacts/tfidf.joblib")
joblib.dump(model1, "artifacts/logistic_regression.joblib")
joblib.dump(svm, "artifacts/svm.joblib")
joblib.dump(knn, "artifacts/knn.joblib")
```

Keep the exact preprocessing/vectorizer used during training. Do not fit a new TF-IDF vectorizer for each prediction.
