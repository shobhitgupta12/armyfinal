/**
 * Adaptive Adversary System
 *
 * Analyses the trainee's recent action history and "learns" their habits.
 * It then mutates the upcoming wave configuration so the adversary exploits
 * the operator's weak spots.  The mutation is transparent and logged so it
 * can be shown in the debrief as "Adversary Adaptation".
 *
 * All logic is pure deterministic functions — no network, no runtime deps.
 */

import type { TraineeActionRecord, WaveConfig } from '../types';

// ── Habit fingerprint ────────────────────────────────────────────────────────

export interface AdversaryHabitProfile {
  /** fraction of engagements that were RF jams (0-1) */
  jamRate: number;
  /** fraction of engagements that were hard kills (0-1) */
  hardKillRate: number;
  /** fraction of engagements that were soft-kill / spoof (0-1) */
  softKillRate: number;
  /** seconds from first detection to first engage action (lower = faster) */
  avgReactionTimeSec: number;
  /** did the operator mostly neglect the alarm button? */
  alarmNeglect: boolean;
  /** total engagement count analysed */
  totalEngagements: number;
}

export interface AdversaryAdaptation {
  /** Human-readable explanation shown in the debrief / event log */
  explanation: string;
  /** The mutated wave config */
  mutatedWave: WaveConfig;
}

// ── Habit extraction ─────────────────────────────────────────────────────────

/**
 * Derives a habit profile from the trainee's action records so far this session
 * plus the last N historical sessions (optional — pass [] for in-session only).
 */
export function extractHabitProfile(
  actionRecords: TraineeActionRecord[]
): AdversaryHabitProfile {
  const engageActions = actionRecords.filter((a) => a.actionType === 'engage');
  const total = engageActions.length;

  if (total === 0) {
    return {
      jamRate: 0,
      hardKillRate: 0,
      softKillRate: 0,
      avgReactionTimeSec: 999,
      alarmNeglect: true,
      totalEngagements: 0,
    };
  }

  const jamCount = engageActions.filter((a) => a.payload?.type === 'jam').length;
  const hardKillCount = engageActions.filter((a) => a.payload?.type === 'hard_kill').length;
  const softKillCount = engageActions.filter((a) => a.payload?.type === 'soft_kill').length;

  const alarmUsed = actionRecords.some((a) => a.actionType === 'alarm');

  // Approximate reaction time: earliest engage timestamp (proxy for speed)
  const firstEngage = engageActions[0]?.timestamp ?? 0;
  // Reaction time is just the timestamp of first action; lower = faster
  const avgReactionTimeSec = firstEngage;

  return {
    jamRate: jamCount / total,
    hardKillRate: hardKillCount / total,
    softKillRate: softKillCount / total,
    avgReactionTimeSec,
    alarmNeglect: !alarmUsed,
    totalEngagements: total,
  };
}

// ── Mutation logic ───────────────────────────────────────────────────────────

/**
 * Given a habit profile and a base wave config, returns a mutated wave that
 * the adversary has adapted to counter the operator's favoured tactics.
 *
 * Priority of adaptations (first matching rule wins):
 *  1. Heavy jammer → switch to autonomous / fiber-optic drones (immune to jam)
 *  2. Slow reactor  → increase approach speed
 *  3. Hard-kill spammer → spawn more drones (overwhelm ammo)
 *  4. Soft-kill heavy  → fly higher (out of spoof range), add RF jitter
 *  5. Alarm neglecter  → stagger wave arrival so alarm window is missed
 */
export function computeAdversaryAdaptation(
  baseWave: WaveConfig,
  habit: AdversaryHabitProfile
): AdversaryAdaptation {
  // Clone to avoid mutating the original scenario
  const mutated: WaveConfig = { ...baseWave };
  const reasons: string[] = [];

  // Need at least a few data points to adapt
  if (habit.totalEngagements < 2) {
    return {
      explanation: 'Insufficient engagement history for adversary to adapt tactics.',
      mutatedWave: baseWave,
    };
  }

  // Rule 1: Operator relies on RF jamming → make drones autonomous
  if (habit.jamRate >= 0.5 && !mutated.isAutonomous) {
    mutated.isAutonomous = true;
    reasons.push(
      `ADVERSARY LEARNS: Operator jamming rate ${Math.round(habit.jamRate * 100)}% detected. ` +
      `Next wave switches to autonomous fiber-optic guidance — RF jammer is ineffective.`
    );
  }

  // Rule 2: Slow reaction time → faster drones
  if (habit.avgReactionTimeSec > 20) {
    const speedBoost = Math.min(10, Math.round((habit.avgReactionTimeSec - 20) * 0.3));
    if (speedBoost > 0) {
      mutated.speed = (mutated.speed ?? 30) + speedBoost;
      reasons.push(
        `ADVERSARY LEARNS: Operator reaction delay ${Math.round(habit.avgReactionTimeSec)}s detected. ` +
        `Next wave approach speed increased +${speedBoost} m/s.`
      );
    }
  }

  // Rule 3: Hard-kill spammer (ammo drain) → spawn more drones
  if (habit.hardKillRate >= 0.6) {
    const extra = Math.min(4, Math.round(habit.hardKillRate * 4));
    mutated.count = (mutated.count ?? 1) + extra;
    reasons.push(
      `ADVERSARY LEARNS: Operator uses ${Math.round(habit.hardKillRate * 100)}% hard-kills. ` +
      `Next wave adds ${extra} extra drones to saturate interceptor ammo.`
    );
  }

  // Rule 4: Alarm neglected → tighten wave stagger to deny alarm window
  if (habit.alarmNeglect && mutated.startTime > 5) {
    mutated.startTime = Math.max(2, mutated.startTime - 3);
    reasons.push(
      `ADVERSARY LEARNS: Operator consistently delays alarm. ` +
      `Next wave spawns 3 s earlier to deny cover reaction window.`
    );
  }

  const explanation =
    reasons.length > 0
      ? reasons.join('\n')
      : 'No dominant habit pattern detected — adversary maintains baseline tactics.';

  return { explanation, mutatedWave: mutated };
}

// ── Wave-level helper used by the engine ─────────────────────────────────────

/**
 * Patch a specific wave (by index) in the waves array.
 * Called by the engine when that wave's spawn window opens.
 */
export function patchWaveWithAdversaryAdaptation(
  waves: WaveConfig[],
  actionRecords: TraineeActionRecord[],
  waveIdx: number
): { patchedWaves: WaveConfig[]; adaptationLog: string } {
  if (waves.length === 0 || waveIdx < 0 || waveIdx >= waves.length) {
    return { patchedWaves: waves, adaptationLog: '' };
  }

  const habit = extractHabitProfile(actionRecords);
  const { explanation, mutatedWave } = computeAdversaryAdaptation(waves[waveIdx], habit);

  const patchedWaves = [...waves];
  patchedWaves[waveIdx] = mutatedWave;

  return { patchedWaves, adaptationLog: explanation };
}
