import type { ScenarioConfig, TimeOfDay, WeatherCondition, TerrainType, EntityType, WaveConfig } from '../types';
import { PRNG } from './prng';

export interface ScenarioGenOptions {
  seed: number;
  difficulty?: number; // 1-10
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
  terrain?: TerrainType;
}

export function generateProceduralScenario(options: ScenarioGenOptions): ScenarioConfig {
  const seed = options.seed || Math.floor(Math.random() * 899999) + 100000;
  const prng = new PRNG(seed);
  const difficulty = options.difficulty ?? prng.rangeInt(1, 10);

  // Pick Environment
  const timeOfDay: TimeOfDay = options.timeOfDay || prng.pick(['day', 'night']);
  const weather: WeatherCondition = options.weather || (difficulty > 5 ? prng.pick(['clear', 'fog', 'rain']) : 'clear');
  const terrain: TerrainType = options.terrain || (difficulty > 6 ? prng.pick(['rural', 'urban', 'mountain']) : 'rural');

  // Sensor degradation flags based on difficulty
  const sensorDegradation = {
    radarOutage: difficulty >= 7 && prng.chance(0.4),
    rfJitter: difficulty >= 4 && prng.chance(0.5),
    eoFogPenalty: weather === 'fog' ? 0.35 : weather === 'rain' ? 0.2 : 0,
    falseBlips: difficulty >= 6 && prng.chance(0.45),
  };

  const waves: WaveConfig[] = [];

  // Wave 1: Initial airspace population (decoys / friendlies / early recon)
  if (difficulty >= 3) {
    const decoyType: EntityType = prng.chance(0.5) ? 'bird' : 'civilian';
    waves.push({
      startTime: prng.rangeInt(2, 5),
      count: prng.rangeInt(1, 2 + Math.floor(difficulty / 3)),
      type: decoyType,
      behavior: 'erratic',
      spawnRange: prng.rangeInt(1800, 2600),
      speed: decoyType === 'bird' ? prng.rangeInt(6, 9) : prng.rangeInt(9, 14),
    });
  }

  if (difficulty >= 5 && prng.chance(0.6)) {
    waves.push({
      startTime: prng.rangeInt(4, 8),
      count: 1,
      type: 'friendly',
      behavior: 'circling',
      spawnRange: prng.rangeInt(2000, 2800),
      speed: 20,
      iffStatus: prng.chance(0.4) ? 'faulty' : 'valid',
    });
  }

  // Wave 2: Primary Threat (Recon / Attack / Swarm)
  const isSwarm = difficulty >= 6 && prng.chance(0.5);

  if (isSwarm) {
    const swarmSize = prng.rangeInt(5, 5 + difficulty * 2);
    waves.push({
      startTime: prng.rangeInt(6, 12),
      count: swarmSize,
      type: 'hostile_swarm',
      behavior: 'formation',
      spawnRange: prng.rangeInt(2600, 3400),
      speed: prng.rangeInt(22, 28),
    });
  } else {
    // Single or pair attack/recon
    const hostileType: EntityType = prng.chance(0.4) ? 'hostile_recon' : 'hostile_attack';
    const isAuto = hostileType === 'hostile_attack' && difficulty >= 4 && prng.chance(0.5);

    waves.push({
      startTime: prng.rangeInt(5, 10),
      count: prng.rangeInt(1, Math.min(3, Math.floor(difficulty / 2) + 1)),
      type: hostileType,
      behavior: hostileType === 'hostile_recon' ? 'loiter_recon' : 'direct_attack',
      spawnRange: prng.rangeInt(2700, 3500),
      speed: hostileType === 'hostile_attack' ? prng.rangeInt(30, 42) : prng.rangeInt(14, 20),
      isAutonomous: isAuto,
    });
  }

  // Wave 3: Secondary threat if high difficulty
  if (difficulty >= 8) {
    waves.push({
      startTime: prng.rangeInt(20, 30),
      count: prng.rangeInt(2, 4),
      type: 'hostile_attack',
      behavior: 'direct_attack',
      spawnRange: prng.rangeInt(3000, 3600),
      speed: 36,
      isAutonomous: prng.chance(0.5),
    });
  }

  const duration = Math.min(180, 90 + waves.length * 20);

  return {
    id: `proc-seed-${seed}-diff-${difficulty}`,
    name: `Operation Sector ${prng.rangeInt(10, 99)} (Seed: ${seed})`,
    description: `Procedural training mission generated with Seed ${seed} at Difficulty Level ${difficulty}/10. ${timeOfDay.toUpperCase()} operations in ${terrain} terrain under ${weather} conditions.`,
    seed,
    difficulty,
    environment: {
      time: timeOfDay,
      weather,
      terrain,
    },
    sensorDegradation,
    waves,
    duration,
  };
}
