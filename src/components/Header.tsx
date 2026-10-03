import React, { useEffect, useState } from 'react';
import type { CurrentUser } from '../storage/storageService';
import {
  Shield,
  Target,
  BarChart3,
  Trophy,
  HelpCircle,
  RotateCcw,
  User,
  Radio,
  Activity,
} from 'lucide-react';

interface HeaderProps {
  currentScreen: 'home' | 'scenarios' | 'simulator' | 'debrief' | 'aar' | 'leaderboard';
  onNavigate: (screen: 'home' | 'scenarios' | 'simulator' | 'debrief' | 'aar' | 'leaderboard') => void;
  currentUser: CurrentUser;
  onOpenHotkeys: () => void;
  onResetData: () => void;
  hasActiveSession?: boolean;
}

const NavBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClass?: string;
  pulse?: boolean;
}> = ({ active, onClick, icon, label, activeClass = 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60', pulse = false }) => (
  <button
    onClick={onClick}
    className={`btn-tactical flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all duration-200 border ${
      active
        ? `${activeClass} shadow-sm ${pulse ? 'animate-pulse' : ''}`
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 border-transparent hover:border-zinc-700/40'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  currentUser,
  onOpenHotkeys,
  onResetData,
  hasActiveSession = false,
}) => {
  const [timeStr, setTimeStr] = useState(() => formatLocalTime());

  useEffect(() => {
    const clock = window.setInterval(() => setTimeStr(formatLocalTime()), 30_000);
    return () => window.clearInterval(clock);
  }, []);

  return (
    <header
      className="bg-[#071117]/95 border-b border-emerald-900/50 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 font-mono select-none"
      style={{ minHeight: '60px', borderBottom: '1px solid rgba(16,185,129,0.25)' }}
    >
      {/* Brand */}
      <div
        onClick={() => onNavigate('home')}
        className="flex items-center space-x-3 cursor-pointer group py-2 min-w-0"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center relative"
          style={{ background: 'linear-gradient(135deg, #064e3b, #022c22)', border: '1px solid rgba(16,185,129,0.4)' }}
        >
          <Shield className="w-4.5 h-4.5 text-emerald-400" style={{ width: 18, height: 18 }} />
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"
            style={{ animation: 'blink 2s infinite' }}
          />
        </div>
        <div className="leading-none">
          <div className="text-[12px] sm:text-[13px] font-extrabold tracking-[0.12em] text-emerald-300 group-hover:text-emerald-200 transition-colors truncate" style={{ fontFamily: 'Rajdhani, Share Tech Mono, monospace' }}>
            GHOST PROTOCOL C-UAS
          </div>
          <div className="text-[9px] text-emerald-700 tracking-widest">SIH-26247 • THREAT SIMULATION TRAINER</div>
        </div>
      </div>

      {/* Live Status Ticker */}
      <div className="hidden lg:flex items-center space-x-4 text-[9px] text-zinc-600 tracking-widest">
        <div className="flex items-center space-x-1.5">
          <span className="status-dot online" />
          <span>SIMULATION ENGINE: ONLINE</span>
        </div>
        <div className="h-3 w-px bg-zinc-800" />
        <div className="flex items-center space-x-1.5">
          <Activity className="w-3 h-3 text-emerald-800" />
          <span>LOCAL ZULU: {timeStr}</span>
        </div>
        <div className="h-3 w-px bg-zinc-800" />
        <div className="flex items-center space-x-1.5">
          <span className="status-dot standby" />
          <span>OFFLINE MODE ACTIVE</span>
        </div>
      </div>

      {/* Nav Tabs */}
      <nav className="order-3 md:order-none w-full md:w-auto flex items-center space-x-0.5 p-0.5 rounded-lg text-xs overflow-x-auto" style={{ background: 'rgba(4,12,8,0.9)', border: '1px solid rgba(16,185,129,0.1)' }}>
        <NavBtn
          active={currentScreen === 'home'}
          onClick={() => onNavigate('home')}
          icon={<User style={{ width: 13, height: 13 }} />}
          label="PROFILE"
        />
        <NavBtn
          active={currentScreen === 'scenarios'}
          onClick={() => onNavigate('scenarios')}
          icon={<Target style={{ width: 13, height: 13 }} />}
          label="MISSIONS"
        />
        {hasActiveSession && (
          <NavBtn
            active={currentScreen === 'simulator'}
            onClick={() => onNavigate('simulator')}
            icon={<Radio style={{ width: 13, height: 13 }} />}
            label="LIVE SIM"
            activeClass="bg-red-950/80 text-red-300 border-red-700/50"
            pulse={true}
          />
        )}
        <NavBtn
          active={currentScreen === 'aar'}
          onClick={() => onNavigate('aar')}
          icon={<BarChart3 style={{ width: 13, height: 13 }} />}
          label="AAR"
        />
        <NavBtn
          active={currentScreen === 'leaderboard'}
          onClick={() => onNavigate('leaderboard')}
          icon={<Trophy style={{ width: 13, height: 13 }} />}
          label="RANKINGS"
        />
      </nav>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 text-xs py-2.5">
        <div
          className="hidden md:flex"
        >
        <div
          className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}
        >
          <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-700/50 flex items-center justify-center">
            <User className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="leading-none">
            <div className="font-bold text-zinc-100 text-[11px]">{currentUser.name}</div>
            <div className="text-[9px] text-zinc-500">{currentUser.unit}</div>
          </div>
        </div>
        </div>

        <button
          onClick={onOpenHotkeys}
          title="Keyboard Shortcuts [?]"
          className="btn-tactical p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors"
          style={{ background: 'rgba(4,12,8,0.8)', border: '1px solid rgba(16,185,129,0.12)' }}
        >
          <HelpCircle style={{ width: 15, height: 15 }} />
        </button>

        <button
          onClick={onResetData}
          title="Reset Demo Data"
          className="btn-tactical p-1.5 rounded-lg text-zinc-600 hover:text-red-400 transition-colors"
          style={{ background: 'rgba(4,12,8,0.8)', border: '1px solid rgba(16,185,129,0.12)' }}
        >
          <RotateCcw style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </header>
  );
};

function formatLocalTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}
;
