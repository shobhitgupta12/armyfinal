/**
 * Trainee Skill Model — Bayesian Knowledge Tracing (BKT)
 *
 * Classic 4-parameter BKT for each of the four sub-skills:
 *   detection | classification | engagement | efficiency
 *
 * Parameters (empirically calibrated for C-UAS training):
 *   P(L0)  – prior probability of knowing the skill before training
 *   P(T)   – probability of learning (transitioning from unknown → known)
 *   P(S)   – probability of a "slip" (knowing but performing wrong)
 *   P(G)   – probability of a "guess" (not knowing but performing correctly)
 *
 * After each session the model updates P(Ln) (posterior mastery)
 * and can recommend which skill scenario to focus on next.
 *
 * References:
 *   Corbett & Anderson (1994) – Knowledge Tracing: Modeling the Acquisition
 *   of Procedural Knowledge. UIST.
 */

import type { SessionResult } from '../types';

// ── BKT Parameters ───────────────────────────────────────────────────────────

export type SkillName = 'detection' | 'classification' | 'engagement' | 'efficiency';

interface BKTParams {
  pL0: number; // prior mastery
  pT: number;  // learning rate
  pS: number;  // slip probability
  pG: number;  // guess probability
}

// Calibrated defaults for each skill domain
const DEFAULT_PARAMS: Record<SkillName, BKTParams> = {
  detection: { pL0: 0.35, pT: 0.12, pS: 0.08, pG: 0.20 },
  classification: { pL0: 0.30, pT: 0.10, pS: 0.12, pG: 0.15 },
  engagement: { pL0: 0.25, pT: 0.10, pS: 0.10, pG: 0.18 },
  efficiency: { pL0: 0.30, pT: 0.08, pS: 0.10, pG: 0.15 },
};

// ── State ─────────────────────────────────────────────────────────────────────

export interface SkillMastery {
  skillName: SkillName;
  /** Current posterior P(Ln) — probability trainee has mastered this skill */
  pMastery: number;
  /** Raw sub-score from last session (0-100) */
  lastScore: number;
  /** Number of BKT update steps performed */
  observations: number;
}

export interface SkillModelState {
  skills: Record<SkillName, SkillMastery>;
  /** Which skill has the lowest mastery — recommended focus */
  recommendedFocus: SkillName;
  /** Human-readable rationale for scenario selection */
  focusRationale: string;
}

// ── BKT Core Math ─────────────────────────────────────────────────────────────

/**
 * P(correct | mastery=known) = 1 - P(slip)
 * P(correct | mastery=unknown) = P(guess)
 */
function pCorrectGiven(pMastery: number, params: BKTParams): number {
  return pMastery * (1 - params.pS) + (1 - pMastery) * params.pG;
}

/**
 * Bayesian update after observing a correct (isCorrect=true) or
 * incorrect (isCorrect=false) response.
 *
 * P(Ln | obs) = P(obs | known) * P(Ln-1) / P(obs)
 */
function bktUpdate(pMastery: number, isCorrect: boolean, params: BKTParams): number {
  const pObs = pCorrectGiven(pMastery, params);
  if (pObs === 0) return pMastery;

  // Posterior after observation
  let pMasteryGivenObs: number;
  if (isCorrect) {
    pMasteryGivenObs =
      ((1 - params.pS) * pMastery) / pObs;
  } else {
    pMasteryGivenObs =
      (params.pS * pMastery) / (1 - pObs);
  }

  // Apply learning (transition) — chance of moving from unknown to known
  const posterior = pMasteryGivenObs + (1 - pMasteryGivenObs) * params.pT;
  return Math.min(0.99, Math.max(0.01, posterior));
}

// ── Observation mapping ───────────────────────────────────────────────────────

/**
 * Convert a raw sub-score (0-100) into a binary correct/incorrect observation.
 */
function scoreToObservation(score: number, threshold = 70): boolean {
  return score >= threshold;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialise a blank skill model state using BKT priors.
 */
export function createSkillModelState(): SkillModelState {
  const skills = {} as Record<SkillName, SkillMastery>;

  (Object.keys(DEFAULT_PARAMS) as SkillName[]).forEach((skill) => {
    skills[skill] = {
      skillName: skill,
      pMastery: DEFAULT_PARAMS[skill].pL0,
      lastScore: 0,
      observations: 0,
    };
  });

  return {
    skills,
    recommendedFocus: 'detection',
    focusRationale: 'Initial assessment — starting with detection fundamentals.',
  };
}

/**
 * Update the skill model with results from a completed session.
 * Returns the new state and the recommended scenario focus.
 */
export function updateSkillModel(
  state: SkillModelState,
  session: SessionResult
): SkillModelState {
  const updatedSkills = { ...state.skills };

  const skillScores: Record<SkillName, number> = {
    detection: session.subScores.detection,
    classification: session.subScores.classification,
    engagement: session.subScores.engagement,
    efficiency: session.subScores.efficiency,
  };

  (Object.keys(skillScores) as SkillName[]).forEach((skill) => {
    const score = skillScores[skill];
    const isCorrect = scoreToObservation(score);
    const params = DEFAULT_PARAMS[skill];
    const current = updatedSkills[skill];

    const newPMastery = bktUpdate(current.pMastery, isCorrect, params);

    updatedSkills[skill] = {
      skillName: skill,
      pMastery: newPMastery,
      lastScore: score,
      observations: current.observations + 1,
    };
  });

  // Find the weakest skill (lowest mastery probability)
  const sorted = (Object.values(updatedSkills) as SkillMastery[]).sort(
    (a, b) => a.pMastery - b.pMastery
  );
  const weakest = sorted[0];
  const recommendedFocus = weakest.skillName;

  const masteryPct = Math.round(weakest.pMastery * 100);
  const focusRationale =
    `BKT model estimates ${masteryPct}% mastery of [${recommendedFocus.toUpperCase()}]. ` +
    `Next scenario will emphasise ${recommendedFocus} challenges to close the knowledge gap.`;

  return {
    skills: updatedSkills,
    recommendedFocus,
    focusRationale,
  };
}

/**
 * Reconstruct a skill model state by replaying all historical sessions
 * in chronological order from oldest to newest.
 */
export function buildSkillModelFromHistory(sessions: SessionResult[]): SkillModelState {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let state = createSkillModelState();
  for (const session of sorted) {
    state = updateSkillModel(state, session);
  }
  return state;
}

/**
 * Returns a scenario bias object — which entity types and conditions should
 * be emphasised in the next generated scenario based on the weakest skill.
 */
export interface ScenarioBias {
  /** Force-spawn entity types to stress the weak skill */
  forceTypes: Array<'hostile_attack' | 'hostile_recon' | 'hostile_swarm' | 'friendly' | 'civilian' | 'bird'>;
  /** Override difficulty up or down */
  difficultyAdjust: number; // ±1-2
  /** Extra scenario hints to surface in the HUD */
  hints: string[];
}

export function getScenarioBias(state: SkillModelState): ScenarioBias {
  switch (state.recommendedFocus) {
    case 'detection':
      return {
        forceTypes: ['hostile_recon', 'civilian'],
        difficultyAdjust: 0,
        hints: [
          'Keep radar AND RF sensors active at all times.',
          'Acknowledge every new track within 5 s of detection.',
        ],
      };
    case 'classification':
      return {
        forceTypes: ['bird', 'civilian', 'friendly'],
        difficultyAdjust: 0,
        hints: [
          'Check RCS, altitude, and IFF before classifying.',
          'Slew EO/IR camera to visually confirm IFF squawk anomalies.',
        ],
      };
    case 'engagement':
      return {
        forceTypes: ['hostile_attack', 'hostile_swarm'],
        difficultyAdjust: 1,
        hints: [
          'Match countermeasure to threat type: RF link → Jam, Autonomous → Hard-Kill.',
          'Sound alarm before first hard-kill to cut impact damage.',
        ],
      };
    case 'efficiency':
      return {
        forceTypes: ['hostile_swarm', 'hostile_attack'],
        difficultyAdjust: 1,
        hints: [
          'Reserve hard-kill interceptors for autonomous threats only.',
          'Jam or spoof RF-linked drones before spending ammo.',
        ],
      };
    default:
      return { forceTypes: [], difficultyAdjust: 0, hints: [] };
  }
}

// ── Persistence helpers ───────────────────────────────────────────────────────

const STORAGE_KEY = 'cuas_skill_model';

export function loadSkillModel(): SkillModelState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SkillModelState;
  } catch (_) {}
  return null;
}

export function saveSkillModel(state: SkillModelState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}
