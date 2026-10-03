import type { SessionResult, TraineeProfile } from '../types';
import { generateFeedback } from '../ai/instructor';

const STORAGE_KEYS = {
  CURRENT_USER: 'cuas_current_user',
  SESSIONS: 'cuas_session_history',
  PROFILES: 'cuas_trainee_profiles',
  API_KEY: 'cuas_llm_api_key',
};

export interface CurrentUser {
  name: string;
  unit: string;
}

export const INITIAL_TRAINEES: TraineeProfile[] = [
  {
    name: 'SGT. Vance Miller',
    unit: 'Alpha Squad 1st Platoon',
    sessionsCount: 4,
    avgScore: 89,
    topScore: 96,
    skillProfile: { detection: 92, classification: 88, engagement: 90, efficiency: 86 },
    currentDifficulty: 7,
  },
  {
    name: 'CPL. Maya Lin',
    unit: 'Alpha Squad 1st Platoon',
    sessionsCount: 3,
    avgScore: 82,
    topScore: 88,
    skillProfile: { detection: 85, classification: 84, engagement: 80, efficiency: 79 },
    currentDifficulty: 5,
  },
  {
    name: 'SPC. David Ross',
    unit: 'Alpha Squad 1st Platoon',
    sessionsCount: 3,
    avgScore: 68,
    topScore: 74,
    skillProfile: { detection: 70, classification: 62, engagement: 68, efficiency: 72 },
    currentDifficulty: 4,
  },
  {
    name: 'LT. Elena Rostova',
    unit: 'Bravo Battery 2nd Platoon',
    sessionsCount: 4,
    avgScore: 92,
    topScore: 98,
    skillProfile: { detection: 95, classification: 94, engagement: 90, efficiency: 89 },
    currentDifficulty: 8,
  },
  {
    name: 'PFC. Marcus Thorne',
    unit: 'Bravo Battery 2nd Platoon',
    sessionsCount: 3,
    avgScore: 54,
    topScore: 62,
    skillProfile: { detection: 58, classification: 50, engagement: 52, efficiency: 56 },
    currentDifficulty: 3,
  },
];

export function generateSeedSessions(): SessionResult[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const sampleConfigs = [
    { name: 'LT. Elena Rostova', unit: 'Bravo Battery 2nd Platoon', scenario: 'Urban Swarm Raid', seed: 404, diff: 7, score: 98, grade: 'S' as const, det: 98, cls: 96, eng: 98, eff: 94, assetH: 100, frats: 0, coll: 0, missed: 0, daysAgo: 1 },
    { name: 'SGT. Vance Miller', unit: 'Alpha Squad 1st Platoon', scenario: 'Friendly Fire Risk', seed: 505, diff: 8, score: 94, grade: 'S' as const, det: 95, cls: 92, eng: 94, eff: 90, assetH: 100, frats: 0, coll: 0, missed: 0, daysAgo: 2 },
    { name: 'SGT. Vance Miller', unit: 'Alpha Squad 1st Platoon', scenario: 'Urban Swarm Raid', seed: 404, diff: 7, score: 88, grade: 'A' as const, det: 90, cls: 86, eng: 88, eff: 85, assetH: 88, frats: 0, coll: 0, missed: 0, daysAgo: 3 },
    { name: 'CPL. Maya Lin', unit: 'Alpha Squad 1st Platoon', scenario: 'Bird & Decoy Confusion', seed: 303, diff: 5, score: 86, grade: 'A' as const, det: 88, cls: 84, eng: 86, eff: 82, assetH: 100, frats: 0, coll: 0, missed: 0, daysAgo: 2 },
    { name: 'LT. Elena Rostova', unit: 'Bravo Battery 2nd Platoon', scenario: 'Convoy Kamikaze', seed: 202, diff: 3, score: 92, grade: 'S' as const, det: 94, cls: 92, eng: 92, eff: 90, assetH: 100, frats: 0, coll: 0, missed: 0, daysAgo: 4 },
    { name: 'CPL. Maya Lin', unit: 'Alpha Squad 1st Platoon', scenario: 'Dawn Recon (Tutorial)', seed: 101, diff: 1, score: 78, grade: 'B' as const, det: 80, cls: 76, eng: 78, eff: 75, assetH: 75, frats: 0, coll: 1, missed: 0, daysAgo: 5 },
    { name: 'SPC. David Ross', unit: 'Alpha Squad 1st Platoon', scenario: 'Bird & Decoy Confusion', seed: 303, diff: 5, score: 72, grade: 'B' as const, det: 75, cls: 65, eng: 72, eff: 70, assetH: 75, frats: 0, coll: 1, missed: 1, daysAgo: 3 },
    { name: 'SPC. David Ross', unit: 'Alpha Squad 1st Platoon', scenario: 'Convoy Kamikaze', seed: 202, diff: 3, score: 64, grade: 'C' as const, det: 68, cls: 60, eng: 62, eff: 65, assetH: 50, frats: 0, coll: 0, missed: 1, daysAgo: 6 },
    { name: 'PFC. Marcus Thorne', unit: 'Bravo Battery 2nd Platoon', scenario: 'Friendly Fire Risk', seed: 505, diff: 8, score: 48, grade: 'D' as const, det: 55, cls: 42, eng: 45, eff: 50, assetH: 50, frats: 1, coll: 1, missed: 2, daysAgo: 2 },
    { name: 'PFC. Marcus Thorne', unit: 'Bravo Battery 2nd Platoon', scenario: 'Dawn Recon (Tutorial)', seed: 101, diff: 1, score: 60, grade: 'C' as const, det: 62, cls: 58, eng: 58, eff: 62, assetH: 75, frats: 0, coll: 0, missed: 1, daysAgo: 5 },
  ];

  return sampleConfigs.map((cfg, index) => {
    const timestamp = new Date(now - cfg.daysAgo * day - index * 3600000).toISOString();
    const session: SessionResult = {
      id: `seed-session-${index + 1}`,
      traineeName: cfg.name,
      unitName: cfg.unit,
      scenarioId: `scen-${cfg.seed}`,
      scenarioName: cfg.scenario,
      seed: cfg.seed,
      difficulty: cfg.diff,
      timestamp,
      duration: 110,
      finalScore: cfg.score,
      grade: cfg.grade,
      subScores: {
        detection: cfg.det,
        classification: cfg.cls,
        engagement: cfg.eng,
        efficiency: cfg.eff,
      },
      assetHealthRemaining: cfg.assetH,
      ammoUsed: 4,
      ammoTotal: 8,
      jammerUses: 2,
      fratricides: cfg.frats,
      collateralIncidents: cfg.coll,
      missedHostiles: cfg.missed,
      entityEvaluations: [],
      mistakeCategories: cfg.frats > 0 ? ['Engaged Friendly Asset (Fratricide)'] : cfg.coll > 0 ? ['Wasted Countermeasures on Decoys'] : cfg.missed > 0 ? ['Missed Hostile Attack Drones'] : [],
      aiDebriefFeedback: [],
      replayFrames: [],
      actionRecords: [],
    };
    session.aiDebriefFeedback = generateFeedback(session);
    return session;
  });
}

export const storageService = {
  getCurrentUser(): CurrentUser {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return { name: 'SGT. Vance Miller', unit: 'Alpha Squad 1st Platoon' };
  },

  setCurrentUser(user: CurrentUser): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  },

  getSessions(): SessionResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    // Initial Seed Data if empty
    const seed = generateSeedSessions();
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(seed));
    return seed;
  },

  saveSession(session: SessionResult): void {
    const sessions = this.getSessions();
    sessions.unshift(session);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

    // Update or create trainee profile
    this.updateTraineeProfile(session);
  },

  getProfiles(): TraineeProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(INITIAL_TRAINEES));
    return INITIAL_TRAINEES;
  },

  updateTraineeProfile(session: SessionResult): void {
    const profiles = this.getProfiles();
    let profile = profiles.find((p) => p.name === session.traineeName);

    if (!profile) {
      profile = {
        name: session.traineeName,
        unit: session.unitName,
        sessionsCount: 0,
        avgScore: session.finalScore,
        topScore: session.finalScore,
        skillProfile: { ...session.subScores },
        currentDifficulty: session.difficulty,
      };
      profiles.push(profile);
    }

    profile.sessionsCount += 1;
    profile.topScore = Math.max(profile.topScore, session.finalScore);

    // Compute rolling averages
    profile.avgScore = Math.round((profile.avgScore * (profile.sessionsCount - 1) + session.finalScore) / profile.sessionsCount);
    profile.skillProfile.detection = Math.round((profile.skillProfile.detection * (profile.sessionsCount - 1) + session.subScores.detection) / profile.sessionsCount);
    profile.skillProfile.classification = Math.round((profile.skillProfile.classification * (profile.sessionsCount - 1) + session.subScores.classification) / profile.sessionsCount);
    profile.skillProfile.engagement = Math.round((profile.skillProfile.engagement * (profile.sessionsCount - 1) + session.subScores.engagement) / profile.sessionsCount);
    profile.skillProfile.efficiency = Math.round((profile.skillProfile.efficiency * (profile.sessionsCount - 1) + session.subScores.efficiency) / profile.sessionsCount);

    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  },

  resetDemoData(): void {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.PROFILES);
    this.getSessions();
    this.getProfiles();
  },

  getLLMApiKey(): string {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },

  setLLMApiKey(key: string): void {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  },
};
