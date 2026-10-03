import type { SessionResult } from '../types';

export function generateFeedback(session: SessionResult): string[] {
  const notes: string[] = [];

  // Summary assessment
  if (session.finalScore >= 90) {
    notes.push(`[EXCELLENT PERFORMANCE] Outstanding situational awareness and threat neutralization. Final Grade: ${session.grade} (${session.finalScore}%).`);
  } else if (session.finalScore >= 70) {
    notes.push(`[COMMENDABLE PERFORMANCE] Solid tactical execution with minor operational friction. Final Grade: ${session.grade} (${session.finalScore}%).`);
  } else {
    notes.push(`[NEEDS IMPROVEMENT] Mission compromised by tactical errors. Final Grade: ${session.grade} (${session.finalScore}%). Review detailed debrief below.`);
  }

  // 1. Fratricide & Collateral Analysis
  if (session.fratricides > 0) {
    notes.push(
      `CRITICAL INSTRUCTION: You fired kinetic countermeasures at friendly UAV assets (${session.fratricides} incident). Always slewing the EO/IR camera to visually verify transponder ID before engaging non-standard squawks.`
    );
  }

  if (session.collateralIncidents > 0) {
    notes.push(
      `RULES OF ENGAGEMENT WARNING: Countermeasures were launched against non-hostile decoys/birds (${session.collateralIncidents} incident). Check radar cross-section (RCS < 0.01 dBSM indicates bird decoys).`
    );
  }

  // 2. Detection Speed Analysis
  if (session.subScores.detection < 60) {
    notes.push(
      `RADAR SCANNING: Average detection time exceeded safe response thresholds. Keep active radar and RF spectrum monitors visible at all times.`
    );
  } else {
    notes.push(
      `RADAR DISCIPLINE: Rapid threat detection enabled adequate defense reaction time.`
    );
  }

  // 3. Countermeasure Selection Analysis
  const autonomousFails = session.entityEvaluations.filter((e) =>
    e.decisionNodes.some((n) => n.id === 'node-hostile-weapon' && !n.passed)
  );
  if (autonomousFails.length > 0) {
    notes.push(
      `COUNTERMEASURE FAILURE: Attempted RF jamming on autonomous/fiber-optic attack drones (${autonomousFails.length} target). RF jammers cannot disrupt autonomous guidance; deploy Kinetic Interceptor or sound alarms.`
    );
  }

  // 4. Asset Damage & Alarm Discipline
  if (session.assetHealthRemaining < 100) {
    const alarmUsed = session.actionRecords.some((a) => a.actionType === 'alarm');
    if (!alarmUsed) {
      notes.push(
        `TACTICAL ALARM DISCIPLINE: You did not sound the Base Alarm [A] when hostile drones penetrated the outer perimeter. Sounding alarms orders personnel into fortified cover, reducing impact damage by 50%.`
      );
    } else {
      notes.push(
        `BASE ALARM DISCIPLINE: Early alarm deployment effectively minimized personnel damage during perimeter breach.`
      );
    }
  }

  // 5. Efficiency
  if (session.subScores.efficiency < 70) {
    notes.push(
      `RESOURCE CONSERVATION: Interceptor ammo was depleted prematurely. Prioritize RF jamming for RF-linked swarms and save kinetic rounds for autonomous threats.`
    );
  }

  return notes;
}

export async function generateLLMFeedback(
  session: SessionResult,
  apiKey: string,
  provider: 'openai' | 'gemini' | 'anthropic' = 'openai'
): Promise<string[]> {
  if (!apiKey) return generateFeedback(session);

  try {
    const prompt = `You are a strict military C-UAS (Counter-Unmanned Aircraft Systems) instructor debriefing a trainee after a simulator run.
Session Data:
- Trainee: ${session.traineeName} (${session.unitName})
- Mission: ${session.scenarioName} (Difficulty ${session.difficulty}/10)
- Score: ${session.finalScore}% (Grade ${session.grade})
- Subscores: Detection ${session.subScores.detection}%, Classification ${session.subScores.classification}%, Engagement ${session.subScores.engagement}%, Efficiency ${session.subScores.efficiency}%
- Mistakes: ${session.mistakeCategories.join(', ') || 'None'}
- Fratricides: ${session.fratricides}
- Collateral: ${session.collateralIncidents}
- Asset Health Remaining: ${session.assetHealthRemaining}%

Provide 4-5 concise, direct, tactical bullet points offering tactical instruction and constructive criticism. Format as a raw JSON array of strings.`;

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('LLM API call failed, falling back to rule-based instructor feedback', err);
  }

  return generateFeedback(session);
}
