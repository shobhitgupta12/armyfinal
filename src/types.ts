export type EntityType =
    | 'hostile_recon'
    | 'hostile_attack'
    | 'hostile_swarm'
    | 'friendly'
    | 'civilian'
    | 'bird'
    | 'aircraft';

export type UserClassification =
    | 'hostile_attack'
    | 'hostile_recon'
    | 'swarm'
    | 'friendly'
    | 'civilian'
    | 'bird'
    | 'unknown';

export type BehaviorPattern =
    | 'direct_attack'
    | 'loiter_recon'
    | 'circling'
    | 'erratic'
    | 'formation'
    | 'passing';

export type TimeOfDay = 'day' | 'night';
export type WeatherCondition = 'clear' | 'fog' | 'rain';
export type TerrainType = 'urban' | 'rural' | 'mountain';

export type SensorType = 'radar' | 'eo_ir' | 'rf' | 'acoustic';

export type EngagementType = 'ignore' | 'alert' | 'jam' | 'soft_kill' | 'hard_kill';

export interface EntityState {
    id: string;
    trackId: string;
    trueType: EntityType;
    swarmId?: string;
    x: number; // meters relative to asset at (0,0)
    y: number;
    altitude: number; // meters AGL
    vx: number;
    vy: number;
    speed: number; // m/s
    heading: number; // degrees 0-360
    rcs: number; // dBSM equivalent (e.g. bird 0.01, drone 0.05, aircraft 5.0)
    iffStatus: 'valid' | 'faulty' | 'none';
    behavior: BehaviorPattern;
    isRFActive: boolean; // control-link transmitting
    isAutonomous: boolean; // immune to jammer
    spawnTime: number; // seconds
    active: boolean;
    status: 'active' | 'jammed' | 'spoofed' | 'destroyed' | 'escaped' | 'impacted';
    impactTime?: number;
    waypointIndex?: number;
    waypoints?: Array<{ x: number; y: number }>;
}

export interface TrackSensorData {
    trackId: string;
    detectedBy: SensorType[];
    estimatedX: number;
    estimatedY: number;
    estimatedDistance: number;
    estimatedBearing: number; // degrees
    estimatedSpeed: number;
    estimatedAltitude: number;
    estimatedRCS: number;
    rfSignal?: {
        frequency: '2.4 GHz' | '5.8 GHz' | 'SATCOM';
        bearing: number;
        signalStrength: number; // 0-100
    };
    iffDisplay: 'FRIENDLY_SQUAWK' | 'UNKNOWN' | 'NO_RESPONSE';
    eoVisualConfidence: number; // 0-1
    acousticConfidence: number; // 0-1
    firstDetectedTime: number | null;
    userAcknowledged: boolean;
    userAcknowledgedTime: number | null;
    userClassification: UserClassification;
    userConfidence: 'low' | 'med' | 'high';
    lastAction?: EngagementType;
    lastActionTime?: number;
}

export interface WaveConfig {
    startTime: number; // seconds
    count: number;
    type: EntityType;
    behavior: BehaviorPattern;
    spawnRange: number; // meters from asset (e.g. 2500 - 3500)
    speed?: number;
    isAutonomous?: boolean;
    iffStatus?: 'valid' | 'faulty' | 'none';
}

export interface ScenarioConfig {
    id: string;
    name: string;
    description: string;
    seed: number;
    difficulty: number; // 1-10
    environment: {
        time: TimeOfDay;
        weather: WeatherCondition;
        terrain: TerrainType;
    };
    sensorDegradation: {
        radarOutage: boolean;
        rfJitter: boolean;
        eoFogPenalty: number; // 0-1
        falseBlips: boolean;
    };
    waves: WaveConfig[];
    duration: number; // seconds
    hints?: string[];
}

export interface TraineeActionRecord {
    timestamp: number;
    actionType: 'detect' | 'classify' | 'engage' | 'alarm' | 'sensor_toggle';
    trackId: string;
    payload: any;
}

export interface EntityReplayFrame {
    timestamp: number;
    entities: Array<{
        id: string;
        trackId: string;
        x: number;
        y: number;
        altitude: number;
        trueType: EntityType;
        status: string;
    }>;
}

export interface DecisionNodeResult {
    id: string;
    title: string;
    passed: boolean;
    scoreDelta: number;
    reason: string;
}

export interface EntityEvaluation {
    entityId: string;
    trackId: string;
    trueType: EntityType;
    userClassification: UserClassification;
    detectionTime: number | null; // seconds to detect since visible
    detectionScore: number; // 0-100
    classificationScore: number; // 0-100
    engagementScore: number; // 0-100
    decisionNodes: DecisionNodeResult[];
    verdict: 'PASS' | 'PARTIAL' | 'FAIL';
}

export interface SessionResult {
    id: string;
    traineeName: string;
    unitName: string;
    scenarioId: string;
    scenarioName: string;
    seed: number;
    difficulty: number;
    timestamp: string; // ISO String
    duration: number; // total mission seconds
    finalScore: number; // 0-100
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
    subScores: {
        detection: number;
        classification: number;
        engagement: number;
        efficiency: number;
    };
    assetHealthRemaining: number; // 0-100
    ammoUsed: number;
    ammoTotal: number;
    jammerUses: number;
    fratricides: number;
    collateralIncidents: number;
    missedHostiles: number;
    entityEvaluations: EntityEvaluation[];
    mistakeCategories: string[];
    aiDebriefFeedback: string[];
    replayFrames: EntityReplayFrame[];
    actionRecords: TraineeActionRecord[];
}

export interface TraineeProfile {
    name: string;
    unit: string;
    sessionsCount: number;
    avgScore: number;
    topScore: number;
    skillProfile: {
        detection: number;
        classification: number;
        engagement: number;
        efficiency: number;
    };
    currentDifficulty: number;
}
