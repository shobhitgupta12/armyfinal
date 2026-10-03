import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface HotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 select-none">
      <div className="bg-zinc-900 border border-emerald-800 rounded-lg max-w-lg w-full p-6 text-emerald-400 font-mono shadow-2xl">
        <div className="flex justify-between items-center border-b border-emerald-900 pb-3 mb-4">
          <h2 className="text-lg font-bold flex items-center space-x-2 text-emerald-300">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            <span>TACTICAL KEYBOARD SHORTCUTS</span>
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950 rounded border border-zinc-800">
            <span className="font-bold text-cyan-300">D</span>
            <span className="text-zinc-300">Detect / Acknowledge Selected Track</span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950 rounded border border-zinc-800">
            <span className="font-bold text-amber-300">J</span>
            <span className="text-zinc-300">Deploy RF Jammer on Target</span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950 rounded border border-zinc-800">
            <span className="font-bold text-purple-300">S</span>
            <span className="text-zinc-300">Deploy Soft-Kill GPS Spoofing</span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950 rounded border border-zinc-800">
            <span className="font-bold text-red-400">H</span>
            <span className="text-zinc-300">Fire Kinetic Interceptor (Hard-Kill)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950 rounded border border-zinc-800">
            <span className="font-bold text-red-500">A</span>
            <span className="text-zinc-300">Sound Base Alarm (Personnel Take Cover)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950 rounded border border-zinc-800">
            <span className="font-bold text-emerald-300">1 - 6</span>
            <span className="text-zinc-300">Quick Classify Target Type</span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950 rounded border border-zinc-800">
            <span className="font-bold text-zinc-300">SPACE</span>
            <span className="text-zinc-300">Pause / Resume Simulation</span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950 rounded border border-zinc-800">
            <span className="font-bold text-zinc-300">ESC</span>
            <span className="text-zinc-300">Deselect Active Track</span>
          </div>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold rounded"
          >
            CLOSE HELP
          </button>
        </div>
      </div>
    </div>
  );
};
