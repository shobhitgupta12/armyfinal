import json
import re

classes_ = sorted([
    "hostile_attack",
    "hostile_recon",
    "hostile_swarm",
    "friendly",
    "civilian",
    "bird",
])

with open("scripts/forest.json", "r") as f:
    forest = json.load(f)

def fix_labels(node):
    if node["type"] == "leaf":
        idx = int(node["label"])
        node["label"] = classes_[idx]
    else:
        fix_labels(node["left"])
        fix_labels(node["right"])

for tree in forest:
    fix_labels(tree)

forest_str = json.dumps(forest, indent=2)

with open("src/ai/threatClassifier.ts", "r", encoding="utf-8") as f:
    ts_content = f.read()

# Replace everything between "const FOREST: TreeNode[] = [" and the next "];"
new_ts = re.sub(r'const FOREST: TreeNode\[\] = \[\n.*?^\];', 'const FOREST: TreeNode[] = ' + forest_str + ';', ts_content, flags=re.MULTILINE | re.DOTALL)

with open("src/ai/threatClassifier.ts", "w", encoding="utf-8") as f:
    f.write(new_ts)

print("Fixed labels and injected to TS.")
