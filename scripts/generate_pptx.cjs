const pptxgen = require('pptxgenjs');
const path = require('path');

const pptx = new pptxgen();
// Set layout to standard modern 16:9 widescreen (13.333 x 7.5 inches)
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Smart India Hackathon Team';
pptx.company = 'Ministry of Defence / C-UAS Simulator Team';
pptx.title = 'AI-Enabled Drone & Counter-Drone Threat Simulation Trainer (PS 26247)';

// Color Palette inspired by SIH Attachment & Military Tactical Theme
const C = {
  navyDark: '1E293B',
  navyLight: 'F8FAFC',
  primaryBlue: '1E3A8A',
  headerBlue: '1D4ED8',
  slateBg: 'F1F5F9',
  cardBg: 'FFFFFF',
  borderLight: 'CBD5E1',
  textDark: '0F172A',
  textMuted: '475569',
  emerald: '059669',
  emeraldLight: 'ECFDF5',
  cyan: '0891B2',
  cyanLight: 'ECFEFF',
  redCoral: 'E11D48',
  redLight: 'FFF1F2',
  amber: 'D97706',
  amberLight: 'FFFBEB',
  purple: '7C3AED',
  purpleLight: 'F5F3FF',
};

// Helper to add top SIH Header bar (calibrated for 13.33 x 7.5 canvas)
function addSIHHeader(slide, titleText, slideNum) {
  // Team pill left
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.2, w: 1.6, h: 0.65,
    fill: { color: 'FFFFFF' },
    line: { color: '94A3B8', width: 1 },
    rectRadius: 0.3
  });
  slide.addText('Vanguard_\nC-UAS', {
    x: 0.5, y: 0.2, w: 1.6, h: 0.65,
    fontSize: 9, bold: true, color: C.textDark, align: 'center', valign: 'middle'
  });

  // Slide Title
  slide.addText(titleText, {
    x: 2.2, y: 0.18, w: 8.8, h: 0.68,
    fontSize: 23, bold: true, color: C.textDark, align: 'center', valign: 'middle'
  });

  // SIH Logo box (top right)
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 11.18, y: 0.2, w: 1.65, h: 0.65,
    fill: { color: 'FFFFFF' },
    line: { color: 'CBD5E1', width: 1 },
    rectRadius: 0.1
  });
  slide.addText([
    { text: 'SMART INDIA\n', options: { fontSize: 8, bold: true, color: C.textDark } },
    { text: 'HACKATHON\n2026', options: { fontSize: 8, bold: true, color: C.primaryBlue } }
  ], {
    x: 11.18, y: 0.2, w: 1.65, h: 0.65,
    align: 'center', valign: 'middle'
  });

  // Slide Number bottom right
  slide.addText(String(slideNum), {
    x: 12.3, y: 7.05, w: 0.5, h: 0.3,
    fontSize: 10, bold: true, color: '64748B', align: 'right'
  });
}

// ==========================================
// SLIDE 1: TITLE SLIDE
// ==========================================
const slide1 = pptx.addSlide();
slide1.background = { color: 'F8FAFC' };

// Main SIH Title
slide1.addText('SMART INDIA HACKATHON 2026', {
  x: 0.6, y: 0.5, w: 10.3, h: 0.8,
  fontSize: 32, bold: true, color: C.primaryBlue, fontFace: 'Georgia'
});

// SIH 2026 Logo Right
slide1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 11.18, y: 0.4, w: 1.65, h: 0.85,
  fill: { color: 'FFFFFF' },
  line: { color: 'CBD5E1', width: 1 },
  rectRadius: 0.1
});
slide1.addText([
  { text: 'SMART INDIA\n', options: { fontSize: 9, bold: true, color: C.textDark } },
  { text: 'HACKATHON\n2026', options: { fontSize: 9, bold: true, color: C.primaryBlue } }
], {
  x: 11.18, y: 0.4, w: 1.65, h: 0.85,
  align: 'center', valign: 'middle'
});

// Left Detail Box
const leftInfo = [
  { label: 'Problem Statement ID –', value: ' 26247' },
  { label: 'Problem Statement Title –', value: ' AI-Enabled Drone & Counter-Drone Threat Simulation Trainer' },
  { label: 'Theme –', value: ' Robotics & Drones / Defence / Security' },
  { label: 'PS Category –', value: ' Software' },
  { label: 'Team ID –', value: ' 179587' },
  { label: 'Team Name –', value: ' Vanguard_C-UAS' },
];

let curY = 1.5;
leftInfo.forEach(item => {
  slide1.addText([
    { text: `• ${item.label}`, options: { bold: true, fontSize: 14.5, color: C.textDark } },
    { text: item.value, options: { bold: true, fontSize: 14.5, color: C.emerald } }
  ], {
    x: 0.6, y: curY, w: 7.3, h: 0.72,
    margin: 0
  });
  curY += 0.82;
});

// Right side: Radar Graphic Mockup Card
slide1.addShape(pptx.shapes.RECTANGLE, {
  x: 8.1, y: 1.45, w: 4.7, h: 5.2,
  fill: { color: '0A1118' },
  line: { color: '059669', width: 2 }
});

// Concentric radar rings
slide1.addShape(pptx.shapes.OVAL, { x: 8.55, y: 1.85, w: 3.8, h: 3.8, fill: { type: 'none' }, line: { color: '059669', width: 1, dashType: 'dash' } });
slide1.addShape(pptx.shapes.OVAL, { x: 9.15, y: 2.45, w: 2.6, h: 2.6, fill: { type: 'none' }, line: { color: '059669', width: 1 } });
slide1.addShape(pptx.shapes.OVAL, { x: 9.65, y: 2.95, w: 1.6, h: 1.6, fill: { type: 'none' }, line: { color: 'E11D48', width: 1.5 } });

// Center asset cross
slide1.addShape(pptx.shapes.OVAL, { x: 10.25, y: 3.55, w: 0.4, h: 0.4, fill: { color: '059669' } });
slide1.addText('DEFENDED BASE (0,0)', { x: 8.45, y: 4.15, w: 4.0, h: 0.3, fontSize: 9, bold: true, color: '10B981', align: 'center' });

// Blips
slide1.addShape(pptx.shapes.OVAL, { x: 9.0, y: 2.2, w: 0.18, h: 0.18, fill: { color: 'EF4444' } });
slide1.addText('TRK-101 [HOSTILE ATTACK]', { x: 8.3, y: 1.95, w: 2.5, h: 0.3, fontSize: 8, color: 'EF4444' });

slide1.addShape(pptx.shapes.OVAL, { x: 11.5, y: 2.7, w: 0.18, h: 0.18, fill: { color: '3B82F6' } });
slide1.addText('TRK-102 [FRIENDLY]', { x: 10.9, y: 2.45, w: 1.8, h: 0.3, fontSize: 8, color: '3B82F6' });

slide1.addShape(pptx.shapes.OVAL, { x: 11.0, y: 4.7, w: 0.18, h: 0.18, fill: { color: 'F59E0B' } });
slide1.addText('TRK-103 [BIRD/DECOY]', { x: 10.4, y: 4.9, w: 2.2, h: 0.3, fontSize: 8, color: 'F59E0B' });

slide1.addText([
  { text: 'TACTICAL C-UAS SIMULATOR\n', options: { fontSize: 11, bold: true, color: '10B981' } },
  { text: '60 FPS Canvas • 4-Sensor Fusion • Decision Tree Auditing', options: { fontSize: 9, color: '94A3B8' } }
], {
  x: 8.2, y: 5.75, w: 4.5, h: 0.7,
  align: 'center'
});

slide1.addText('1', { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontSize: 10, bold: true, color: '64748B', align: 'right' });


// ==========================================
// SLIDE 2: IDEA AND PROPOSED SOLUTION
// ==========================================
const slide2 = pptx.addSlide();
slide2.background = { color: 'F8FAFC' };
addSIHHeader(slide2, 'IDEA AND PROPOSED SOLUTION', 2);

// Left Column: OPERATIONAL GAP (Top)
slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 0.95, w: 5.85, h: 2.15,
  fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
});
slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 0.95, w: 5.85, h: 0.36,
  fill: { color: C.redCoral }, rectRadius: 0.08
});
slide2.addText('OPERATIONAL & TRAINING GAP', {
  x: 0.65, y: 0.95, w: 5.5, h: 0.36,
  fontSize: 10.5, bold: true, color: 'FFFFFF', valign: 'middle'
});
slide2.addText([
  { text: '• Asymmetric Aerial Threat: ', options: { bold: true, color: C.redCoral } },
  { text: 'Low-cost commercial drones, FPV kamikazes, and swarms outpace traditional air-defence economics.\n' },
  { text: '• Hardware Training Bottleneck: ', options: { bold: true, color: C.redCoral } },
  { text: 'Flying physical drone swarms and firing live kinetic/RF gear is cost-prohibitive, hazardous, and logistically restricted.\n' },
  { text: '• Multi-Vector Cognitive Overload: ', options: { bold: true, color: C.redCoral } },
  { text: 'Differentiating hostile recon, autonomous FPVs (RF-immune), friendly UAVs, and birds causes severe decision paralysis.\n' },
  { text: '• Absence of Quantified Auditing: ', options: { bold: true, color: C.redCoral } },
  { text: 'Conventional field drills lack second-by-second RoE decision tree auditing, replay telemetry, and adaptive remediation.' }
], {
  x: 0.6, y: 1.35, w: 5.65, h: 1.7,
  fontSize: 8.2, color: C.textDark, lineSpacingMultiple: 1.15
});

// Left Column: HOW IT ADDRESSES THE PROBLEM (Middle)
slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 3.20, w: 5.85, h: 2.25,
  fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
});
slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 3.20, w: 5.85, h: 0.36,
  fill: { color: C.primaryBlue }, rectRadius: 0.08
});
slide2.addText('HOW IT ADDRESSES THE PROBLEM', {
  x: 0.65, y: 3.20, w: 5.5, h: 0.36,
  fontSize: 10.5, bold: true, color: 'FFFFFF', valign: 'middle'
});
slide2.addText([
  { text: '• Zero-Hardware Client Engine: ', options: { bold: true, color: C.primaryBlue } },
  { text: 'Runs natively on standard COTS laptops at 60 FPS with zero specialized radar or GPU infrastructure.\n' },
  { text: '• Multi-Sensor Physical Fidelity: ', options: { bold: true, color: C.primaryBlue } },
  { text: 'Simulates Radar RCS, EO/IR optical slewing, RF spectrum band detection (2.4/5.8 GHz/SATCOM), and Acoustic array.\n' },
  { text: '• Strict RoE Decision Tree: ', options: { bold: true, color: C.primaryBlue } },
  { text: 'Automated verification enforces fratricide protection, penalizes decoy strikes, and validates weapon suitability.\n' },
  { text: '• Dynamic Adaptive Personalization: ', options: { bold: true, color: C.primaryBlue } },
  { text: 'Rolling 5-session performance tracking automatically identifies operator weak points and scales difficulty (1-10).\n' },
  { text: '• Comprehensive AAR & Export: ', options: { bold: true, color: C.primaryBlue } },
  { text: 'Scrubbable 4Hz timeline replay with ground-truth reveal, automated military-grade PDF reporting, and JSON export.' }
], {
  x: 0.6, y: 3.60, w: 5.65, h: 1.8,
  fontSize: 8.2, color: C.textDark, lineSpacingMultiple: 1.15
});

// Right Column: PROPOSED SOLUTION Flow (Top)
slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.55, y: 0.95, w: 6.28, h: 2.15,
  fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
});
slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.55, y: 0.95, w: 6.28, h: 0.36,
  fill: { color: C.purple }, rectRadius: 0.08
});
slide2.addText('PROPOSED SYSTEM ARCHITECTURE & WORKFLOW', {
  x: 6.7, y: 0.95, w: 6.0, h: 0.36,
  fontSize: 10.5, bold: true, color: 'FFFFFF', valign: 'middle'
});

// Flowchart Blocks (Horizontal row)
const flowBoxes = [
  { text: 'Layer 0: Physics\n& Sensor Engine\n(Radar/EO/RF/Mic)', color: 'ECFDF5', border: '059669', tc: '065F46' },
  { text: 'Procedural Gen\n(Mulberry32 PRNG)\n& Scripted Waves', color: 'EFF6FF', border: '2563EB', tc: '1E40AF' },
  { text: 'Tactical Scope\n& Countermeasure\n(Jam/Soft/Kinetic)', color: 'FFFBEB', border: 'D97706', tc: '92400E' },
  { text: 'Scoring Rubric &\nPer-Entity Decision\nTree Evaluation', color: 'F5F3FF', border: '7C3AED', tc: '5B21B6' },
  { text: 'AAR Replay Player\n& Unit Readiness\nLeaderboard', color: 'FFF1F2', border: 'E11D48', tc: '9F1239' }
];

let boxX = 6.68;
flowBoxes.forEach((fb, idx) => {
  slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: boxX, y: 1.45, w: 1.08, h: 1.5,
    fill: { color: fb.color }, line: { color: fb.border, width: 1.5 }, rectRadius: 0.08
  });
  slide2.addText(fb.text, {
    x: boxX + 0.02, y: 1.48, w: 1.04, h: 1.44,
    fontSize: 7.2, bold: true, color: fb.tc, align: 'center', valign: 'middle'
  });
  if (idx < 4) {
    slide2.addText('→', {
      x: boxX + 1.07, y: 2.0, w: 0.16, h: 0.3,
      fontSize: 10.5, bold: true, color: '64748B', align: 'center', valign: 'middle'
    });
  }
  boxX += 1.22;
});

// Right Column: TECHNICAL INNOVATION / UNIQUENESS (Middle)
slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.55, y: 3.20, w: 6.28, h: 2.25,
  fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
});
slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.55, y: 3.20, w: 6.28, h: 0.36,
  fill: { color: 'BE185D' }, rectRadius: 0.08
});
slide2.addText('TECHNICAL INNOVATION & UNIQUENESS', {
  x: 6.7, y: 3.20, w: 6.0, h: 0.36,
  fontSize: 10.5, bold: true, color: 'FFFFFF', valign: 'middle'
});
slide2.addText([
  { text: '• Deterministic 100% Solvable Seed Generator: ', options: { bold: true, color: 'BE185D' } },
  { text: 'Mulberry32 PRNG guarantees exact scenario reproducibility across squads with seed-sharing.\n' },
  { text: '• Autonomous / Fiber-Optic Drone Modeling: ', options: { bold: true, color: 'BE185D' } },
  { text: 'Simulates RF-silent threats immune to jamming, teaching trainees when to conserve RF pulses and fire kinetic rounds.\n' },
  { text: '• Dual-Engine AI Instructor: ', options: { bold: true, color: 'BE185D' } },
  { text: 'Instant deterministic tactical feedback + optional zero-latency LLM debrief API for constructive military critique.\n' },
  { text: '• Interactive Ground-Truth Replay: ', options: { bold: true, color: 'BE185D' } },
  { text: '4Hz downsampled frame scrubbing with green true-entity overlays vs operator actions for deep post-mission audit.\n' },
  { text: '• Zero Backend Dependency: ', options: { bold: true, color: 'BE185D' } },
  { text: '100% browser-native React 19 + TypeScript + HTML5 Canvas, operating entirely offline in field command posts.' }
], {
  x: 6.65, y: 3.60, w: 6.05, h: 1.8,
  fontSize: 8.2, color: C.textDark, lineSpacingMultiple: 1.15
});

// Bottom Bar: THREAT CLASSES DETECTED AND IDENTIFIED
slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 5.55, w: 12.33, h: 1.35,
  fill: { color: '0F172A' }, rectRadius: 0.08
});
slide2.addText('TARGET & THREAT CLASSES SIMULATED & IDENTIFIED', {
  x: 0.65, y: 5.60, w: 12.0, h: 0.25,
  fontSize: 9.5, bold: true, color: '38BDF8', align: 'left'
});

const threats = [
  { num: '①', name: 'Hostile Attack', desc: 'Kamikaze / Autonomous (32 m/s)', c: 'EF4444' },
  { num: '②', name: 'Hostile Recon', desc: 'Loitering Quadcopter (14 m/s)', c: 'F97316' },
  { num: '③', name: 'Hostile Swarm', desc: 'Coordinated Wave (24 m/s)', c: 'EC4899' },
  { num: '④', name: 'Friendly Patrol', desc: 'Intermittent/Valid IFF (22 m/s)', c: '3B82F6' },
  { num: '⑤', name: 'Civilian Drone', desc: 'Erratic Commercial (9 m/s)', c: 'EAB308' },
  { num: '⑥', name: 'Bird / Decoy', desc: 'Low RCS < 0.01 dBSM (7 m/s)', c: '10B981' }
];

let pillX = 0.55;
threats.forEach(t => {
  slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: pillX, y: 5.92, w: 1.95, h: 0.88,
    fill: { color: '1E293B' }, line: { color: t.c, width: 1.5 }, rectRadius: 0.08
  });
  slide2.addText([
    { text: `${t.num} ${t.name}\n`, options: { bold: true, fontSize: 8.5, color: t.c } },
    { text: t.desc, options: { fontSize: 6.8, color: '94A3B8' } }
  ], {
    x: pillX + 0.04, y: 5.95, w: 1.87, h: 0.82,
    align: 'center', valign: 'middle'
  });
  pillX += 2.05;
});


// ==========================================
// SLIDE 3: TECHNICAL APPROACH
// ==========================================
const slide3 = pptx.addSlide();
slide3.background = { color: 'F8FAFC' };
addSIHHeader(slide3, 'TECHNICAL APPROACH', 3);

// 3 Stages Columns
const stages = [
  {
    title: 'STAGE 1: SCENARIO & SENSOR SYNTHESIS',
    barColor: C.primaryBlue,
    x: 0.5,
    items: [
      { h: 'Procedural Scenario Generator:', b: 'Mulberry32 PRNG ensures deterministic, reproducible threat waves from integer seeds.' },
      { h: 'Environmental Degradation Matrix:', b: 'Day/Night visibility, Fog (EO penalty 0.35), Rain (Radar 2800m), Urban shadow zones.' },
      { h: 'Kinematic Behavior Models:', b: 'Direct attack vector, loitering recon orbit, sinusoidal swarm wave, erratic civilian/bird flight.' },
      { h: 'Multi-Sensor Fusion Suite:', b: 'Radar (RCS > (d/3500)²×0.02), EO/IR camera cone (45° FOV), RF detector (2.4/5.8 GHz), Acoustic array (650m).' },
      { h: 'IFF Squawk Simulation:', b: 'Models transponder states: Valid Squawk, Intermittent Faulty Squawk, or No Response.' }
    ]
  },
  {
    title: 'STAGE 2: TACTICAL C2 & ENGAGEMENT LAYER',
    barColor: C.purple,
    x: 4.69,
    items: [
      { h: '2D Tactical Radar Scope:', b: 'High-performance 60 FPS HTML5 canvas, 3500m radius, range rings (500m alert ring), 240°/s sweep.' },
      { h: 'Operator Track Acknowledgement [D]:', b: 'Trainees log target contact, recording reaction latency against threat appearance.' },
      { h: 'Optical Camera Slew & Classify [1-6]:', b: 'Slews optical camera to target bearing to verify visual feed before engagement.' },
      { h: 'Multi-Tier Countermeasure Suite:', b: '• RF Jammer [J]: 1800m range, 10s cooldown (fails on autonomous guidance)\n• Soft-Kill [S]: 2200m range GPS spoof\n• Hard-Kill [H]: Kinetic interceptor (8 ammo)' },
      { h: 'Base Tactical Alarm [A]:', b: 'Orders personnel into fortified bunkers, halving asset impact damage from 25% to 12.5%.' }
    ]
  },
  {
    title: 'STAGE 3: SCORING, AI DEBRIEF & AAR',
    barColor: C.emerald,
    x: 8.88,
    items: [
      { h: 'Quantitative 5-Axis Rubric:', b: '• Detection Speed (25%)\n• Classification Accuracy (25%)\n• Engagement Tree (30%)\n• Resource Efficiency (10%)\n• Asset Health (10%)' },
      { h: 'Per-Entity Decision Tree:', b: 'Node-by-node pass/fail verification: Target ID, Non-hostile protection, Weapon suitability, Perimeter intercept.' },
      { h: 'Fratricide & Collateral Penalties:', b: '-25 pts deduction per friendly UAV fratricide; severe penalties for ammo wasted on birds.' },
      { h: 'Dual AI Tactical Instructor:', b: 'Deterministic military tactical coaching + optional OpenAI/Gemini/Anthropic LLM API integration.' },
      { h: 'AAR Replay & Export Suite:', b: 'Interactive 4Hz timeline scrubber revealing ground truth, Chart.js radar charts, and military jsPDF report export.' }
    ]
  }
];

stages.forEach(stg => {
  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: stg.x, y: 0.95, w: 3.95, h: 4.45,
    fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
  });
  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: stg.x, y: 0.95, w: 3.95, h: 0.36,
    fill: { color: stg.barColor }, rectRadius: 0.08
  });
  slide3.addText(stg.title, {
    x: stg.x + 0.1, y: 0.95, w: 3.75, h: 0.36,
    fontSize: 9.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
  });

  let curItemY = 1.38;
  stg.items.forEach(itm => {
    slide3.addText([
      { text: `${itm.h} `, options: { bold: true, fontSize: 8.2, color: stg.barColor } },
      { text: itm.b, options: { fontSize: 7.6, color: C.textDark } }
    ], {
      x: stg.x + 0.15, y: curItemY, w: 3.65, h: 0.72,
      margin: 0, lineSpacingMultiple: 1.12
    });
    curItemY += 0.76;
  });
});

// Bottom Technology Stack Box
slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 5.55, w: 12.33, h: 1.35,
  fill: { color: '0F172A' }, rectRadius: 0.08
});
slide3.addText('TECHNOLOGY STACK ARCHITECTURE', {
  x: 0.65, y: 5.60, w: 12.0, h: 0.25,
  fontSize: 9.5, bold: true, color: '38BDF8', align: 'left'
});

const techStack = [
  { cat: 'CORE & SIMULATION', val: 'React 19, TypeScript 6.0,\nVite 8.3, 60 FPS HTML5 Canvas' },
  { cat: 'SCENARIO & PRNG', val: 'Mulberry32 PRNG (Seeded),\nVector Physics Kinematics' },
  { cat: 'STYLING & ICONS', val: 'TailwindCSS v4,\nLucide React Icons' },
  { cat: 'CHARTS & ANALYTICS', val: 'Chart.js v4, React-Chartjs-2\n(Skill Radar, Line, Bar)' },
  { cat: 'REPORTING & AUDIT', val: 'jsPDF (Military AAR PDF),\nJSON Session Telemetry' },
  { cat: 'AI DEBRIEF ENGINE', val: 'Rule-Based RoE Expert System,\nOpenAI / Gemini LLM API' }
];

let techX = 0.55;
techStack.forEach(ts => {
  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: techX, y: 5.92, w: 1.95, h: 0.88,
    fill: { color: '1E293B' }, line: { color: '334155', width: 1 }, rectRadius: 0.08
  });
  slide3.addText([
    { text: `${ts.cat}\n`, options: { fontSize: 7.5, bold: true, color: '38BDF8' } },
    { text: ts.val, options: { fontSize: 6.8, color: 'E2E8F0' } }
  ], {
    x: techX + 0.04, y: 5.95, w: 1.87, h: 0.82,
    align: 'center', valign: 'middle'
  });
  techX += 2.05;
});


// ==========================================
// SLIDE 4: FEASIBILITY AND VIABILITY
// ==========================================
const slide4 = pptx.addSlide();
slide4.background = { color: 'F8FAFC' };
addSIHHeader(slide4, 'FEASIBILITY AND VIABILITY', 4);

// Left Side: Feasibility Analysis (4 quadrants)
slide4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 0.95, w: 5.95, h: 4.45,
  fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
});
slide4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 0.95, w: 5.95, h: 0.36,
  fill: { color: C.primaryBlue }, rectRadius: 0.08
});
slide4.addText('FEASIBILITY & VERIFICATION ANALYSIS', {
  x: 0.65, y: 0.95, w: 5.65, h: 0.36,
  fontSize: 10.5, bold: true, color: 'FFFFFF', valign: 'middle'
});

const feasBlocks = [
  {
    tag: '1. Engineering Maturity (Deployed)',
    color: 'ECFDF5', border: '059669', tc: '065F46',
    desc: '• 6 comprehensive operational pages: Profile, Scenario Select, Tactical Sim, Debrief, AAR Dashboard, Leaderboard.\n• Strict TypeScript typings across all simulation entities, sensors, and scoring tree states.\n• Sub-millisecond physics updates running smoothly at native 60 FPS.'
  },
  {
    tag: '2. Functional Prototype (Empirical)',
    color: 'EFF6FF', border: '2563EB', tc: '1E40AF',
    desc: '• 5 pre-scripted tactical training missions + unlimited procedural seed generation.\n• Multi-sensor toggles (Radar, EO/IR, RF, Acoustic) with optical slewing and 3-tier countermeasure deployment.\n• Complete post-mission AAR with automated PDF generation and JSON export.'
  },
  {
    tag: '3. Zero-Hardware Footprint (Theoretical)',
    color: 'FFFBEB', border: 'D97706', tc: '92400E',
    desc: '• 100% client-side web execution on standard COTS laptops with zero dedicated GPU or radar equipment.\n• Operates completely offline, making it deployable in air-gapped military field bases with zero data leakage risk.'
  },
  {
    tag: '4. Measured Efficiency (Simulated)',
    color: 'F5F3FF', border: '7C3AED', tc: '5B21B6',
    desc: '• Mulberry32 PRNG generates complex balanced missions in under 2 ms.\n• Full decision tree evaluation across all targets executes in < 1 ms at mission completion.\n• Downsampled 4Hz telemetry frames allow instant scrubbing with minimal RAM usage.'
  }
];

let fbY = 1.38;
feasBlocks.forEach(fb => {
  slide4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.65, y: fbY, w: 5.65, h: 0.94,
    fill: { color: fb.color }, line: { color: fb.border, width: 1.2 }, rectRadius: 0.08
  });
  slide4.addText([
    { text: `${fb.tag}\n`, options: { bold: true, fontSize: 8.2, color: fb.tc } },
    { text: fb.desc, options: { fontSize: 7.0, color: C.textDark } }
  ], {
    x: 0.75, y: fbY + 0.04, w: 5.45, h: 0.86,
    lineSpacingMultiple: 1.12
  });
  fbY += 1.0;
});

// Right Side: Operational Risks and Mitigation Strategies
slide4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.65, y: 0.95, w: 6.18, h: 4.45,
  fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
});
slide4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.65, y: 0.95, w: 6.18, h: 0.36,
  fill: { color: C.purple }, rectRadius: 0.08
});
slide4.addText('OPERATIONAL RISKS & MITIGATION STRATEGIES', {
  x: 6.8, y: 0.95, w: 5.9, h: 0.36,
  fontSize: 10.5, bold: true, color: 'FFFFFF', valign: 'middle'
});

const risks = [
  { r: 'Hardware Limitations in Field Units', m: 'Software-only, browser-native client runs on standard issue laptops with zero installation requirements.' },
  { r: 'Trainee Over-Reliance on RF Jammers', m: 'Simulated autonomous & fiber-optic drones immune to RF jamming, forcing kinetic interception and base alarms.' },
  { r: 'High False Alarm Rates on Birds / Decoys', m: 'Realistic Radar Cross Section (RCS < 0.01 dBSM) and optical confidence modeling with strict RoE penalties.' },
  { r: 'Fratricide Risk from Faulty Friendly IFF', m: 'Simulated intermittent IFF squawks forcing trainees to cross-verify visual feeds via EO/IR before launching kinetic fire.' },
  { r: 'Scenario Memorization & Cheating', m: 'Deterministic Mulberry32 procedural generator creates billions of unique, balanced training airspace scenarios.' },
  { r: 'Negative Training & Unexplained Penalties', m: 'Automated decision-tree breakdown exposes exact node failures, paired with AI instructor tactical coaching.' },
  { r: 'Inconsistent Unit Training Visibility', m: 'Platoon-wide readiness index and aggregated mistake-category analytics identify squad-level weaknesses.' }
];

let rY = 1.38;
risks.forEach((rk, idx) => {
  slide4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.8, y: rY, w: 5.88, h: 0.5,
    fill: { color: idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
    line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.06
  });
  slide4.addText([
    { text: `⚠ Risk: ${rk.r}\n`, options: { bold: true, fontSize: 7.2, color: C.redCoral } },
    { text: `✔ Mitigation: ${rk.m}`, options: { fontSize: 6.8, color: C.textDark } }
  ], {
    x: 6.9, y: rY + 0.02, w: 5.68, h: 0.46,
    lineSpacingMultiple: 1.1
  });
  rY += 0.56;
});

// Bottom Bar: SCALABILITY & DEPLOYMENT ROADMAP
slide4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 5.55, w: 12.33, h: 1.35,
  fill: { color: '0F172A' }, rectRadius: 0.08
});
slide4.addText('SCALABILITY & DEPLOYMENT ROADMAP', {
  x: 0.65, y: 5.60, w: 12.0, h: 0.25,
  fontSize: 9.5, bold: true, color: '38BDF8', align: 'left'
});

const roadmap = [
  { p: 'PHASE 1 (COMPLETED)', t: 'Software-Only Prototype', d: 'React 19 + TypeScript + 60 FPS Canvas C-UAS Simulator with 5 Scripted Scenarios, Decision Tree Scoring & AAR PDF.', c: '10B981' },
  { p: 'PHASE 2 (PLANNED)', t: 'WebXR / 3D VR Mode', d: 'Immersive 3D command tower view using Three.js & WebXR for VR headset training, simulating elevated base vantage points.', c: '06B6D4' },
  { p: 'PHASE 3 (PLANNED)', t: 'Multi-User Red-Teaming', d: 'WebSocket / WebRTC instructor console allowing live adversary piloting of drone swarms against trainees in real-time.', c: '8B5CF6' },
  { p: 'PHASE 4 (FUTURE)', t: 'Field Hardware Feed Ingest', d: 'Integration with real-world ASTERIX Cat 048/062 radar protocol feeds and thermal RTSP camera streams for operational C2.', c: 'F59E0B' }
];

let rmX = 0.55;
roadmap.forEach(rm => {
  slide4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: rmX, y: 5.92, w: 2.95, h: 0.88,
    fill: { color: '1E293B' }, line: { color: rm.c, width: 1.5 }, rectRadius: 0.08
  });
  slide4.addText([
    { text: `${rm.p}: ${rm.t}\n`, options: { bold: true, fontSize: 7.8, color: rm.c } },
    { text: rm.d, options: { fontSize: 6.6, color: 'CBD5E1' } }
  ], {
    x: rmX + 0.06, y: 5.95, w: 2.83, h: 0.82,
    valign: 'middle', lineSpacingMultiple: 1.1
  });
  rmX += 3.1;
});


// ==========================================
// SLIDE 5: IMPACTS & BENEFITS
// ==========================================
const slide5 = pptx.addSlide();
slide5.background = { color: 'F8FAFC' };
addSIHHeader(slide5, 'IMPACTS & BENEFITS', 5);

// Subtitle
slide5.addText('Transforming unit-level soldier readiness against asymmetric drone and swarm warfare', {
  x: 0.5, y: 0.92, w: 12.33, h: 0.32,
  fontSize: 11.5, italic: true, bold: true, color: C.primaryBlue, align: 'center'
});

// 3 Impact Cards (Top row)
const impacts = [
  {
    num: '1', title: 'National Defence & Frontline Security',
    color: C.redCoral, bg: 'FFF1F2', border: 'FDA4AF',
    text: '• Rapidly instills instinctual detection, classification, and engagement discipline against loitering munitions, FPVs, and swarms.\n• Mitigates catastrophic fratricide risks through strict transponder cross-verification drills.\n• Enforces base alarm discipline, cutting personnel and infrastructure damage by 50% during perimeter breaches.'
  },
  {
    num: '2', title: 'Cost-Effective Mass Unit Training',
    color: C.purple, bg: 'F5F3FF', border: 'DDD6FE',
    text: '• Replaces multi-crore specialized defense simulator hardware with zero-cost software deployable across standard unit laptops.\n• Eliminates recurring logistical expenses, battery consumption, and safety hazards of flying live drones for daily drills.\n• Enables routine, continuous operator qualification at the company and platoon level.'
  },
  {
    num: '3', title: 'Objective Command Visibility & Auditing',
    color: C.cyan, bg: 'ECFEFF', border: 'A5F3FC',
    text: '• Unit Readiness Index provides commanding officers with data-driven insight into individual and squad competency.\n• Aggregates recurring mistake categories (e.g. jammer spamming, late detection) for targeted remedial training.\n• Standardized military-grade AAR PDF dossiers provide verifiable evidence of mission qualification.'
  }
];

let impX = 0.5;
impacts.forEach(imp => {
  slide5.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: impX, y: 1.3, w: 3.95, h: 2.35,
    fill: { color: imp.bg }, line: { color: imp.border, width: 1.5 }, rectRadius: 0.08
  });

  // Number circle
  slide5.addShape(pptx.shapes.OVAL, {
    x: impX + 0.15, y: 1.42, w: 0.4, h: 0.4,
    fill: { color: imp.color }
  });
  slide5.addText(imp.num, {
    x: impX + 0.15, y: 1.42, w: 0.4, h: 0.4,
    fontSize: 12, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
  });

  slide5.addText(imp.title, {
    x: impX + 0.65, y: 1.4, w: 3.15, h: 0.45,
    fontSize: 10.5, bold: true, color: imp.color, valign: 'middle'
  });

  slide5.addText(imp.text, {
    x: impX + 0.15, y: 1.95, w: 3.65, h: 1.6,
    fontSize: 8.2, color: C.textDark, lineSpacingMultiple: 1.15
  });

  impX += 4.19;
});

// Section Header: KEY BENEFITS
slide5.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 5.25, y: 3.75, w: 2.8, h: 0.35,
  fill: { color: '0F172A' }, rectRadius: 0.08
});
slide5.addText('KEY BENEFITS', {
  x: 5.25, y: 3.75, w: 2.8, h: 0.35,
  fontSize: 10.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
});

// 3 Key Benefits Columns (Bottom)
const keyBenefits = [
  {
    title: 'TACTICAL READINESS',
    barColor: C.amber, bg: 'FFFBEB',
    points: [
      'Prepares soldiers for complex asymmetric threats (autonomous, kamikaze, swarms, recon).',
      'Trains multi-sensor coordination: radar sweep, RF frequency matching, optical slewing, acoustic range.',
      'Instills weapon selection discipline: RF jammer vs. soft-kill spoofing vs. kinetic interceptors.',
      'Enforces base alarm sounding discipline to protect base personnel during incoming strikes.'
    ]
  },
  {
    title: 'SECURITY & TRUST',
    barColor: C.redCoral, bg: 'FFF1F2',
    points: [
      'Rigorous 5-dimension scoring rubric with heavy penalties for friendly fratricide and civilian collateral damage.',
      'Node-by-node decision tree explainability: every pass/fail verdict is fully auditable and justified.',
      'Dual-engine AI feedback: rule-based operational advice + optional LLM military instructor analysis.',
      'Tamper-proof local session logging with full action chronological history.'
    ]
  },
  {
    title: 'ACCESSIBLE RESEARCH & DEPLOYMENT',
    barColor: C.emerald, bg: 'ECFDF5',
    points: [
      '100% offline client-side React architecture: operates securely in classified air-gapped military networks.',
      'Deterministic Mulberry32 seed sharing enables synchronized, standardized platoon competitions.',
      'Modular architecture allows seamless integration of new drone behavior algorithms and sensors.',
      'Automated military-grade After-Action Report (PDF) generation for training dossiers.'
    ]
  }
];

let kbX = 0.5;
keyBenefits.forEach(kb => {
  slide5.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: kbX, y: 4.18, w: 3.95, h: 2.7,
    fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
  });
  slide5.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: kbX, y: 4.18, w: 3.95, h: 0.34,
    fill: { color: kb.barColor }, rectRadius: 0.08
  });
  slide5.addText(kb.title, {
    x: kbX + 0.1, y: 4.18, w: 3.75, h: 0.34,
    fontSize: 9.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
  });

  let ptY = 4.58;
  kb.points.forEach(pt => {
    slide5.addText(`• ${pt}`, {
      x: kbX + 0.15, y: ptY, w: 3.65, h: 0.48,
      fontSize: 8.2, color: C.textDark, lineSpacingMultiple: 1.15
    });
    ptY += 0.52;
  });

  kbX += 4.19;
});


// ==========================================
// SLIDE 6: RESEARCH AND REFERENCES
// ==========================================
const slide6 = pptx.addSlide();
slide6.background = { color: 'F8FAFC' };
addSIHHeader(slide6, 'RESEARCH AND REFERENCES', 6);

// Left Side: Competitive Advantage Matrix Table
slide6.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 0.95, w: 7.8, h: 4.45,
  fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
});
slide6.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 0.95, w: 7.8, h: 0.34,
  fill: { color: '0F172A' }, rectRadius: 0.08
});
slide6.addText('COMPETITIVE ADVANTAGE MATRIX', {
  x: 0.65, y: 0.95, w: 7.5, h: 0.34,
  fontSize: 9.5, bold: true, color: 'FFFFFF', valign: 'middle'
});

// Table definition
const tableData = [
  [
    { text: 'Evaluation Criterion', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF', fontSize: 7.2 } },
    { text: 'Traditional Field Drills', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF', fontSize: 7.2 } },
    { text: 'Proprietary Simulators', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF', fontSize: 7.2 } },
    { text: 'Commercial COTS Games', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF', fontSize: 7.2 } },
    { text: 'OUR C-UAS TRAINER', options: { bold: true, fill: { color: '059669' }, color: 'FFFFFF', fontSize: 7.2 } }
  ],
  [
    { text: 'Hardware Footprint', options: { bold: true, fontSize: 6.8 } },
    { text: 'Physical Drones & Jammers', options: { fontSize: 6.6 } },
    { text: 'Dedicated Cockpits/C2 Racks', options: { fontSize: 6.6 } },
    { text: 'High-End Gaming Rig', options: { fontSize: 6.6 } },
    { text: 'Zero HW: Standard Laptop', options: { bold: true, color: '059669', fontSize: 6.8 } }
  ],
  [
    { text: 'Unit Cost & Scalability', options: { bold: true, fontSize: 6.8 } },
    { text: 'Extremely High (Fuel/Ammo)', options: { fontSize: 6.6 } },
    { text: '₹50 Lakhs - ₹2 Cr per unit', options: { fontSize: 6.6 } },
    { text: 'Moderate License Fees', options: { fontSize: 6.6 } },
    { text: 'Zero-Cost Mass Scalability', options: { bold: true, color: '059669', fontSize: 6.8 } }
  ],
  [
    { text: 'Threat Diversity', options: { bold: true, fontSize: 6.8 } },
    { text: '1-2 Drones at a time', options: { fontSize: 6.6 } },
    { text: 'Scripted Air Targets', options: { fontSize: 6.6 } },
    { text: 'Non-military / arcade physics', options: { fontSize: 6.6 } },
    { text: '6 Classes: Swarm, Auto, FPV', options: { bold: true, color: '059669', fontSize: 6.8 } }
  ],
  [
    { text: 'RoE Decision Tree Audit', options: { bold: true, fontSize: 6.8 } },
    { text: 'Subjective human observer', options: { fontSize: 6.6 } },
    { text: 'Basic pass/fail score', options: { fontSize: 6.6 } },
    { text: 'None (Hitpoints only)', options: { fontSize: 6.6 } },
    { text: 'Granular node-by-node pass/fail', options: { bold: true, color: '059669', fontSize: 6.8 } }
  ],
  [
    { text: 'Multi-Sensor Fusion', options: { bold: true, fontSize: 6.8 } },
    { text: 'Live physical sensors', options: { fontSize: 6.6 } },
    { text: 'High-fidelity hardware links', options: { fontSize: 6.6 } },
    { text: 'Single radar minimap', options: { fontSize: 6.6 } },
    { text: '4 Sensors: Radar, EO, RF, Mic', options: { bold: true, color: '059669', fontSize: 6.8 } }
  ],
  [
    { text: 'Telemetry & Replay', options: { bold: true, fontSize: 6.8 } },
    { text: 'Video recording only', options: { fontSize: 6.6 } },
    { text: 'Fixed proprietary replay', options: { fontSize: 6.6 } },
    { text: 'Simple screen playback', options: { fontSize: 6.6 } },
    { text: '4Hz Scrubbable Ground-Truth', options: { bold: true, color: '059669', fontSize: 6.8 } }
  ],
  [
    { text: 'Adaptive Remediation', options: { bold: true, fontSize: 6.8 } },
    { text: 'Manual instructor tuning', options: { fontSize: 6.6 } },
    { text: 'Static syllabus', options: { fontSize: 6.6 } },
    { text: 'Generic difficulty slider', options: { fontSize: 6.6 } },
    { text: 'Rolling 5-Session Weakness AI', options: { bold: true, color: '059669', fontSize: 6.8 } }
  ],
  [
    { text: 'Offline Air-Gapped Use', options: { bold: true, fontSize: 6.8 } },
    { text: 'Field physical only', options: { fontSize: 6.6 } },
    { text: 'Facility-bound hardware', options: { fontSize: 6.6 } },
    { text: 'Often requires cloud DRM', options: { fontSize: 6.6 } },
    { text: '100% Offline Client-Side', options: { bold: true, color: '059669', fontSize: 6.8 } }
  ]
];

slide6.addTable(tableData, {
  x: 0.5, y: 1.32, w: 7.8, h: 4.05,
  colW: [1.7, 1.45, 1.5, 1.35, 1.8],
  border: { color: 'CBD5E1', width: 0.75 }
});

// Left Bottom: Project Resources
slide6.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 5.50, w: 7.8, h: 1.4,
  fill: { color: '0F172A' }, rectRadius: 0.08
});
slide6.addText('PROJECT RESOURCES & SPECIFICATIONS', {
  x: 0.65, y: 5.56, w: 7.5, h: 0.25,
  fontSize: 9.5, bold: true, color: '38BDF8', align: 'left'
});
slide6.addText([
  { text: '• Problem Statement: ', options: { bold: true, color: '38BDF8', fontSize: 8.2 } },
  { text: 'PS 26247 — AI-Enabled Drone & Counter-Drone Threat Simulation Trainer\n', options: { color: 'E2E8F0', fontSize: 8.2 } },
  { text: '• Local Simulation Build: ', options: { bold: true, color: '38BDF8', fontSize: 8.2 } },
  { text: 'http://localhost:5173 (React 19 + TypeScript + Vite 8.3)\n', options: { color: 'E2E8F0', fontSize: 8.2 } },
  { text: '• Deployment Footprint: ', options: { bold: true, color: '38BDF8', fontSize: 8.2 } },
  { text: 'Zero external runtime dependencies; operates completely standalone & offline.', options: { color: 'E2E8F0', fontSize: 8.2 } }
], {
  x: 0.65, y: 5.84, w: 7.5, h: 0.95
});

// Right Side: Research Papers & Doctrinal Standards
slide6.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 8.5, y: 0.95, w: 4.33, h: 5.95,
  fill: { color: 'FFFFFF' }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.08
});
slide6.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 8.5, y: 0.95, w: 4.33, h: 0.34,
  fill: { color: '0F172A' }, rectRadius: 0.08
});
slide6.addText('RESEARCH PAPERS & MILITARY REFERENCES', {
  x: 8.6, y: 0.95, w: 4.13, h: 0.34,
  fontSize: 9.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
});

const references = [
  {
    category: 'COUNTER-UAS DOCTRINE & STANDARDS',
    color: C.primaryBlue,
    refs: [
      '[1] Indian Army / MoD Technology Perspective and Capability Roadmap (Counter-UAS Systems, 2024)',
      '[2] NATO ATP-3.3.8.1 — Countering Unmanned Aircraft Systems Tactics, Techniques, and Procedures',
      '[3] US DoD Joint C-sUAS Office (JCO) Operational Requirements & Capability Framework (2024)'
    ]
  },
  {
    category: 'RADAR & SENSOR FUSION MODELING',
    color: C.purple,
    refs: [
      '[4] Skolnik, M. I., Introduction to Radar Systems, McGraw-Hill (Radar Cross Section & Swerling Models)',
      '[5] Bar-Shalom et al., Tracking and Data Fusion: A Tool for Engineers (Multi-Sensor Estimation)',
      '[6] EUROCONTROL ASTERIX Standard Cat 048/062 Surveillance Data Exchange (2023)'
    ]
  },
  {
    category: 'PROCEDURAL GENERATION & TACTICAL PEDAGOGY',
    color: C.redCoral,
    refs: [
      '[7] Mulberry32 32-bit Pseudo-Random Number Generator Algorithm Specification',
      '[8] Bloom\'s Revised Taxonomy for Military Simulation & Decision-Making Drills (2022)',
      '[9] Sweller, J., Cognitive Load Theory in Tactical Simulation and Emergency Decision Systems'
    ]
  }
];

let refY = 1.35;
references.forEach(rf => {
  slide6.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 8.62, y: refY, w: 4.09, h: 0.28,
    fill: { color: rf.color }, rectRadius: 0.06
  });
  slide6.addText(rf.category, {
    x: 8.65, y: refY, w: 4.03, h: 0.28,
    fontSize: 7.8, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
  });

  refY += 0.32;
  rf.refs.forEach(rText => {
    slide6.addText(rText, {
      x: 8.65, y: refY, w: 4.03, h: 0.42,
      fontSize: 7.0, color: C.textDark, lineSpacingMultiple: 1.08
    });
    refY += 0.44;
  });
  refY += 0.06;
});

// Save Presentation
const outputPathPrimary = path.join(__dirname, '..', 'AI_Drone_CounterDrone_Trainer_PS26247.pptx');
const outputPathV2 = path.join(__dirname, '..', 'AI_Drone_CounterDrone_Trainer_PS26247_v2.pptx');

pptx.writeFile({ fileName: outputPathPrimary })
  .then(fileName => {
    console.log(`Presentation generated successfully at: ${fileName}`);
  })
  .catch(err => {
    if (err.code === 'EBUSY') {
      console.warn('Primary file is currently locked (likely open in PowerPoint). Saving to v2...');
      return pptx.writeFile({ fileName: outputPathV2 }).then(f2 => {
        console.log(`Presentation generated successfully at: ${f2}`);
      });
    }
    console.error('Error generating presentation:', err);
  });
