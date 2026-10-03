import type {
  EntityState,
  TrackSensorData,
  EntityEvaluation,
  DecisionNodeResult,
  UserClassification,
} from '../types';

export function evaluateEntityDecisionTree(
  entity: EntityState,
  track: TrackSensorData | undefined,
  _simDuration: number
): EntityEvaluation {
  const isHostile = entity.trueType.startsWith('hostile');
  const isFriendly = entity.trueType === 'friendly';
  const isCivilian = entity.trueType === 'civilian';
  const isBird = entity.trueType === 'bird';

  const userAck = track?.userAcknowledged ?? false;
  const userAckTime = track?.userAcknowledgedTime ?? null;
  const detectionTime = userAckTime !== null ? userAckTime - entity.spawnTime : null;

  // 1. Detection Score
  let detectionScore = 0;
  if (userAck && detectionTime !== null) {
    if (detectionTime < 5.0) detectionScore = 100;
    else if (detectionTime < 10.0) detectionScore = 75;
    else if (detectionTime < 20.0) detectionScore = 40;
    else detectionScore = 15;
  } else {
    detectionScore = 0;
  }

  // 2. Classification Score
  let classificationScore = 0;
  const userClass: UserClassification = track?.userClassification ?? 'unknown';

  if (userClass !== 'unknown') {
    if (
      (entity.trueType === 'hostile_attack' && userClass === 'hostile_attack') ||
      (entity.trueType === 'hostile_recon' && userClass === 'hostile_recon') ||
      (entity.trueType === 'hostile_swarm' && userClass === 'swarm') ||
      (entity.trueType === 'friendly' && userClass === 'friendly') ||
      (entity.trueType === 'civilian' && userClass === 'civilian') ||
      (entity.trueType === 'bird' && userClass === 'bird')
    ) {
      classificationScore = 100; // Exact match
    } else if (
      isHostile &&
      (userClass === 'hostile_attack' || userClass === 'hostile_recon' || userClass === 'swarm')
    ) {
      classificationScore = 60; // Right category (Hostile), wrong subtype
    } else if (!isHostile && (userClass === 'bird' || userClass === 'civilian' || userClass === 'friendly')) {
      classificationScore = 50; // Non-hostile right category
    } else {
      classificationScore = 0; // Completely wrong category
    }
  }

  // 3. Decision Tree Evaluation
  const decisionNodes: DecisionNodeResult[] = [];
  let engagementScore = 100;
  const lastAction = track?.lastAction;

  // Node 1: Target Identification
  decisionNodes.push({
    id: 'node-id',
    title: 'Target Category Verification',
    passed: isHostile ? userClass.startsWith('hostile') || userClass === 'swarm' : userClass !== 'hostile_attack' && userClass !== 'hostile_recon' && userClass !== 'swarm',
    scoreDelta: 0,
    reason: isHostile
      ? `Ground truth is ${entity.trueType.toUpperCase()}. Trainee classified as ${userClass.toUpperCase()}.`
      : `Ground truth is non-hostile ${entity.trueType.toUpperCase()}. Trainee classified as ${userClass.toUpperCase()}.`,
  });

  // Node 2: Engagement Appropriateness
  if (isFriendly || isCivilian || isBird) {
    // Non-hostile entity
    if (lastAction === 'hard_kill' || lastAction === 'jam' || lastAction === 'soft_kill') {
      engagementScore = 0;
      decisionNodes.push({
        id: 'node-nonhostile-eng',
        title: 'Non-Hostile Engagement Protection',
        passed: false,
        scoreDelta: -40,
        reason: isFriendly
          ? `CRITICAL FAIL: Executed ${lastAction.toUpperCase()} against Friendly UAV (${entity.trackId}). Fratricide committed!`
          : `FAIL: Executed countermeasure against non-hostile ${entity.trueType.toUpperCase()} (${entity.trackId}). Collateral incident!`,
      });
    } else {
      decisionNodes.push({
        id: 'node-nonhostile-eng',
        title: 'Non-Hostile Engagement Protection',
        passed: true,
        scoreDelta: 20,
        reason: `PASS: Non-hostile track ${entity.trackId} was monitored without aggressive force.`,
      });
    }
  } else if (isHostile) {
    // Hostile entity
    if (entity.status === 'destroyed' || entity.status === 'jammed' || entity.status === 'spoofed') {
      // Check weapon selection suitability
      if (entity.isAutonomous && lastAction === 'jam') {
        engagementScore = 30;
        decisionNodes.push({
          id: 'node-hostile-weapon',
          title: 'Weapon Countermeasure Selection',
          passed: false,
          scoreDelta: -20,
          reason: `FAIL: Attempted RF Jamming on autonomous fiber-optic drone ${entity.trackId}. Jammer ineffective!`,
        });
      } else {
        decisionNodes.push({
          id: 'node-hostile-weapon',
          title: 'Weapon Countermeasure Selection',
          passed: true,
          scoreDelta: 30,
          reason: `PASS: Successfully neutralized threat ${entity.trackId} with ${lastAction?.toUpperCase() ?? 'KINETIC'}.`,
        });
      }

      decisionNodes.push({
        id: 'node-hostile-perimeter',
        title: 'Perimeter Defense Interception',
        passed: true,
        scoreDelta: 20,
        reason: `PASS: Threat intercepted before reaching base asset.`,
      });
    } else if (entity.status === 'impacted') {
      engagementScore = 0;
      decisionNodes.push({
        id: 'node-hostile-perimeter',
        title: 'Perimeter Defense Interception',
        passed: false,
        scoreDelta: -40,
        reason: `CRITICAL FAIL: Threat ${entity.trackId} penetrated perimeter and struck central defended asset!`,
      });
    } else {
      // Escaped or unengaged
      engagementScore = 20;
      decisionNodes.push({
        id: 'node-hostile-perimeter',
        title: 'Perimeter Defense Interception',
        passed: false,
        scoreDelta: -20,
        reason: `FAIL: Threat ${entity.trackId} active in sector without timely interception.`,
      });
    }
  }

  const overallAvg = (detectionScore + classificationScore + engagementScore) / 3;
  const verdict = overallAvg >= 75 ? 'PASS' : overallAvg >= 45 ? 'PARTIAL' : 'FAIL';

  return {
    entityId: entity.id,
    trackId: entity.trackId,
    trueType: entity.trueType,
    userClassification: userClass,
    detectionTime,
    detectionScore,
    classificationScore,
    engagementScore,
    decisionNodes,
    verdict,
  };
}
