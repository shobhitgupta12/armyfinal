import React, { useState } from 'react';
import type { ScenarioConfig, TimeOfDay, WeatherCondition, TerrainType } from '../types';
import { SCRIPTED_SCENARIOS } from '../scenarios/scripted';
import { generateProceduralScenario } from '../scenarios/generator';
import { computeAdaptiveDifficulty } from '../adaptive/difficulty';
import { storageService, type CurrentUser } from '../storage/storageService';
import { Target, Zap, Play, Sparkles } from 'lucide-react';

interface ScenarioSelectPageProps {
  currentUser: CurrentUser;
  onSelectScenario: (scenario: ScenarioConfig) => void;
}

export const ScenarioSelectPage: React.FC<ScenarioSelectPageProps> = ({
  currentUser,
  onSelectScenario,
}) => {
  const [tab, setTab] = useState<'scripted' | 'procedural' | 'adaptive'>('scripted');

  // Procedural Generator State
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 899999) + 100000);
  const [difficulty, setDifficulty] = useState<number>(5);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [weather, setWeather] = useState<WeatherCondition>('clear');
  const [terrain, setTerrain] = useState<TerrainType>('rural');

  // Adaptive Recommendation
  const userSessions = storageService.getSessions().filter((s) => s.traineeName === currentUser.name);
  const profiles = storageService.getProfiles();
  const currentDiff = profiles.find((p) => p.name === currentUser.name)?.currentDifficulty ?? 3;
  const adaptiveRec = computeAdaptiveDifficulty(userSessions, currentDiff);

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 899999) + 100000);
  };

  const handleLaunchProcedural = () => {
    const sc = generateProceduralScenario({
      seed,
      difficulty,
      timeOfDay,
      weather,
      terrain,
    });
    onSelectScenario(sc);
  };

  const handleLaunchAdaptive = () => {
    const newSeed = Math.floor(Math.random() * 899999) + 100000;
    const sc = generateProceduralScenario({
      seed: newSeed,
      difficulty: adaptiveRec.nextDifficulty,
    });
    onSelectScenario(sc);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-zinc-950 text-emerald-400 font-mono p-6 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-wider text-emerald-300 flex items-center space-x-2">
              <Target className="w-6 h-6 text-emerald-400" />
              <span>SCENARIO & MISSION SELECTION</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Select a pre-scripted tactical mission, generate a custom seed scenario, or run Adaptive Mode.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex space-x-2 mt-4 md:mt-0 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setTab('scripted')}
              className={`px-4 py-2 rounded font-bold transition ${
                tab === 'scripted'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              SCRIPTED (5 PRESETS)
            </button>
            <button
              onClick={() => setTab('procedural')}
              className={`px-4 py-2 rounded font-bold transition ${
                tab === 'procedural'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              PROCEDURAL GENERATOR
            </button>
            <button
              onClick={() => setTab('adaptive')}
              className={`px-4 py-2 rounded font-bold transition ${
                tab === 'adaptive'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ADAPTIVE MODE (REC)
            </button>
          </div>
        </div>

        {/* Tab 1: Scripted Scenarios */}
        {tab === 'scripted' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SCRIPTED_SCENARIOS.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-emerald-600 rounded-lg p-5 flex flex-col justify-between space-y-4 shadow-xl transition transform hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800">
                      DIFF: {scenario.difficulty}/10
                    </span>
                    <span className="text-[10px] text-zinc-500">SEED: {scenario.seed}</span>
                  </div>

                  <h3 className="text-base font-bold text-emerald-200">{scenario.name}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed min-h-[48px]">
                    {scenario.description}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 bg-zinc-950 text-zinc-300 rounded border border-zinc-800 uppercase">
                      {scenario.environment.time}
                    </span>
                    <span className="px-2 py-0.5 bg-zinc-950 text-zinc-300 rounded border border-zinc-800 uppercase">
                      {scenario.environment.weather}
                    </span>
                    <span className="px-2 py-0.5 bg-zinc-950 text-zinc-300 rounded border border-zinc-800 uppercase">
                      {scenario.environment.terrain}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectScenario(scenario)}
                  className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold rounded flex items-center justify-center space-x-2 transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>LAUNCH MISSION</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Procedural Seed Generator */}
        {tab === 'procedural' && (
          <div className="bg-zinc-900 border border-cyan-900/60 rounded-lg p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-cyan-300 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>PROCEDURAL SCENARIO ENGINE (MULBERRY32 PRNG)</span>
              </h2>

              <div className="text-xs text-cyan-400 font-bold bg-cyan-950 px-3 py-1 rounded border border-cyan-800">
                SHAREABLE SEED: {seed}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Seed & Difficulty */}
              <div className="space-y-4 bg-zinc-950 p-4 rounded border border-zinc-800">
                <div>
                  <label className="block text-zinc-400 mb-1 font-bold">SEED NUMBER:</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 100000)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 px-3 py-2 rounded text-cyan-300 font-bold focus:outline-none"
                    />
                    <button
                      onClick={handleRandomizeSeed}
                      className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded font-bold"
                    >
                      RANDOMIZE
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1 font-bold">
                    <span>DIFFICULTY LEVEL:</span>
                    <span className="text-cyan-300 font-bold">{difficulty} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={difficulty}
                    onChange={(e) => setDifficulty(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Environment Controls */}
              <div className="space-y-4 bg-zinc-950 p-4 rounded border border-zinc-800">
                <div>
                  <label className="block text-zinc-400 mb-1 font-bold">TIME OF DAY:</label>
                  <div className="flex space-x-2">
                    {(['day', 'night'] as TimeOfDay[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeOfDay(t)}
                        className={`flex-1 py-1.5 rounded border font-bold uppercase transition ${
                          timeOfDay === t
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-bold">WEATHER CONDITIONS:</label>
                  <div className="flex space-x-2">
                    {(['clear', 'fog', 'rain'] as WeatherCondition[]).map((w) => (
                      <button
                        key={w}
                        onClick={() => setWeather(w)}
                        className={`flex-1 py-1.5 rounded border font-bold uppercase transition ${
                          weather === w
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-bold">TERRAIN TYPE:</label>
                  <div className="flex space-x-2">
                    {(['rural', 'urban', 'mountain'] as TerrainType[]).map((tr) => (
                      <button
                        key={tr}
                        onClick={() => setTerrain(tr)}
                        className={`flex-1 py-1.5 rounded border font-bold uppercase transition ${
                          terrain === tr
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {tr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunchProcedural}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm rounded flex items-center justify-center space-x-2 transition shadow-lg shadow-cyan-950"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>GENERATE & LAUNCH PROCEDURAL MISSION</span>
            </button>
          </div>
        )}

        {/* Tab 3: Adaptive Training Mode */}
        {tab === 'adaptive' && (
          <div className="bg-zinc-900 border border-amber-900/80 rounded-lg p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-amber-300 flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>DYNAMIC ADAPTIVE DIFFICULTY ENGINE</span>
              </h2>
              <span className="text-xs text-amber-400 font-bold bg-amber-950 px-3 py-1 rounded border border-amber-800">
                RECOMMENDED DIFFICULTY: LEVEL {adaptiveRec.nextDifficulty}/10
              </span>
            </div>

            <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-3 text-xs">
              <div className="text-zinc-300 font-bold leading-relaxed">
                {adaptiveRec.explanation}
              </div>

              {adaptiveRec.targetWeakness !== 'none' && (
                <div className="p-2.5 bg-amber-950/40 rounded border border-amber-800/60 text-amber-300">
                  <span className="font-bold">TARGETED SKILL FOCUS: </span>
                  <span className="uppercase">{adaptiveRec.targetWeakness}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleLaunchAdaptive}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm rounded flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-950"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>LAUNCH ADAPTIVE MISSION (LEVEL {adaptiveRec.nextDifficulty})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
