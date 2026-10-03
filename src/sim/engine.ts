import type {
  EntityState,
  TrackSensorData,
  ScenarioConfig,
  TraineeActionRecord,
  EntityReplayFrame,
  EngagementType,
  UserClassification,
} from '../types';
import { updateEntityPhysics } from './entities';
import {
  type SensorSystemState,
  createInitialSensorState,
  updateSensorData,
} from './sensors';

export interface SimulationState {
  simTime: number; // seconds
  isPaused: boolean;
  isCompleted: boolean;
  assetHealth: number; // 0-100
  ammoCount: number;
  maxAmmo: number;
  jammerCooldown: number; // seconds remaining
  alarmActive: boolean;
  entities: EntityState[];
  sensorState: SensorSystemState;
  tracks: Map<string, TrackSensorData>;
  selectedTrackId: string | null;
  actionRecords: TraineeActionRecord[];
  replayFrames: EntityReplayFrame[];
  lastReplayLogTime: number;
  scenario: ScenarioConfig;
  eventsLog: Array<{ id: string; time: number; text: string; type: 'info' | 'warn' | 'alert' | 'success' }>;
}

export function createSimulationEngine(scenario: ScenarioConfig): SimulationState {
  // Convert wave configs into initial entities list
  const entities: EntityState[] = [];
  let trackCounter = 100;

  scenario.waves.forEach((wave) => {
    for (let i = 0; i < wave.count; i++) {
      trackCounter++;
      const trackId = `TRK-${trackCounter}`;
      const entityId = `ENT-${wave.startTime}-${i}-${trackCounter}`;

      // Distribute spawn angle
      const angle = (360 / wave.count) * i + ((wave.startTime * 37) % 360);
      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * wave.spawnRange;
      const y = Math.sin(rad) * wave.spawnRange;

      let speed = wave.speed || (wave.type === 'hostile_attack' ? 32 : wave.type === 'hostile_recon' ? 15 : 24);
      let altitude = wave.type === 'bird' ? 35 : wave.type === 'aircraft' ? 850 : 90;
      let rcs = wave.type === 'bird' ? 0.008 : wave.type === 'aircraft' ? 5.0 : 0.05;

      const heading = (Math.atan2(-y, -x) * 180) / Math.PI;

      entities.push({
        id: entityId,
        trackId,
        trueType: wave.type,
        x,
        y,
        altitude,
        vx: Math.cos((heading * Math.PI) / 180) * speed,
        vy: Math.sin((heading * Math.PI) / 180) * speed,
        speed,
        heading: (heading + 360) % 360,
        rcs,
        iffStatus: wave.iffStatus || (wave.type === 'friendly' ? 'valid' : 'none'),
        behavior: wave.behavior,
        isRFActive: wave.isAutonomous ? false : wave.type !== 'bird',
        isAutonomous: wave.isAutonomous || false,
        spawnTime: wave.startTime,
        active: true,
        status: 'active',
      });
    }
  });

  return {
    simTime: 0,
    isPaused: false,
    isCompleted: false,
    assetHealth: 100,
    ammoCount: 8,
    maxAmmo: 8,
    jammerCooldown: 0,
    alarmActive: false,
    entities,
    sensorState: createInitialSensorState(),
    tracks: new Map<string, TrackSensorData>(),
    selectedTrackId: null,
    actionRecords: [],
    replayFrames: [],
    lastReplayLogTime: 0,
    scenario,
    eventsLog: [
      {
        id: 'evt-init',
        time: 0,
        text: `MISSION STARTED: ${scenario.name}. Defend central asset (0,0).`,
        type: 'info',
      },
    ],
  };
}

export function tickSimulation(
  state: SimulationState,
  deltaTime: number
): SimulationState {
  if (state.isPaused || state.isCompleted) return state;

  const simTime = state.simTime + deltaTime;

  // 1. Update Jammer Cooldown
  const jammerCooldown = Math.max(0, state.jammerCooldown - deltaTime);

  // 2. Active entities physics tick (only those spawned)
  let assetHealth = state.assetHealth;
  const eventsLog = [...state.eventsLog];

  const updatedEntities = state.entities.map((entity) => {
    if (simTime < entity.spawnTime) return entity; // Not spawned yet

    const updated = updateEntityPhysics(entity, deltaTime, simTime);

    // Check impact
    if (updated.status === 'impacted' && entity.status === 'active') {
      const damage = state.alarmActive ? 12.5 : 25.0; // reduced damage if alarm sounded
      assetHealth = Math.max(0, assetHealth - damage);
      eventsLog.push({
        id: `evt-impact-${updated.trackId}-${simTime}`,
        time: Math.round(simTime),
        text: `CRITICAL: ${updated.trackId} IMPACTED ASSET! (-${damage}% Asset Health)`,
        type: 'alert',
      });
    }

    return updated;
  });

  // 3. Sensor Sweep & Track Updates (for active entities spawned)
  const activeSpawnedEntities = updatedEntities.filter((e) => simTime >= e.spawnTime && e.active);
  const { updatedTracks, newSweepAngle } = updateSensorData(
    activeSpawnedEntities,
    state.tracks,
    state.sensorState,
    state.scenario,
    simTime,
    deltaTime
  );

  const sensorState = {
    ...state.sensorState,
    radarSweepAngle: newSweepAngle,
  };

  // Check new detected tracks to trigger events
  updatedTracks.forEach((track, trackId) => {
    if (!state.tracks.has(trackId)) {
      eventsLog.push({
        id: `evt-newtrack-${trackId}`,
        time: Math.round(simTime),
        text: `SENSOR ALERT: Target ${trackId} detected at ${track.estimatedDistance}m range.`,
        type: 'warn',
      });
    }
  });

  // 4. Record Replay Frame downsampled to ~4Hz (0.25s)
  let lastReplayLogTime = state.lastReplayLogTime;
  const replayFrames = [...state.replayFrames];
  if (simTime - lastReplayLogTime >= 0.25) {
    lastReplayLogTime = simTime;
    replayFrames.push({
      timestamp: Math.round(simTime * 100) / 100,
      entities: updatedEntities.map((e) => ({
        id: e.id,
        trackId: e.trackId,
        x: e.x,
        y: e.y,
        altitude: e.altitude,
        trueType: e.trueType,
        status: e.status,
      })),
    });
  }

  // 5. Check Completion Criteria
  const allSpawned = updatedEntities.every((e) => simTime >= e.spawnTime);
  const allResolved = updatedEntities.every((e) => !e.active || simTime < e.spawnTime);
  const isCompleted = assetHealth <= 0 || (allSpawned && allResolved) || simTime >= state.scenario.duration;

  if (isCompleted && !state.isCompleted) {
    eventsLog.push({
      id: `evt-complete-${simTime}`,
      time: Math.round(simTime),
      text: assetHealth <= 0 ? 'MISSION FAILED: Asset destroyed.' : 'MISSION COMPLETED: Threat window passed.',
      type: assetHealth <= 0 ? 'alert' : 'success',
    });
  }

  return {
    ...state,
    simTime,
    assetHealth,
    jammerCooldown,
    entities: updatedEntities,
    sensorState,
    tracks: updatedTracks,
    replayFrames,
    lastReplayLogTime,
    eventsLog,
    isCompleted,
  };
}

export function executeTraineeAction(
  state: SimulationState,
  actionType: 'detect' | 'classify' | 'engage' | 'alarm' | 'slew_camera',
  trackId: string | null,
  payload?: any
): SimulationState {
  const timestamp = state.simTime;
  const actionRecords = [...state.actionRecords];
  const eventsLog = [...state.eventsLog];
  const tracks = new Map(state.tracks);
  let jammerCooldown = state.jammerCooldown;
  let ammoCount = state.ammoCount;
  let alarmActive = state.alarmActive;
  let sensorState = { ...state.sensorState };
  let entities = [...state.entities];

  actionRecords.push({
    timestamp: Math.round(timestamp * 10) / 10,
    actionType: actionType as any,
    trackId: trackId || '',
    payload,
  });

  if (actionType === 'alarm') {
    alarmActive = true;
    eventsLog.push({
      id: `evt-alarm-${timestamp}`,
      time: Math.round(timestamp),
      text: `ALARM SOUNDED: Base defense personnel taking cover!`,
      type: 'warn',
    });
    return { ...state, alarmActive, actionRecords, eventsLog };
  }

  if (actionType === 'slew_camera' && payload?.bearing !== undefined) {
    sensorState.eoirSlewAngle = (payload.bearing + 360) % 360;
    eventsLog.push({
      id: `evt-slew-${timestamp}`,
      time: Math.round(timestamp),
      text: `EO/IR Camera slewed to bearing ${Math.round(sensorState.eoirSlewAngle)}°.`,
      type: 'info',
    });
    return { ...state, sensorState, actionRecords, eventsLog };
  }

  if (!trackId) return state;

  const track = tracks.get(trackId);
  const entity = entities.find((e) => e.trackId === trackId && e.active);

  if (!track || !entity) return state;

  switch (actionType) {
    case 'detect': {
      track.userAcknowledged = true;
      track.userAcknowledgedTime = timestamp;
      tracks.set(trackId, track);
      eventsLog.push({
        id: `evt-det-${trackId}-${timestamp}`,
        time: Math.round(timestamp),
        text: `TRACK ACKNOWLEDGED: ${trackId} logged at ${track.estimatedDistance}m.`,
        type: 'info',
      });
      break;
    }

    case 'classify': {
      const { classification, confidence } = payload as {
        classification: UserClassification;
        confidence: 'low' | 'med' | 'high';
      };
      track.userClassification = classification;
      track.userConfidence = confidence;
      tracks.set(trackId, track);
      eventsLog.push({
        id: `evt-cls-${trackId}-${timestamp}`,
        time: Math.round(timestamp),
        text: `CLASSIFIED ${trackId} as [${classification.toUpperCase()}] (${confidence} conf).`,
        type: 'info',
      });
      break;
    }

    case 'engage': {
      const engagementType = payload?.type as EngagementType;
      track.lastAction = engagementType;
      track.lastActionTime = timestamp;
      tracks.set(trackId, track);

      if (engagementType === 'jam') {
        if (jammerCooldown > 0) {
          eventsLog.push({
            id: `evt-jam-cd-${timestamp}`,
            time: Math.round(timestamp),
            text: `JAMMER ERROR: System cooling down (${Math.round(jammerCooldown)}s left).`,
            type: 'warn',
          });
          break;
        }

        jammerCooldown = 10; // 10s cooldown
        const dist = Math.hypot(entity.x, entity.y);

        if (dist > 1800) {
          eventsLog.push({
            id: `evt-jam-range-${timestamp}`,
            time: Math.round(timestamp),
            text: `JAMMING FAILED: Target ${trackId} out of jammer range (${Math.round(dist)}m).`,
            type: 'warn',
          });
        } else if (entity.isAutonomous) {
          eventsLog.push({
            id: `evt-jam-auto-${timestamp}`,
            time: Math.round(timestamp),
            text: `JAMMING INEFFECTIVE: ${trackId} is operating on autonomous fiber-optic guidance!`,
            type: 'alert',
          });
        } else if (!entity.isRFActive) {
          eventsLog.push({
            id: `evt-jam-norf-${timestamp}`,
            time: Math.round(timestamp),
            text: `JAMMING INEFFECTIVE: ${trackId} has no active RF control emission!`,
            type: 'warn',
          });
        } else {
          // Success
          entities = entities.map((e) =>
            e.id === entity.id ? { ...e, status: 'jammed', active: false } : e
          );
          eventsLog.push({
            id: `evt-jam-succ-${timestamp}`,
            time: Math.round(timestamp),
            text: `SUCCESS: RF Jammer disrupted control link of ${trackId}. Target forced down.`,
            type: 'success',
          });
        }
      } else if (engagementType === 'soft_kill') {
        const dist = Math.hypot(entity.x, entity.y);
        if (dist > 2200) {
          eventsLog.push({
            id: `evt-soft-range-${timestamp}`,
            time: Math.round(timestamp),
            text: `SOFT-KILL FAILED: ${trackId} out of spoofing range.`,
            type: 'warn',
          });
        } else {
          entities = entities.map((e) =>
            e.id === entity.id ? { ...e, status: 'spoofed', active: false } : e
          );
          eventsLog.push({
            id: `evt-soft-succ-${timestamp}`,
            time: Math.round(timestamp),
            text: `SUCCESS: GPS Spoofing diverted ${trackId} away from base perimeter.`,
            type: 'success',
          });
        }
      } else if (engagementType === 'hard_kill') {
        if (ammoCount <= 0) {
          eventsLog.push({
            id: `evt-ammo-depleted-${timestamp}`,
            time: Math.round(timestamp),
            text: `HARD-KILL ERROR: Interceptor ammo depleted!`,
            type: 'alert',
          });
          break;
        }

        ammoCount -= 1;
        entities = entities.map((e) =>
          e.id === entity.id ? { ...e, status: 'destroyed', active: false } : e
        );

        eventsLog.push({
          id: `evt-hk-succ-${timestamp}`,
          time: Math.round(timestamp),
          text: `FIRE: Kinetic Interceptor engaged ${trackId}. Target destroyed. (${ammoCount}/${state.maxAmmo} ammo left)`,
          type: 'success',
        });
      } else if (engagementType === 'alert') {
        alarmActive = true;
        eventsLog.push({
          id: `evt-alert-${trackId}-${timestamp}`,
          time: Math.round(timestamp),
          text: `ALERT ISSUED: Threat ${trackId} flagged to command network.`,
          type: 'info',
        });
      }
      break;
    }
  }

  return {
    ...state,
    ammoCount,
    jammerCooldown,
    alarmActive,
    sensorState,
    entities,
    tracks,
    actionRecords,
    eventsLog,
  };
}
