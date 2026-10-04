"""
train_classifier.py — C-UAS Threat Classifier Training Pipeline
================================================================
Generates synthetic labelled training data from the simulator's own
entity parameter distributions, trains a scikit-learn RandomForest,
evaluates it on a held-out test set, and exports the first N trees as
a JSON file that can be imported into threatClassifier.ts.

Usage
-----
    pip install scikit-learn numpy
    python scripts/train_classifier.py

Outputs
-------
    scripts/forest.json   — first 10 trees in the nested-dict format
                            consumed by threatClassifier.ts
    scripts/metrics.txt   — accuracy, per-class precision/recall/F1
                            on a 20% held-out test split

IMPORTANT: The slide / deck should say:
    "Classifier trained on ~10,000 simulator-generated synthetic samples
     (stratified 80/20 train/test split). Accuracy on held-out test set:
     <VALUE FROM metrics.txt>."
Do NOT quote an accuracy figure that hasn't been measured on held-out data.
"""

import json
import random
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# ---------------------------------------------------------------------------
# 1. Feature-generation parameters (mirrors entity defaults in entities.ts)
# ---------------------------------------------------------------------------

LABELS = [
    "hostile_attack",
    "hostile_recon",
    "hostile_swarm",
    "friendly",
    "civilian",
    "bird",
]

# Each entry: (speed_range, alt_range, rcs_range, rf_active, rf_freq_choices,
#              sig_strength_range, iff_code, autonomous_chance)
# rf_freq: 0=none, 1=2.4GHz, 2=5.8GHz, 3=SATCOM
ENTITY_PARAMS = {
    "hostile_attack": {
        "speed":      (28, 42),
        "altitude":   (60, 120),
        "rcs":        (0.04, 0.08),
        "rf_chance":  0.65,          # 35% chance autonomous (no RF)
        "rf_freq":    [1],           # 2.4 GHz
        "sig":        (40, 95),
        "iff":        0,             # NO_RESPONSE
    },
    "hostile_recon": {
        "speed":      (12, 20),
        "altitude":   (100, 200),
        "rcs":        (0.02, 0.05),
        "rf_chance":  0.90,
        "rf_freq":    [1, 2],
        "sig":        (30, 80),
        "iff":        0,
    },
    "hostile_swarm": {
        "speed":      (20, 30),
        "altitude":   (60, 120),
        "rcs":        (0.03, 0.06),
        "rf_chance":  0.85,
        "rf_freq":    [2],           # 5.8 GHz
        "sig":        (50, 100),
        "iff":        0,
    },
    "friendly": {
        "speed":      (18, 26),
        "altitude":   (150, 280),
        "rcs":        (0.09, 0.18),
        "rf_chance":  1.0,
        "rf_freq":    [3],           # SATCOM
        "sig":        (60, 100),
        "iff":        2,             # FRIENDLY_SQUAWK (occasionally 1)
    },
    "civilian": {
        "speed":      (5, 14),
        "altitude":   (25, 70),
        "rcs":        (0.01, 0.03),
        "rf_chance":  0.90,
        "rf_freq":    [1, 2],
        "sig":        (15, 60),
        "iff":        1,             # UNKNOWN
    },
    "bird": {
        "speed":      (4, 10),
        "altitude":   (10, 50),
        "rcs":        (0.004, 0.012),
        "rf_chance":  0.0,           # never RF
        "rf_freq":    [],
        "sig":        (0, 0),
        "iff":        0,
    },
}

SAMPLES_PER_CLASS = 1667   # ≈ 10,000 total (stratified)


def generate_sample(label: str) -> list:
    p = ENTITY_PARAMS[label]
    rng = random.random

    speed = random.uniform(*p["speed"])
    altitude = random.uniform(*p["altitude"])
    rcs = random.uniform(*p["rcs"])

    # Add some noise so trees don't overfit perfectly clean boundaries
    speed    += random.gauss(0, speed * 0.05)
    altitude += random.gauss(0, altitude * 0.05)
    rcs      += random.gauss(0, rcs * 0.05)

    rf_active = 1 if rng() < p["rf_chance"] else 0
    if rf_active and p["rf_freq"]:
        rf_freq = random.choice(p["rf_freq"])
        sig = random.uniform(*p["sig"])
    else:
        rf_freq = 0
        sig = 0.0

    eo_conf = max(0.0, min(1.0, random.uniform(0.0, 0.9) * (1 if altitude < 300 else 0.3)))
    aco_conf = max(0.0, min(1.0, random.uniform(0.0, 0.7) if altitude < 180 else 0.0))

    iff = p["iff"]
    # Friendly occasionally shows NO_RESPONSE (equipment fault)
    if label == "friendly" and rng() < 0.15:
        iff = random.choice([0, 1])

    distance_norm = random.uniform(0.05, 1.0)  # 0-1 fraction of 3500 m

    return [
        max(0.5, speed),
        max(5.0, altitude),
        max(0.001, rcs),
        rf_active,
        rf_freq,
        max(0.0, sig),
        eo_conf,
        aco_conf,
        iff,
        distance_norm,
    ]


# ---------------------------------------------------------------------------
# 2. Generate dataset
# ---------------------------------------------------------------------------

print("Generating synthetic training data …")
X, y = [], []
for label in LABELS:
    for _ in range(SAMPLES_PER_CLASS):
        X.append(generate_sample(label))
        y.append(label)

X = np.array(X, dtype=np.float32)
y = np.array(y)

# ---------------------------------------------------------------------------
# 3. Train / test split & model training
# ---------------------------------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

print(f"Training on {len(X_train)} samples, evaluating on {len(X_test)} …")

clf = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,           # shallow enough for fast browser inference
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1,
)
clf.fit(X_train, y_train)

# ---------------------------------------------------------------------------
# 4. Evaluation
# ---------------------------------------------------------------------------

y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
report = classification_report(y_test, y_pred, digits=3)

metrics_text = f"""
C-UAS Threat Classifier — Evaluation Metrics
=============================================
Training samples : {len(X_train)}
Test samples     : {len(X_test)}
Test accuracy    : {acc:.3f}  ({acc*100:.1f}%)

Per-class report (on held-out 20% test split):
{report}
"""
print(metrics_text)
with open("scripts/metrics.txt", "w") as f:
    f.write(metrics_text)
print("Saved scripts/metrics.txt")

# ---------------------------------------------------------------------------
# 5. Export first N trees as JSON for use in threatClassifier.ts
# ---------------------------------------------------------------------------

EXPORT_N_TREES = 10

FEATURE_NAMES = [
    "speed", "altitude", "rcs", "rfPresent", "rfFreqBand",
    "rfStrength", "eoConf", "acousticConf", "iff", "distNorm",
]


def export_tree(estimator, feature_names):
    """Recursively convert a sklearn DecisionTreeClassifier to a
    nested-dict format compatible with the TypeScript TreeNode type."""
    tree = estimator.tree_
    classes = estimator.classes_

    def recurse(node_id):
        if tree.children_left[node_id] == -1:   # leaf
            class_idx = int(np.argmax(tree.value[node_id]))
            return {"type": "leaf", "label": classes[class_idx]}
        feat = int(tree.feature[node_id])
        thresh = float(tree.threshold[node_id])
        return {
            "type": "split",
            "feature": feat,
            "featureName": feature_names[feat],   # human-readable, informational
            "threshold": round(thresh, 5),
            "left":  recurse(tree.children_left[node_id]),
            "right": recurse(tree.children_right[node_id]),
        }

    return recurse(0)


print(f"\nExporting first {EXPORT_N_TREES} trees to scripts/forest.json …")
exported = [export_tree(est, FEATURE_NAMES) for est in clf.estimators_[:EXPORT_N_TREES]]

with open("scripts/forest.json", "w") as f:
    json.dump(exported, f, indent=2)

print("Done. To use in the browser:")
print("  1. Copy the content of scripts/forest.json")
print("  2. Replace the hand-coded FOREST array in src/ai/threatClassifier.ts")
print("  3. Update the classifier header to say 'trained on simulator-generated")
print("     synthetic data' and quote the accuracy from scripts/metrics.txt")
print(f"\nAchieved test accuracy: {acc*100:.1f}%")
