import React, { useState } from 'react';
import { storageService, type CurrentUser } from '../storage/storageService';
import { Shield, Target, Zap, BarChart3, Trophy, Play, Radio, Activity, ChevronRight, AlertTriangle } from 'lucide-react';

interface HomePageProps {
  currentUser: CurrentUser;
  onSaveProfile: (user: CurrentUser) => void;
  onStartAdaptive: () => void;
  onGoToScenarios: () => void;
  onGoToAAR: () => void;
  onGoToLeaderboard: () => void;
}

const SkillBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px]">
      <span className="text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className={`font-bold ${color}`}>{value}%</span>
    </div>
    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.1)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color.includes('emerald') ? 'linear-gradient(90deg, #065f46, #10b981)' : color.includes('cyan') ? 'linear-gradient(90deg, #164e63, #06b6d4)' : color.includes('amber') ? 'linear-gradient(90deg, #78350f, #f59e0b)' : 'linear-gradient(90deg, #4a1d96, #a855f7)' }}
      />
    </div>
  </div>
);

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  color: string;
  borderColor: string;
  bgIcon: string;
  onClick: () => void;
}> = ({ icon, title, desc, cta, color, borderColor, bgIcon, onClick }) => (
  <div
    onClick={onClick}
    className="group relative rounded-xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col justify-between"
    style={{
      background: 'linear-gradient(135deg, rgba(4,14,9,0.98), rgba(2,8,5,0.99))',
      border: `1px solid ${borderColor}`,
      boxShadow: `0 4px 30px rgba(0,0,0,0.5)`,
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 20px rgba(0,0,0,0.6)`; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'; }}
  >
    {/* Ambient bg glow */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(ellipse at top left, ${bgIcon}08 0%, transparent 70%)` }} />
    <div className="absolute top-3 right-3 text-[48px] opacity-5 pointer-events-none select-none font-black">{cta[0]}</div>

    <div className="space-y-3 relative">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${bgIcon}15`, border: `1px solid ${bgIcon}30` }}>
        <span style={{ color: bgIcon }}>{icon}</span>
      </div>
      <div>
        <h3 className={`text-sm font-extrabold tracking-wide ${color}`}>{title}</h3>
        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{desc}</p>
      </div>
    </div>

    <span className={`mt-4 inline-flex items-center space-x-1 text-[11px] font-bold tracking-widest ${color} opacity-70 group-hover:opacity-100 transition-opacity`}>
      <span>{cta}</span>
      <ChevronRight style={{ width: 12, height: 12 }} />
    </span>
  </div>
);

export const HomePage: React.FC<HomePageProps> = ({
  currentUser,
  onSaveProfile,
  onStartAdaptive,
  onGoToScenarios,
  onGoToAAR,
  onGoToLeaderboard,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [unit, setUnit] = useState(currentUser.unit);
  const [isEditing, setIsEditing] = useState(false);
  const profiles = storageService.getProfiles();
  const activeProfile = profiles.find((p) => p.name === currentUser.name) || {
    name: currentUser.name,
    unit: currentUser.unit,
    sessionsCount: 0,
    avgScore: 0,
    topScore: 0,
    skillProfile: { detection: 0, classification: 0, engagement: 0, efficiency: 0 },
    currentDifficulty: 3,
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const updated = { name: name.trim(), unit: unit.trim() || 'Alpha Squad' };
    onSaveProfile(updated);
    setIsEditing(false);
  };

  const difficultyColor = activeProfile.currentDifficulty >= 7 ? '#ef4444' : activeProfile.currentDifficulty >= 4 ? '#f59e0b' : '#10b981';
  const sessions = storageService.getSessions();
  const recentSession = sessions.filter(s => s.traineeName === currentUser.name)[0];

  return (
    <div className="min-h-[calc(100vh-52px)] bg-[#020408] text-emerald-400 font-mono select-none grid-bg flex flex-col">
      {/* TOP STATUS TICKER */}
      <div className="border-b border-emerald-900/30 bg-[#030b07] py-1.5 ticker-wrap overflow-hidden">
        <div className="ticker-content text-[9px] text-emerald-800 tracking-widest whitespace-nowrap">
          &nbsp;&nbsp;&nbsp;★ SYSTEM INITIALIZED — GHOST PROTOCOL v4.2 ACTIVE&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;PS-26247 • MINISTRY OF DEFENCE (MoD) • DEFENCE SERVICES STAFF COLLEGE&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;SIMULATION ENGINE ONLINE — ALL SENSOR ARRAYS CALIBRATED&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;TRAINEE PROFILE LOADED — ADAPTIVE DIFFICULTY ENGINE ENGAGED&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;AI DECISION-TREE SCORING ACTIVE — AFTER-ACTION REVIEW SYSTEM READY&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── HERO BANNER ── */}
          <div
            className="relative rounded-2xl overflow-hidden p-7"
            style={{
              background: 'linear-gradient(135deg, rgba(4,20,12,0.97) 0%, rgba(6,30,18,0.95) 50%, rgba(3,15,10,0.97) 100%)',
              border: '1px solid rgba(16,185,129,0.3)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
            {/* Glow orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-3">
                {/* Classification badge */}
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em]" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span className="text-emerald-600">SIH 2026</span>
                  <span className="w-px h-3 bg-emerald-900" />
                  <span className="text-emerald-500">PS-26247</span>
                  <span className="w-px h-3 bg-emerald-900" />
                  <span className="text-emerald-600">MINISTRY OF DEFENCE</span>
                </div>

                <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-none" style={{ fontFamily: 'Exo 2, Rajdhani, monospace' }}>
                  <span className="text-emerald-300">AI-ENABLED DRONE</span>
                  <br />
                  <span className="text-emerald-500">&amp; COUNTER-DRONE</span>
                  <br />
                  <span className="text-zinc-400 text-2xl font-bold">THREAT SIMULATION TRAINER</span>
                </h1>

                <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
                  Train military personnel to detect, classify, and neutralize drone threats across day/night, urban/rural, and degraded-sensor environments.
                  Adaptive difficulty, decision-tree scoring, and full After-Action Review analytics.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {['RADAR', 'EO/IR', 'RF DETECT', 'ACOUSTIC', 'SWARM AI', 'AAR REPLAY'].map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded text-[9px] font-bold tracking-widest" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', color: '#10b981' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                <button
                  onClick={onStartAdaptive}
                  className="btn-tactical group flex items-center space-x-3 px-6 py-3.5 rounded-xl font-extrabold text-black text-sm tracking-wide transition-all duration-200 hover:scale-105 active:scale-100"
                  style={{ background: 'linear-gradient(135deg, #10b981, #00ff9d)' }}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>START ADAPTIVE TRAINING</span>
                </button>

                <div className="text-[10px] text-zinc-600 tracking-widest text-right">
                  ADAPTIVE DIFFICULTY LEVEL:{' '}
                  <span className="font-bold" style={{ color: difficultyColor }}>{activeProfile.currentDifficulty}/10</span>
                </div>

                {/* System status mini panel */}
                <div className="w-full p-3 rounded-xl space-y-1.5" style={{ background: 'rgba(2,8,5,0.8)', border: '1px solid rgba(16,185,129,0.1)' }}>
                  {[
                    { label: 'SIMULATION ENGINE', ok: true },
                    { label: 'SENSOR ARRAY', ok: true },
                    { label: 'AI SCORING TREE', ok: true },
                    { label: 'AAR MODULE', ok: true },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-[9px] tracking-widest">
                      <span className="text-zinc-600">{item.label}</span>
                      <div className="flex items-center space-x-1">
                        <span className={`status-dot ${item.ok ? 'online' : 'offline'}`} />
                        <span className={item.ok ? 'text-emerald-600' : 'text-red-600'}>{item.ok ? 'OPERATIONAL' : 'FAULT'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'READINESS INDEX', value: `${activeProfile.avgScore || 0}%`, note: 'rolling performance', icon: <Activity className="w-4 h-4" />, color: 'text-emerald-300' },
              { label: 'CURRENT FOCUS', value: activeProfile.skillProfile.classification <= activeProfile.skillProfile.detection ? 'CLASSIFY' : 'DETECT', note: 'adaptive coaching target', icon: <Target className="w-4 h-4" />, color: 'text-cyan-300' },
              { label: 'MISSIONS LOGGED', value: activeProfile.sessionsCount, note: 'local training record', icon: <BarChart3 className="w-4 h-4" />, color: 'text-amber-300' },
              { label: 'POSTURE', value: activeProfile.currentDifficulty >= 7 ? 'ELEVATED' : 'READY', note: `level ${activeProfile.currentDifficulty}/10`, icon: <Shield className="w-4 h-4" />, color: activeProfile.currentDifficulty >= 7 ? 'text-red-300' : 'text-sky-300' },
            ].map((metric) => (
              <div key={metric.label} className="metric-tile p-3 flex items-center gap-3">
                <span className={`${metric.color} opacity-90`}>{metric.icon}</span>
                <div className="min-w-0">
                  <div className="text-[9px] text-zinc-500 tracking-[0.15em] truncate">{metric.label}</div>
                  <div className={`text-sm font-extrabold ${metric.color}`}>{metric.value}</div>
                  <div className="text-[9px] text-zinc-600 truncate">{metric.note}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── MAIN GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

            {/* TRAINEE PROFILE CARD */}
            <div className="lg:col-span-1 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(4,15,10,0.99), rgba(2,8,5,0.99))', border: '1px solid rgba(16,185,129,0.18)' }}>
              {/* Header strip */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(16,185,129,0.1)', background: 'rgba(16,185,129,0.03)' }}>
                <div className="flex items-center space-x-2">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-500">OPERATOR ID</span>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-[9px] text-zinc-500 hover:text-zinc-300 tracking-widest transition-colors"
                >
                  {isEditing ? '[ CANCEL ]' : '[ EDIT ]'}
                </button>
              </div>

              <div className="p-4">
                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-3">
                    <div>
                      <label className="block text-[9px] text-zinc-500 tracking-widest mb-1.5">TRAINEE NAME / RANK</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs text-emerald-300 focus:outline-none"
                        style={{ background: 'rgba(2,8,5,0.9)', border: '1px solid rgba(16,185,129,0.3)' }}
                        placeholder="e.g. SGT. Vance Miller"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-500 tracking-widest mb-1.5">UNIT / SQUAD</label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs text-emerald-300 focus:outline-none"
                        style={{ background: 'rgba(2,8,5,0.9)', border: '1px solid rgba(16,185,129,0.3)' }}
                        placeholder="e.g. Alpha Squad 1st Platoon"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg text-[11px] font-bold text-black tracking-widest btn-tactical"
                      style={{ background: 'linear-gradient(90deg, #065f46, #10b981)' }}
                    >
                      SAVE PROFILE
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* Avatar + name */}
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-emerald-300" style={{ background: 'linear-gradient(135deg, #022c22, #064e3b)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        {currentUser.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-100 text-sm leading-tight">{currentUser.name}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{currentUser.unit}</div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'SESSIONS', value: activeProfile.sessionsCount, color: 'text-cyan-400' },
                        { label: 'AVG SCORE', value: `${activeProfile.avgScore}%`, color: 'text-emerald-400' },
                        { label: 'TOP SCORE', value: `${activeProfile.topScore}%`, color: 'text-amber-400' },
                        { label: 'DIFF LEVEL', value: `${activeProfile.currentDifficulty}/10`, color: 'text-purple-400' },
                      ].map(stat => (
                        <div key={stat.label} className="p-2.5 rounded-lg space-y-0.5" style={{ background: 'rgba(2,8,5,0.8)', border: '1px solid rgba(16,185,129,0.08)' }}>
                          <div className="text-[9px] text-zinc-600 tracking-widest">{stat.label}</div>
                          <div className={`text-base font-extrabold ${stat.color}`}>{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Skill bars */}
                    <div className="space-y-2.5 pt-1">
                      <div className="text-[9px] text-zinc-600 tracking-widest border-t border-zinc-900 pt-3">SKILL PROFILE</div>
                      <SkillBar label="Detection" value={activeProfile.skillProfile.detection} color="text-emerald-400" />
                      <SkillBar label="Classification" value={activeProfile.skillProfile.classification} color="text-cyan-400" />
                      <SkillBar label="Engagement" value={activeProfile.skillProfile.engagement} color="text-amber-400" />
                      <SkillBar label="Efficiency" value={activeProfile.skillProfile.efficiency} color="text-purple-400" />
                    </div>

                    {/* Recent session */}
                    {recentSession && (
                      <div className="p-2.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
                        <div className="text-[9px] text-zinc-600 tracking-widest mb-1">LAST SESSION</div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400 truncate max-w-27.5">{recentSession.scenarioName}</span>
                          <span className="font-bold text-emerald-400">{recentSession.grade} ({recentSession.finalScore}%)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* FEATURE CARDS GRID */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FeatureCard
                icon={<Zap className="w-5 h-5" />}
                title="ADAPTIVE TRAINING MODE"
                desc="AI engine dynamically scales difficulty based on rolling performance. Targets your weakest skill areas automatically."
                cta="LAUNCH ADAPTIVE"
                color="text-emerald-400"
                borderColor="rgba(16,185,129,0.25)"
                bgIcon="#10b981"
                onClick={onStartAdaptive}
              />
              <FeatureCard
                icon={<Target className="w-5 h-5" />}
                title="SCENARIO LIBRARY"
                desc="5 scripted tactical missions + unlimited procedural scenarios via Mulberry32 PRNG seed generator."
                cta="BROWSE MISSIONS"
                color="text-cyan-400"
                borderColor="rgba(6,182,212,0.2)"
                bgIcon="#06b6d4"
                onClick={onGoToScenarios}
              />
              <FeatureCard
                icon={<BarChart3 className="w-5 h-5" />}
                title="AFTER-ACTION REVIEW"
                desc="Session history, skill radar charts, interactive replay viewer with ground truth overlay, and PDF/JSON export."
                cta="VIEW ANALYTICS"
                color="text-amber-400"
                borderColor="rgba(245,158,11,0.2)"
                bgIcon="#f59e0b"
                onClick={onGoToAAR}
              />
              <FeatureCard
                icon={<Trophy className="w-5 h-5" />}
                title="UNIT LEADERBOARD"
                desc="Comparative rankings across platoons, squad weakness heatmaps, and C-UAS qualification badges."
                cta="VIEW RANKINGS"
                color="text-purple-400"
                borderColor="rgba(168,85,247,0.2)"
                bgIcon="#a855f7"
                onClick={onGoToLeaderboard}
              />

              {/* THREAT TYPES INFO CARD */}
              <div className="sm:col-span-2 rounded-xl p-5" style={{ background: 'linear-gradient(135deg, rgba(4,14,9,0.98), rgba(2,8,5,0.99))', border: '1px solid rgba(16,185,129,0.12)' }}>
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500">SIMULATED THREAT CATEGORIES</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'KAMIKAZE DRONE', color: '#ef4444', icon: '⊕', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
                    { label: 'RECON QUADCOPTER', color: '#f97316', icon: '◎', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
                    { label: 'SWARM FORMATION', color: '#ef4444', icon: '⋯', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' },
                    { label: 'FRIENDLY UAV', color: '#3b82f6', icon: '✦', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
                    { label: 'CIVILIAN DRONE', color: '#eab308', icon: '○', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)' },
                    { label: 'BIRD / DECOY', color: '#6b7280', icon: '~', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
                  ].map(t => (
                    <div key={t.label} className="p-2.5 rounded-lg text-center space-y-1.5" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
                      <div className="text-xl" style={{ color: t.color }}>{t.icon}</div>
                      <div className="text-[9px] font-bold tracking-widest" style={{ color: t.color }}>{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-emerald-900/20 py-2.5 text-center text-[9px] text-zinc-700 tracking-widest" style={{ background: 'rgba(2,6,4,0.8)' }}>
        GHOST PROTOCOL C-UAS SIMULATOR &nbsp;•&nbsp; SIH 2026 PS-26247 &nbsp;•&nbsp; MINISTRY OF DEFENCE &nbsp;•&nbsp; OFFLINE MODE &nbsp;•&nbsp; REACT + VITE ENGINE
      </div>
    </div>
  );
};


