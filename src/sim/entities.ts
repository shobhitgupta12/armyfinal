import type { EntityState, EntityType, BehaviorPattern } from '../types';
import { PRNG } from '../scenarios/prng';

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

export function updateEntityPhysics(
  entity: EntityState,
  deltaTime: number,
  simTime: number,
  _prng?: PRNG
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
      // Formation vector towards asset with slight sinusoidal wave offset
      const dist = Math.hypot(x, y);
      const mainRad = Math.atan2(-y, -x);
      const wave = Math.sin(simTime * 1.5 + (dist / 200)) * 0.3;
      const angleRad = mainRad + wave;
      vx = Math.cos(angleRad) * speed;
      vy = Math.sin(angleRad) * speed;
      heading = ((angleRad * 180) / Math.PI + 360) % 360;
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
