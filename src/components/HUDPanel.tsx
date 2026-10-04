import React, { useRef, useEffect, useMemo } from 'react';
import type {
  TrackSensorData,
  UserClassification,
  EngagementType,
  SensorType,
} from '../types';
import type { SensorSystemState } from '../sim/sensors';
import {
  Shield,
  Zap,
  Crosshair,
  AlertTriangle,
  Radio,
  Eye,
  Volume2,
  Sliders,
  Brain,
} from 'lucide-react';
import {
  classifyAllTracks,
  formatPredictionHint,
  predictionColor,
  type ClassifierPrediction,
} from '../ai/threatClassifier';

interface HUDPanelProps {
  assetHealth: number;
  ammoCount: number;
  maxAmmo: number;
  jammerCooldown: number;
  alarmActive: boolean;
  simTime: number;
  duration: number;
  tracks: Map<string, TrackSensorData>;
  selectedTrackId: string | null;
  sensorState: SensorSystemState;
  eventsLog: Array<{ id: string; time: number; text: string; type: string }>;
  onSelectTrack: (trackId: string) => void;
  onDetectTrack: (trackId: string) => void;
  onClassifyTrack: (trackId: string, classification: UserClassification, confidence: 'low' | 'med' | 'high') => void;
  onEngageTrack: (trackId: string, type: EngagementType) => void;
  onSoundAlarm: () => void;
  onSlewCamera: (bearing: number) => void;
  onToggleSensor: (sensor: SensorType) => void;
}

export const HUDPanel: React.FC<HUDPanelProps> = ({
  assetHealth,
  ammoCount,
  maxAmmo,
  jammerCooldown,
  alarmActive,
  simTime,
  duration,
  tracks,
  selectedTrackId,
  sensorState,
  eventsLog,
  onSelectTrack,
  onDetectTrack,
  onClassifyTrack,
  onEngageTrack,
  onSoundAlarm,
  onSlewCamera,
  onToggleSensor,
}) => {
  const selectedTrack = selectedTrackId ? tracks.get(selectedTrackId) : null;
  const eventsEndRef = useRef<HTMLDivElement | null>(null);

  // AI threat classifier — runs on every render (tracks map changes each tick)
  const aiPredictions = useMemo(
    () => classifyAllTracks(tracks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracks.size, simTime]
  );

  // Auto-scroll event log to latest entry
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventsLog.length]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-emerald-400 font-mono select-none">
      {/* Top Tactical Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-emerald-900/80">
        {/* Asset Health Bar */}
        <div className="flex items-center space-x-3 w-64">
          <Shield className={`w-5 h-5 ${assetHealth > 50 ? 'text-emerald-400' : 'text-red-500 animate-pulse'}`} />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">DEFENDED ASSET</span>
              <span className={assetHealth > 50 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {Math.round(assetHealth)}%
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-2.5 rounded overflow-hidden border border-zinc-700">
              <div
                className={`h-full transition-all duration-300 ${
                  assetHealth > 50 ? 'bg-emerald-500' : assetHealth > 25 ? 'bg-amber-500' : 'bg-red-600 animate-pulse'
                }`}
                style={{ width: `${Math.max(0, assetHealth)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Resources & Cooldowns */}
        <div className="flex items-center space-x-6 text-sm">
          {/* Ammo counter */}
          <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1 rounded border border-emerald-900/60">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span className="text-zinc-400 text-xs">INTERCEPTORS:</span>
            <span className="text-cyan-400 font-bold">{ammoCount} / {maxAmmo}</span>
          </div>

          {/* Jammer Cooldown */}
          <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1 rounded border border-emerald-900/60">
            <Zap className={`w-4 h-4 ${jammerCooldown === 0 ? 'text-amber-400' : 'text-zinc-600'}`} />
            <span className="text-zinc-400 text-xs">RF JAMMER:</span>
            <span className={jammerCooldown === 0 ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
              {jammerCooldown === 0 ? 'READY' : `${Math.ceil(jammerCooldown)}s`}
            </span>
          </div>

          {/* Alarm Trigger Button */}
          <button
            onClick={onSoundAlarm}
            className={`px-3 py-1 text-xs font-bold rounded flex items-center space-x-1.5 transition ${
              alarmActive
                ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-900/50'
                : 'bg-zinc-800 text-red-400 hover:bg-red-900/40 border border-red-800/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{alarmActive ? 'ALARM ACTIVE [COVER]' : 'SOUND ALARM [A]'}</span>
          </button>
        </div>

        {/* Timer */}
        <div className="text-right">
          <div className="text-xs text-zinc-400">MISSION TIME</div>
          <div className="text-lg font-bold tracking-widest text-emerald-300">
            {formatTime(simTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* Sensor Control Toggles */}
      <div className="flex items-center space-x-4 px-4 py-1.5 bg-zinc-900/80 border-b border-zinc-800 text-xs">
        <span className="text-zinc-400 flex items-center space-x-1">
          <Sliders className="w-3.5 h-3.5" />
          <span>SENSORS:</span>
        </span>

        <button
          onClick={() => onToggleSensor('radar')}
          className={`flex items-center space-x-1 px-2.5 py-0.5 rounded border ${
            sensorState.radarActive
              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
              : 'bg-zinc-900 text-zinc-600 border-zinc-800'
          }`}
        >
          <Radio className="w-3 h-3" />
          <span>RADAR (LONG RANGE)</span>
        </button>

        <button
          onClick={() => onToggleSensor('eo_ir')}
          className={`flex items-center space-x-1 px-2.5 py-0.5 rounded border ${
            sensorState.eoIrActive
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
              : 'bg-zinc-900 text-zinc-600 border-zinc-800'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>EO/IR CAMERA</span>
        </button>

        <button
          onClick={() => onToggleSensor('rf')}
          className={`flex items-center space-x-1 px-2.5 py-0.5 rounded border ${
            sensorState.rfActive
              ? 'bg-amber-950 text-amber-300 border-amber-700'
              : 'bg-zinc-900 text-zinc-600 border-zinc-800'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>RF DETECTOR</span>
        </button>

        <button
          onClick={() => onToggleSensor('acoustic')}
          className={`flex items-center space-x-1 px-2.5 py-0.5 rounded border ${
            sensorState.acousticActive
              ? 'bg-purple-950 text-purple-300 border-purple-700'
              : 'bg-zinc-900 text-zinc-600 border-zinc-800'
          }`}
        >
          <Volume2 className="w-3 h-3" />
          <span>ACOUSTIC ARRAY</span>
        </button>
      </div>

      {/* Main Track Details & Actions Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side Track Selector & Inspector */}
        <div className="w-80 border-r border-zinc-800 bg-zinc-950 p-3 flex flex-col space-y-3 overflow-y-auto">
          <div className="text-xs font-bold text-zinc-400 border-b border-zinc-800 pb-1 flex justify-between">
            <span>TRACK LIST ({tracks.size})</span>
            <span>SEL: {selectedTrackId || 'NONE'}</span>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {Array.from(tracks.values()).map((track) => {
              const isSelected = track.trackId === selectedTrackId;
              const isUnack = !track.userAcknowledged;

              return (
                <div
                  key={track.trackId}
                  onClick={() => onSelectTrack(track.trackId)}
                  className={`p-2 rounded border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-emerald-950/80 border-cyan-500 shadow-md shadow-cyan-950'
                      : isUnack
                      ? 'bg-amber-950/40 border-amber-700/60 animate-pulse'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-emerald-300 flex items-center space-x-1">
                      <span>{track.trackId}</span>
                      {isUnack && <span className="text-amber-400 text-[10px] bg-amber-900/60 px-1 rounded">NEW</span>}
                    </span>
                    <span className="text-zinc-400 text-[11px]">{track.estimatedDistance}m @ {track.estimatedBearing}°</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>SPD: {track.estimatedSpeed}m/s</span>
                    <span>ALT: {track.estimatedAltitude}m</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                      track.userClassification.startsWith('hostile') || track.userClassification === 'swarm'
                        ? 'bg-red-950 text-red-400 border border-red-800/50'
                        : track.userClassification === 'friendly'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800/50'
                        : track.userClassification === 'unknown'
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                    }`}>
                      {track.userClassification}
                    </span>

                    <span className="text-zinc-500">IFF: {track.iffDisplay}</span>
                  </div>

                  {/* AI Classifier badge */}
                  {(() => {
                    const pred: ClassifierPrediction | undefined = aiPredictions.get(track.trackId);
                    if (!pred || !pred.shouldDisplayHint) return null;
                    const hint = formatPredictionHint(pred);
                    const color = predictionColor(pred);
                    return (
                      <div
                        className="mt-1 flex items-center space-x-1 text-[10px] font-bold"
                        style={{ color }}
                      >
                        <Brain className="w-2.5 h-2.5" />
                        <span>{hint}</span>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Track Detailed Action Panel */}
        <div className="flex-1 p-4 bg-zinc-900/40 flex flex-col justify-between overflow-y-auto">
          {selectedTrack ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
                <div>
                  <h3 className="text-lg font-bold text-cyan-300 tracking-wider flex items-center space-x-2">
                    <Crosshair className="w-5 h-5 text-cyan-400" />
                    <span>TARGET MONITORING: {selectedTrack.trackId}</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Range: {selectedTrack.estimatedDistance}m | Bearing: {selectedTrack.estimatedBearing}° | Alt: {selectedTrack.estimatedAltitude}m
                  </p>
                </div>

                <button
                  onClick={() => onSlewCamera(selectedTrack.estimatedBearing)}
                  className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-bold rounded flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>SLEW CAMERA TO {Math.round(selectedTrack.estimatedBearing)}°</span>
                </button>
              </div>

              {/* AI Classifier full panel for selected track */}
              {(() => {
                const pred: ClassifierPrediction | undefined = aiPredictions.get(selectedTrack.trackId);
                if (!pred) return null;
                const topLabel = pred.label.replace(/_/g, ' ').toUpperCase();
                const ALL_LABELS = [
                  'hostile_attack', 'hostile_recon', 'hostile_swarm',
                  'friendly', 'civilian', 'bird'
                ] as const;
                return (
                  <div className="p-2.5 bg-zinc-950 rounded border border-purple-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-300">
                        <Brain className="w-3.5 h-3.5" />
                        <span>AI THREAT CLASSIFIER</span>
                        <span className="text-zinc-500 font-normal text-[10px]">(Random Forest · 10 trees)</span>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ color: predictionColor(pred), background: 'rgba(0,0,0,0.4)' }}
                      >
                        {topLabel} {Math.round(pred.confidence * 100)}%
                      </span>
                    </div>

                    {/* Per-class probability bars */}
                    <div className="space-y-1">
                      {ALL_LABELS.map((lbl) => {
                        const p = pred.classProbabilities[lbl] ?? 0;
                        const isTop = lbl === pred.label;
                        const barColor = lbl.startsWith('hostile')
                          ? '#ef4444'
                          : lbl === 'friendly' ? '#3b82f6'
                          : lbl === 'civilian' ? '#f59e0b'
                          : '#6b7280';
                        return (
                          <div key={lbl} className="flex items-center space-x-2">
                            <span className={`text-[10px] w-28 truncate ${ isTop ? 'text-white font-bold' : 'text-zinc-500'}`}>
                              {lbl.replace(/_/g, ' ')}
                            </span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
                              <div
                                className="h-full rounded transition-all duration-500"
                                style={{ width: `${Math.round(p * 100)}%`, background: barColor }}
                              />
                            </div>
                            <span className={`text-[10px] w-7 text-right ${ isTop ? 'text-white font-bold' : 'text-zinc-600'}`}>
                              {Math.round(p * 100)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-zinc-600 italic">
                      Hint: verify with EO/IR and RF before acting on AI suggestion.
                    </p>
                  </div>
                );
              })()}

              {/* Sensor Feeds Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 space-y-1">
                  <div className="text-zinc-400 font-bold flex justify-between">
                    <span>EO/IR VISUAL FEED</span>
                    <span className="text-cyan-400">{Math.round(selectedTrack.eoVisualConfidence * 100)}% CONF</span>
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {selectedTrack.eoVisualConfidence > 0.6 ? (
                      <span className="text-emerald-400 font-bold">CLEAR OPTICAL RECOGNITION ACTIVE</span>
                    ) : selectedTrack.eoVisualConfidence > 0.2 ? (
                      <span className="text-amber-400">PARTIAL OPTICAL CONTACT (SLEW CAMERA)</span>
                    ) : (
                      <span className="text-zinc-500">NO OPTICAL FEED IN RANGE</span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 space-y-1">
                  <div className="text-zinc-400 font-bold flex justify-between">
                    <span>RF SPECTRUM FEED</span>
                    <span className="text-amber-400">{selectedTrack.rfSignal ? `${selectedTrack.rfSignal.signalStrength}% SIG` : 'N/A'}</span>
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {selectedTrack.rfSignal ? (
                      <span className="text-amber-300">BAND: {selectedTrack.rfSignal.frequency} (CONTROL LINK DETECTED)</span>
                    ) : (
                      <span className="text-zinc-500">SILENT RF / AUTONOMOUS / BIRD</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-3">
                <div className="text-xs font-bold text-zinc-400">TRAINEE ACTIONS & COUNTERMEASURES</div>

                {/* Detect Button */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onDetectTrack(selectedTrack.trackId)}
                    disabled={selectedTrack.userAcknowledged}
                    className={`px-4 py-1.5 text-xs font-bold rounded border transition ${
                      selectedTrack.userAcknowledged
                        ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                        : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border-emerald-700'
                    }`}
                  >
                    {selectedTrack.userAcknowledged ? 'ACKNOWLEDGED [D]' : '1. DETECT / ACKNOWLEDGE [D]'}
                  </button>
                </div>

                {/* Classify Selector */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-400">2. CLASSIFY TARGET TYPE:</div>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { key: 'hostile_attack', label: 'ATTACK (KAMIKAZE)' },
                      { key: 'hostile_recon', label: 'RECON DRONE' },
                      { key: 'swarm', label: 'SWARM GROUP' },
                      { key: 'friendly', label: 'FRIENDLY UAV' },
                      { key: 'civilian', label: 'CIVILIAN DRONE' },
                      { key: 'bird', label: 'BIRD / DECOY' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() =>
                          onClassifyTrack(selectedTrack.trackId, item.key as UserClassification, 'high')
                        }
                        className={`px-2 py-1.5 rounded border text-[11px] font-bold text-center transition ${
                          selectedTrack.userClassification === item.key
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Engage Countermeasures */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-400">3. EXECUTE COUNTERMEASURE:</div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEngageTrack(selectedTrack.trackId, 'jam')}
                      disabled={jammerCooldown > 0}
                      className="flex-1 py-2 bg-amber-950 hover:bg-amber-900 disabled:bg-zinc-900 text-amber-300 disabled:text-zinc-600 border border-amber-700/60 disabled:border-zinc-800 rounded font-bold text-xs"
                    >
                      RF JAMMER [J]
                    </button>

                    <button
                      onClick={() => onEngageTrack(selectedTrack.trackId, 'soft_kill')}
                      className="flex-1 py-2 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/60 rounded font-bold text-xs"
                    >
                      SOFT-KILL / SPOOF [S]
                    </button>

                    <button
                      onClick={() => onEngageTrack(selectedTrack.trackId, 'hard_kill')}
                      disabled={ammoCount <= 0}
                      className="flex-1 py-2 bg-red-950 hover:bg-red-900 disabled:bg-zinc-900 text-red-300 disabled:text-zinc-600 border border-red-700/60 disabled:border-zinc-800 rounded font-bold text-xs"
                    >
                      HARD-KILL INTERCEPTOR [H]
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic">
              Click any radar blip or track in the sidebar to inspect sensors and deploy countermeasures.
            </div>
          )}

          {/* Bottom Tactical Event Terminal */}
          <div className="mt-4 bg-zinc-950 p-2.5 rounded border border-zinc-800 h-32 flex flex-col">
            <div className="text-[11px] font-bold text-zinc-500 border-b border-zinc-800 pb-1 mb-1">
              TACTICAL EVENT LOG (CHRONOLOGICAL)
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
              {eventsLog.slice(-20).map((evt) => (
                <div key={evt.id} className="flex space-x-2">
                  <span className="text-zinc-600">[{Math.floor(evt.time)}s]</span>
                  <span
                    className={
                      evt.type === 'alert'
                        ? 'text-red-400 font-bold'
                        : evt.type === 'warn'
                        ? 'text-amber-400'
                        : evt.type === 'success'
                        ? 'text-emerald-400'
                        : 'text-cyan-400'
                    }
                  >
                    {evt.text}
                  </span>
                </div>
              ))}
              <div ref={eventsEndRef} /></div>
          </div>
        </div>
      </div>
    </div>
  );
};
