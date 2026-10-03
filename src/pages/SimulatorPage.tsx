import React, { useState, useEffect, useRef } from 'react';
import type { ScenarioConfig, UserClassification, EngagementType, SensorType, SessionResult } from '../types';
import {
  type SimulationState,
  createSimulationEngine,
  tickSimulation,
  executeTraineeAction,
} from '../sim/engine';
import { calculateSessionScore } from '../scoring/rubric';
import { generateFeedback } from '../ai/instructor';
import { RadarCanvas } from '../components/RadarCanvas';
import { HUDPanel } from '../components/HUDPanel';
import type { CurrentUser } from '../storage/storageService';
import { Play, Pause, Award, Sun, Moon, Cloud, CloudRain, Map, AlertTriangle, BookOpen } from 'lucide-react';

interface SimulatorPageProps {
  scenario: ScenarioConfig;
  currentUser: CurrentUser;
  onFinishSession: (result: SessionResult) => void;
  onOpenTutorial: () => void;
}

const ENV_BADGE_ICONS: Record<string, React.ReactNode> = {
  day: <Sun style={{ width: 11, height: 11 }} />,
  night: <Moon style={{ width: 11, height: 11 }} />,
  clear: <Sun style={{ width: 11, height: 11 }} />,
  fog: <Cloud style={{ width: 11, height: 11 }} />,
  rain: <CloudRain style={{ width: 11, height: 11 }} />,
  urban: <Map style={{ width: 11, height: 11 }} />,
  rural: <Map style={{ width: 11, height: 11 }} />,
  mountain: <Map style={{ width: 11, height: 11 }} />,
};

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  scenario,
  currentUser,
  onFinishSession,
  onOpenTutorial,
}) => {
  const [simState, setSimState] = useState<SimulationState>(() =>
    createSimulationEngine(scenario)
  );

  const simRef = useRef<SimulationState>(simState);
  simRef.current = simState;

  const animFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const current = simRef.current;
      const selTrack = current.selectedTrackId;
      switch (e.key.toLowerCase()) {
        case ' ': e.preventDefault(); setSimState((prev) => ({ ...prev, isPaused: !prev.isPaused })); break;
        case 'd': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'detect', selTrack)); break;
        case 'j': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'engage', selTrack, { type: 'jam' })); break;
        case 's': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'engage', selTrack, { type: 'soft_kill' })); break;
        case 'h': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'engage', selTrack, { type: 'hard_kill' })); break;
        case 'a': setSimState((prev) => executeTraineeAction(prev, 'alarm', null)); break;
        case 'escape': setSimState((prev) => ({ ...prev, selectedTrackId: null })); break;
        case '1': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'classify', selTrack, { classification: 'hostile_attack', confidence: 'high' })); break;
        case '2': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'classify', selTrack, { classification: 'hostile_recon', confidence: 'high' })); break;
        case '3': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'classify', selTrack, { classification: 'swarm', confidence: 'high' })); break;
        case '4': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'classify', selTrack, { classification: 'friendly', confidence: 'high' })); break;
        case '5': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'classify', selTrack, { classification: 'civilian', confidence: 'high' })); break;
        case '6': if (selTrack) setSimState((prev) => executeTraineeAction(prev, 'classify', selTrack, { classification: 'bird', confidence: 'high' })); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const dt = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;
      setSimState((prev) => {
        if (prev.isPaused || prev.isCompleted) return prev;
        return tickSimulation(prev, dt);
      });
      animFrameId.current = requestAnimationFrame(loop);
    };
    animFrameId.current = requestAnimationFrame(loop);
    return () => { if (animFrameId.current) cancelAnimationFrame(animFrameId.current); };
  }, []);

  const handleSelectTrack = (trackId: string) => setSimState((prev) => ({ ...prev, selectedTrackId: trackId }));
  const handleDetectTrack = (trackId: string) => setSimState((prev) => executeTraineeAction(prev, 'detect', trackId));
  const handleClassifyTrack = (trackId: string, classification: UserClassification, confidence: 'low' | 'med' | 'high') =>
    setSimState((prev) => executeTraineeAction(prev, 'classify', trackId, { classification, confidence }));
  const handleEngageTrack = (trackId: string, type: EngagementType) =>
    setSimState((prev) => executeTraineeAction(prev, 'engage', trackId, { type }));
  const handleSoundAlarm = () => setSimState((prev) => executeTraineeAction(prev, 'alarm', null));
  const handleSlewCamera = (bearing: number) => setSimState((prev) => executeTraineeAction(prev, 'slew_camera', null, { bearing }));
  const handleToggleSensor = (sensor: SensorType) => {
    setSimState((prev) => {
      const sensorState = { ...prev.sensorState };
      if (sensor === 'radar') sensorState.radarActive = !sensorState.radarActive;
      if (sensor === 'eo_ir') sensorState.eoIrActive = !sensorState.eoIrActive;
      if (sensor === 'rf') sensorState.rfActive = !sensorState.rfActive;
      if (sensor === 'acoustic') sensorState.acousticActive = !sensorState.acousticActive;
      return { ...prev, sensorState };
    });
  };

  const handleProceedToDebrief = () => {
    const sessionResult = calculateSessionScore(simState, currentUser.name, currentUser.unit);
    sessionResult.aiDebriefFeedback = generateFeedback(sessionResult);
    onFinishSession(sessionResult);
  };

  const hostileCount = Array.from(simState.tracks.values()).filter(
    t => t.userClassification === 'hostile_attack' || t.userClassification === 'swarm' || t.userClassification === 'hostile_recon'
  ).length;

  const diffColor = scenario.difficulty >= 7 ? '#ef4444' : scenario.difficulty >= 4 ? '#f59e0b' : '#10b981';

  return (
    <div className="h-[calc(100vh-52px)] text-emerald-400 font-mono select-none flex flex-col" style={{ background: '#020408' }}>
      {/* TOP MISSION BAR */}
      <div
        className="flex items-center justify-between px-4 py-1.5 text-xs shrink-0"
        style={{ background: 'rgba(3,10,6,0.98)', borderBottom: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="status-dot online" />
            <span className="font-bold text-emerald-300 tracking-wider">{scenario.name}</span>
          </div>
          <span className="text-zinc-700">|</span>
          <span className="text-[10px] text-zinc-600 tracking-widest">SEED: {scenario.seed}</span>
          <div className="flex items-center space-x-1.5">
            {[scenario.environment.time, scenario.environment.weather, scenario.environment.terrain].map(env => (
              <span key={env} className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981' }}>
                {ENV_BADGE_ICONS[env]}
                <span>{env}</span>
              </span>
            ))}
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded tracking-widest" style={{ background: `${diffColor}15`, border: `1px solid ${diffColor}40`, color: diffColor }}>
            DIFF {scenario.difficulty}/10
          </span>
          {hostileCount > 0 && (
            <div className="flex items-center space-x-1 animate-pulse">
              <AlertTriangle style={{ width: 12, height: 12, color: '#ef4444' }} />
              <span className="text-[10px] font-bold text-red-400 tracking-widest">{hostileCount} HOSTILE{hostileCount > 1 ? 'S' : ''} TRACKED</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSimState((prev) => ({ ...prev, isPaused: !prev.isPaused }))}
            className="btn-tactical flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all"
            style={{
              background: simState.isPaused ? 'rgba(16,185,129,0.15)' : 'rgba(4,12,8,0.9)',
              border: simState.isPaused ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(16,185,129,0.15)',
              color: simState.isPaused ? '#10b981' : '#6b7280',
            }}
          >
            {simState.isPaused ? <Play style={{ width: 12, height: 12 }} /> : <Pause style={{ width: 12, height: 12 }} />}
            <span className="text-[10px] tracking-widest">{simState.isPaused ? 'RESUME [SPACE]' : 'PAUSE [SPACE]'}</span>
          </button>
          <button
            onClick={onOpenTutorial}
            className="btn-tactical flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-[10px] tracking-widest transition-all text-zinc-500 hover:text-emerald-400"
            style={{ background: 'rgba(4,12,8,0.9)', border: '1px solid rgba(16,185,129,0.12)' }}
          >
            <BookOpen style={{ width: 11, height: 11 }} />
            <span>TUTORIAL</span>
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        <div className="p-3 flex items-center justify-center shrink-0 relative" style={{ background: '#010504', borderRight: '1px solid rgba(16,185,129,0.1)', minWidth: 0 }}>
          <RadarCanvas
            tracks={simState.tracks}
            entities={simState.entities}
            sensorState={simState.sensorState}
            selectedTrackId={simState.selectedTrackId}
            onSelectTrack={handleSelectTrack}
            terrain={scenario.environment.terrain}
            timeOfDay={scenario.environment.time}
            weather={scenario.environment.weather}
            assetHealth={simState.assetHealth}
            width={600}
            height={600}
          />
        </div>
        <div className="flex-1 min-w-0" style={{ background: '#010504' }}>
          <HUDPanel
            assetHealth={simState.assetHealth}
            ammoCount={simState.ammoCount}
            maxAmmo={simState.maxAmmo}
            jammerCooldown={simState.jammerCooldown}
            alarmActive={simState.alarmActive}
            simTime={simState.simTime}
            duration={scenario.duration}
            tracks={simState.tracks}
            selectedTrackId={simState.selectedTrackId}
            sensorState={simState.sensorState}
            eventsLog={simState.eventsLog}
            onSelectTrack={handleSelectTrack}
            onDetectTrack={handleDetectTrack}
            onClassifyTrack={handleClassifyTrack}
            onEngageTrack={handleEngageTrack}
            onSoundAlarm={handleSoundAlarm}
            onSlewCamera={handleSlewCamera}
            onToggleSensor={handleToggleSensor}
          />
        </div>
      </div>

      {/* MISSION COMPLETE OVERLAY */}
      {simState.isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.94)' }}>
          <div
            className="w-full max-w-md p-8 rounded-2xl text-center space-y-6"
            style={{
              background: 'linear-gradient(135deg, rgba(4,20,12,0.98), rgba(2,10,6,0.99))',
              border: simState.assetHealth <= 0 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(16,185,129,0.5)',
              boxShadow: 'none',
            }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{
                background: simState.assetHealth <= 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                border: simState.assetHealth <= 0 ? '2px solid rgba(239,68,68,0.4)' : '2px solid rgba(16,185,129,0.4)',
                boxShadow: 'none',
              }}
            >
              <Award className="w-10 h-10" style={{ color: simState.assetHealth <= 0 ? '#ef4444' : '#10b981' }} />
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-zinc-600 tracking-[0.3em]">
                {simState.assetHealth <= 0 ? 'MISSION STATUS: FAILED' : 'MISSION STATUS: COMPLETE'}
              </div>
              <h2 className="text-2xl font-black tracking-wide" style={{
                color: simState.assetHealth <= 0 ? '#ef4444' : '#10b981',
                textShadow: 'none',
              }}>
                {simState.assetHealth <= 0 ? 'ASSET DESTROYED' : 'SECTOR SECURED'}
              </h2>
              <p className="text-xs text-zinc-500 pt-1">
                Air threat engagement window concluded. Final scoring and decision-tree evaluation ready.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'TRACKS', value: simState.tracks.size },
                { label: 'ASSET HP', value: `${Math.round(Math.max(0, simState.assetHealth))}%` },
                { label: 'TIME', value: `${Math.floor(simState.simTime)}s` },
              ].map(stat => (
                <div key={stat.label} className="p-2.5 rounded-lg text-center" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                  <div className="text-[9px] text-zinc-600 tracking-widest">{stat.label}</div>
                  <div className="font-bold text-emerald-300 text-sm">{stat.value}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleProceedToDebrief}
              className="btn-tactical w-full py-3.5 rounded-xl font-extrabold text-sm tracking-widest text-black transition-all hover:scale-105 active:scale-100"
              style={{ background: 'linear-gradient(135deg, #10b981, #00ff9d)' }}
            >
              PROCEED TO DEBRIEF &amp; AAR →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};