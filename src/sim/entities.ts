import type { EntityState, EntityType, BehaviorPattern } from '../types';
import { PRNG } from '../scenarios/prng';

// ── Boids constants ─────────────────────────────────────────────────────────
const BOIDS_SEPARATION_DIST = 80;   // metres — drones repel below this
const BOIDS_COHESION_DIST   = 350;  // metres — drones attract up to this
const BOIDS_ALIGN_DIST      = 250;  // metres — heading alignment range
const BOIDS_MAX_STEER       = 0.45; // radians per second — max turn rate
const BOIDS_SEP_WEIGHT      = 2.0;
const BOIDS_COH_WEIGHT      = 0.6;
const BOIDS_ALN_WEIGHT      = 0.8;
const BOIDS_GOAL_WEIGHT     = 1.4;

export function createEntity(
  id: string,
  trackId: string,
  trueType: EntityType,
  spawnAngleDeg: number,
  spawnRange: number,
  spawnTime: number,
  overrideOptions?: Partial<EntityState>
): EntityState {
  const rad = (spawnAngleDeg * Math.PI) / 180;
  const x = Math.cos(rad) * spawnRange;
  const y = Math.sin(rad) * spawnRange;

  let speed = 20;
  let altitude = 100;
  let rcs = 0.05;
  let behavior: BehaviorPattern = 'direct_attack';
  let isRFActive = true;
  let isAutonomous = false;
  let iffStatus: 'valid' | 'faulty' | 'none' = 'none';

  switch (trueType) {
    case 'hostile_recon':
      speed = 14;
      altitude = 150;
      rcs = 0.03;
      behavior = 'loiter_recon';
      isRFActive = true;
      break;

    case 'hostile_attack':
      speed = 32;
      altitude = 80;
      rcs = 0.06;
      behavior = 'direct_attack';
      isRFActive = overrideOptions?.isAutonomous ? false : true;
      isAutonomous = overrideOptions?.isAutonomous || false;
      break;

    case 'hostile_swarm':
      speed = 24;
      altitude = 90;
      rcs = 0.04;
      behavior = 'formation';
      isRFActive = true;
      break;

    case 'friendly':
      speed = 22;
      altitude = 200;
      rcs = 0.12;
      behavior = 'circling';
      iffStatus = overrideOptions?.iffStatus || 'valid';
      isRFActive = true;
      break;

    case 'civilian':
      speed = 9;
      altitude = 45;
      rcs = 0.02;
      behavior = 'erratic';
      isRFActive = true;
      break;

    case 'bird':
      speed = 7;
      altitude = 35;
      rcs = 0.008;
      behavior = 'erratic';
      isRFActive = false;
      break;

    case 'aircraft':
      speed = 75;
      altitude = 950;
      rcs = 5.0;
      behavior = 'passing';
      iffStatus = 'valid';
      isRFActive = true;
      break;
  }

  // Calculate heading towards target or course
  const heading = (Math.atan2(-y, -x) * 180) / Math.PI;
  const headingRad = (heading * Math.PI) / 180;
  const vx = Math.cos(headingRad) * speed;
  const vy = Math.sin(headingRad) * speed;

  const initialEntity: EntityState = {
    id,
    trackId,
    trueType,
    x,
    y,
    altitude,
    vx,
    vy,
    speed,
    heading: (heading + 360) % 360,
    rcs,
    iffStatus,
    behavior,
    isRFActive,
    isAutonomous,
    spawnTime,
    active: true,
    status: 'active',
    ...overrideOptions,
  };

  return initialEntity;
}

// ── Boids helper ────────────────────────────────────────────────────────────

/**
 * Compute a boids steering vector for one swarm member.
 * Returns [ax, ay] — a desired acceleration direction (unit-ish).
 */
function computeBoidsAcceleration(
  entity: EntityState,
  swarmNeighbours: EntityState[]
): [number, number] {
  let sepX = 0, sepY = 0, sepCount = 0;
  let cohX = 0, cohY = 0, cohCount = 0;
  let alnVx = 0, alnVy = 0, alnCount = 0;

  for (const other of swarmNeighbours) {
    if (other.id === entity.id || !other.active) continue;

    const dx = entity.x - other.x;
    const dy = entity.y - other.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    // Separation — steer away from too-close neighbours
    if (dist < BOIDS_SEPARATION_DIST) {
      sepX += (dx / dist) / dist; // inversely weighted by distance
      sepY += (dy / dist) / dist;
      sepCount++;
    }

    // Cohesion — steer towards centre of flock
    if (dist < BOIDS_COHESION_DIST) {
      cohX += other.x;
      cohY += other.y;
      cohCount++;
    }

    // Alignment — match velocity of nearby drones
    if (dist < BOIDS_ALIGN_DIST) {
      alnVx += other.vx;
      alnVy += other.vy;
      alnCount++;
    }
  }

  // Normalise each rule
  let ax = 0, ay = 0;

  if (sepCount > 0) {
    ax += (sepX / sepCount) * BOIDS_SEP_WEIGHT;
    ay += (sepY / sepCount) * BOIDS_SEP_WEIGHT;
  }

  if (cohCount > 0) {
    const toCohX = cohX / cohCount - entity.x;
    const toCohY = cohY / cohCount - entity.y;
    const cohMag = Math.hypot(toCohX, toCohY) || 1;
    ax += (toCohX / cohMag) * BOIDS_COH_WEIGHT;
    ay += (toCohY / cohMag) * BOIDS_COH_WEIGHT;
  }

  if (alnCount > 0) {
    const alnMag = Math.hypot(alnVx, alnVy) || 1;
    ax += (alnVx / alnCount / alnMag) * BOIDS_ALN_WEIGHT;
    ay += (alnVy / alnCount / alnMag) * BOIDS_ALN_WEIGHT;
  }

  // Goal: steer towards defended asset (0, 0)
  const toGoalX = -entity.x;
  const toGoalY = -entity.y;
  const goalMag = Math.hypot(toGoalX, toGoalY) || 1;
  ax += (toGoalX / goalMag) * BOIDS_GOAL_WEIGHT;
  ay += (toGoalY / goalMag) * BOIDS_GOAL_WEIGHT;

  return [ax, ay];
}

export function updateEntityPhysics(
  entity: EntityState,
  deltaTime: number,
  simTime: number,
  _prng?: PRNG,
  /** All active entities — used for boids neighbour queries */
  allEntities?: EntityState[]
): EntityState {
  if (!entity.active || entity.status !== 'active') {
    return entity;
  }

  let { x, y, vx, vy, speed, heading, behavior, altitude } = entity;

  switch (behavior) {
    case 'direct_attack': {
      // Steer directly to (0,0)
      const targetHeading = (Math.atan2(-y, -x) * 180) / Math.PI;
      const targetRad = (targetHeading * Math.PI) / 180;
      vx = Math.cos(targetRad) * speed;
      vy = Math.sin(targetRad) * speed;
      heading = (targetHeading + 360) % 360;
      break;
    }

    case 'loiter_recon': {
      // Approach to ~1000m, then circle around asset
      const dist = Math.hypot(x, y);
      if (dist > 1050) {
        // Approach
        const targetHeading = (Math.atan2(-y, -x) * 180) / Math.PI;
        const targetRad = (targetHeading * Math.PI) / 180;
        vx = Math.cos(targetRad) * speed;
        vy = Math.sin(targetRad) * speed;
        heading = (targetHeading + 360) % 360;
      } else {
        // Circle tangentially
        const currentAngle = Math.atan2(y, x);
        const circleAngle = currentAngle + (speed * deltaTime) / 1000;
        x = Math.cos(circleAngle) * 1000;
        y = Math.sin(circleAngle) * 1000;
        heading = ((circleAngle * 180) / Math.PI + 90) % 360;
        return { ...entity, x, y, heading };
      }
      break;
    }

    case 'circling': {
      const dist = Math.hypot(x, y);
      const currentAngle = Math.atan2(y, x);
      const circleAngle = currentAngle + (speed * deltaTime) / Math.max(500, dist);
      x = Math.cos(circleAngle) * dist;
      y = Math.sin(circleAngle) * dist;
      heading = ((circleAngle * 180) / Math.PI + 90) % 360;
      return { ...entity, x, y, heading };
    }

    case 'erratic': {
      // Add slight direction noise - use simple hash of entity id to avoid NaN from parseInt
      const idHash = entity.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const angleRad = (heading * Math.PI) / 180 + (Math.sin(simTime * 2 + idHash) * 0.15);
      vx = Math.cos(angleRad) * speed;
      vy = Math.sin(angleRad) * speed;
      heading = ((angleRad * 180) / Math.PI + 360) % 360;
      break;
    }

    case 'formation': {
      // ── Boids-style emergent swarm coordination ─────────────────────────
      // Uses separation, cohesion, alignment + goal-seek instead of a
      // fixed sinusoidal wave, so the swarm forms and adapts dynamically.
      if (allEntities && allEntities.length > 0) {
        // Only consider same-swarmId neighbours if swarmId is set,
        // otherwise use all active swarm entities as neighbours.
        const neighbours = allEntities.filter(
          (e) =>
            e.active &&
            e.status === 'active' &&
            e.id !== entity.id &&
            (entity.swarmId ? e.swarmId === entity.swarmId : e.behavior === 'formation')
        );

        const [ax, ay] = computeBoidsAcceleration(entity, neighbours);

        // Current heading as radians
        const currentRad = Math.atan2(vy, vx);

        // Desired heading from acceleration vector
        const desiredRad = Math.atan2(ay, ax);

        // Clamp turn rate to BOIDS_MAX_STEER rad/s
        let dAngle = desiredRad - currentRad;
        // Normalise to [-π, π]
        while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
        while (dAngle < -Math.PI) dAngle += 2 * Math.PI;
        const maxTurn = BOIDS_MAX_STEER * deltaTime;
        const turnApplied = Math.max(-maxTurn, Math.min(maxTurn, dAngle));

        const newRad = currentRad + turnApplied;
        vx = Math.cos(newRad) * speed;
        vy = Math.sin(newRad) * speed;
        heading = ((newRad * 180) / Math.PI + 360) % 360;
      } else {
        // Fallback: direct attack if no neighbour data available
        const targetHeading = (Math.atan2(-y, -x) * 180) / Math.PI;
        const targetRad = (targetHeading * Math.PI) / 180;
        vx = Math.cos(targetRad) * speed;
        vy = Math.sin(targetRad) * speed;
        heading = (targetHeading + 360) % 360;
      }
      break;
    }

    case 'passing': {
      // Straight line
      break;
    }
  }

  // Position update
  x += vx * deltaTime;
  y += vy * deltaTime;

  // Check impact with defended asset at (0,0) within 30m radius
  const distToAsset = Math.hypot(x, y);
  let status: EntityState['status'] = entity.status;
  let active: boolean = entity.active;
  let impactTime = entity.impactTime;

  if (distToAsset <= 30 && entity.trueType.startsWith('hostile')) {
    status = 'impacted';
    active = false;
    impactTime = simTime;
  } else if (distToAsset > 4500) {
    // Left boundary
    status = 'escaped';
    active = false;
  }

  return {
    ...entity,
    x,
    y,
    vx,
    vy,
    heading,
    altitude,
    status,
    active,
    impactTime,
  };
}
