import json
import re

with open("scripts/forest.json", "r") as f:
    forest = json.load(f)

forest_str = json.dumps(forest, indent=2)

with open("src/ai/threatClassifier.ts", "r", encoding="utf-8") as f:
    ts_content = f.read()

new_ts = re.sub(r'const FOREST: TreeNode\[\] = \[\n.*?^\];', 'const FOREST: TreeNode[] = ' + forest_str + ';', ts_content, flags=re.MULTILINE | re.DOTALL)

with open("src/ai/threatClassifier.ts", "w", encoding="utf-8") as f:
    f.write(new_ts)

print("Injected newly generated JSON to TS.")
