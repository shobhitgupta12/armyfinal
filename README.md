# AI-Enabled Drone & Counter-Drone Threat Simulation Trainer (PS 26247)

An advanced, software-only military C-UAS (Counter-Unmanned Aircraft Systems) simulator designed to train unit-level personnel to detect, classify, and neutralize drone and swarm threats on standard laptop hardware with zero specialized equipment.

---

## Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended)
- NPM (v9+)

### Installation & Running
```bash
# Install dependencies
npm install

# Launch local dev server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## App Screens & User Workflow

1. **Home / Trainee Profile**: Enter rank/name and squad unit. View rolling performance metrics and quick launch buttons for Adaptive Mode, Scenario Library, AAR Dashboard, and Leaderboard.
2. **Scenario Select**: Choose from 5 scripted missions, generate reproducible random scenarios using Mulberry32 PRNG seeds, or run Adaptive Mode.
3. **Simulator (Core Game)**: 2D top-down tactical radar scope centered on defended base asset (0,0). Toggle active sensors (Radar, EO/IR Camera, RF Detector, Acoustic Array), slew optical lens, acknowledge blips, classify target types, and execute RF Jamming, Soft-Kill, or Hard-Kill Kinetic Interceptors.
4. **Debrief**: Post-mission evaluation featuring letter grades (S, A, B, C, D, F), sub-score radar charts, rule-based & optional LLM AI instructor debrief notes, and per-entity decision tree pass/fail node inspection.
5. **AAR Dashboard**: Historical session trends, spider charts, unit mistake category aggregations, interactive timeline replay player with ground-truth revealed, and PDF/JSON export options.
6. **Unit Leaderboard**: Unit readiness index, squad selection filter, operator ranking table, and qualification badges.

---

## System Architecture

```
+-------------------------------------------------------------------------------+
|                             C-UAS REACT APP (Vite)                            |
+-----------------------+-----------------------+-------------------------------+
                        |                       |
       +----------------v----------------+      |
       |     TACTICAL SIM ENGINE         |      |
       |  - Physics (entities.ts)        |      |
       |  - Sensors (sensors.ts)         |      |
       |  - Mechanics (engine.ts)        |      |
       +----------------+----------------+      |
                        |                       |
       +----------------v----------------+      |
       |     SCENARIO GENERATOR          |      |
       |  - Scripted (scripted.ts)       |      |
       |  - PRNG (mulberry32)            |      |
       +----------------+----------------+      |
                        |                       |
       +----------------v----------------+      |      +------------------------+
       |     DECISION TREE SCORING       |      |      |  LOCALSTORAGE PERSIST  |
       |  - Rubric (rubric.ts)           |======+=====>|  - Sessions             |
       |  - Trees (decisionTree.ts)      |             |  - Profiles            |
       +----------------+----------------+             |  - Pre-seeded Data     |
                        |                              +------------------------+
       +----------------v----------------+
       |   AI INSTRUCTOR & ADAPTIVE      |
       |  - Debrief (instructor.ts)      |
       |  - Scaling (difficulty.ts)      |
       +---------------------------------+
```

---

## Tactical Scoring Rubric

Missions are evaluated across 5 quantitative dimensions:

1. **Detection Speed (25%)**:
   - `< 5.0s`: 100 pts (Excellent)
   - `5.0s - 10.0s`: 75 pts (Good)
   - `10.0s - 20.0s`: 40 pts (Slow)
   - `> 20.0s` or Missed: 0 pts

2. **Classification Accuracy (25%)**:
   - Exact Match (e.g. Hostile Attack $\rightarrow$ Hostile Attack): 100 pts
   - Right Category, Wrong Subtype: 60 pts
   - Wrong Category (Hostile $\rightarrow$ Friendly / Bird): 0 pts + penalty

3. **Engagement Decision Tree (30%)**:
   - Evaluates target identity, perimeter interception threshold (500m), weapon selection suitability (RF Jammer for RF-linked, Kinetic for autonomous), and base alarm discipline.

4. **Resource Efficiency (10%)**:
   - Penalizes interceptor ammo wasted on non-hostile decoys/birds and jammer spamming against autonomous guidance.

5. **Asset Health Remaining (10%)**:
   - Remaining integrity of central defended asset at mission conclusion.

*Penalty*: Heavy score deduction (-25 pts) for fratricide (engaging friendly UAVs).

---

## Procedural Scenario Generation

Powered by the **Mulberry32 PRNG**, the generator uses deterministic seeds to guarantee:
- 100% reproducible mission conditions when sharing seed numbers among instructors.
- Guaranteed solvability with balanced threat waves, decoy ratios, environment modifiers (Day/Night, Fog/Rain, Urban Shadowing), and sensor degradation.

---

## Keyboard Shortcuts

- `D`: Detect / Acknowledge Selected Track
- `J`: Deploy RF Jammer
- `S`: Deploy Soft-Kill GPS Spoofing
- `H`: Fire Kinetic Interceptor (Hard-Kill)
- `A`: Sound Base Alarm (Personnel Take Cover)
- `1 - 6`: Quick Classify Target Type (1: Attack, 2: Recon, 3: Swarm, 4: Friendly, 5: Civilian, 6: Bird)
- `SPACE`: Pause / Resume Simulation
- `ESC`: Deselect Track

---

## Future Work & Roadmap

1. **WebXR / VR Mode**: Immersive 3D C-UAS command tower interface using Three.js / WebXR for VR headset training.
2. **Multi-User LAN Training**: Instructor console allowing live red-teaming where an instructor manually pilot threat swarms against trainees over WebSockets/WebRTC.
3. **Real Sensor Data Integration**: Direct feed ingest for ASTERIX Cat 048/062 radar protocols and RTSP thermal video streams for real-world operational hardware testing.
4. **ML-Based Adaptive Opponent Behavior**: Reinforcement Learning (RL) trained drone swarm agents executing dynamic evasive maneuvers and multi-vector saturation tactics.
