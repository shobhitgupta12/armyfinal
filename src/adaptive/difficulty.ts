import type { SessionResult } from '../types';

export interface AdaptiveRecommendation {
  nextDifficulty: number; // 1-10
  targetWeakness: 'detection' | 'classification' | 'engagement' | 'efficiency' | 'none';
  explanation: string;
}

export function computeAdaptiveDifficulty(
  recentSessions: SessionResult[],
  currentDifficulty: number
): AdaptiveRecommendation {
  if (recentSessions.length === 0) {
    return {
      nextDifficulty: currentDifficulty,
      targetWeakness: 'none',
      explanation: 'Initial baseline training assessment. Recommended starting difficulty: Level 3.',
    };
  }

  // Calculate rolling average score over last 5 sessions
  const lastSessions = recentSessions.slice(-5);
  const avgScore = lastSessions.reduce((acc, s) => acc + s.finalScore, 0) / lastSessions.length;

  const avgDet = lastSessions.reduce((acc, s) => acc + s.subScores.detection, 0) / lastSessions.length;
  const avgCls = lastSessions.reduce((acc, s) => acc + s.subScores.classification, 0) / lastSessions.length;
  const avgEng = lastSessions.reduce((acc, s) => acc + s.subScores.engagement, 0) / lastSessions.length;
  const avgEff = lastSessions.reduce((acc, s) => acc + s.subScores.efficiency, 0) / lastSessions.length;

  // Identify weakest sub-skill
  const skills = [
    { name: 'detection' as const, val: avgDet },
    { name: 'classification' as const, val: avgCls },
    { name: 'engagement' as const, val: avgEng },
    { name: 'efficiency' as const, val: avgEff },
  ].sort((a, b) => a.val - b.val);

  const weakest = skills[0];

  if (avgScore > 80) {
    const nextDiff = Math.min(10, currentDifficulty + 1);
    return {
      nextDifficulty: nextDiff,
      targetWeakness: weakest.name,
      explanation: `HIGH PERFORMANCE (${Math.round(avgScore)}% avg). Difficulty increased to Level ${nextDiff}. Adding faster attack vectors, larger swarm density, and adverse fog/night conditions.`,
    };
  } else if (avgScore >= 50) {
    return {
      nextDifficulty: currentDifficulty,
      targetWeakness: weakest.name,
      explanation: `STABLE PERFORMANCE (${Math.round(avgScore)}% avg). Maintaining Difficulty Level ${currentDifficulty}, but tailoring scenario to strengthen your weakest area: [${weakest.name.toUpperCase()}].`,
    };
  } else {
    const nextDiff = Math.max(1, currentDifficulty - 1);
    return {
      nextDifficulty: nextDiff,
      targetWeakness: weakest.name,
      explanation: `REMEDIAL ADAPTATION (${Math.round(avgScore)}% avg). Difficulty reduced to Level ${nextDiff}. Lowering drone approach speeds, enabling tactical hints, and simplifying air space clutter.`,
    };
  }
}
