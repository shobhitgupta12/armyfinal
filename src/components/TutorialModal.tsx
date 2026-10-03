import React, { useState } from 'react';
import { Shield, Eye, Radio, Crosshair, ArrowRight, CheckCircle2 } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to C-UAS Threat Simulator',
      icon: <Shield className="w-8 h-8 text-emerald-400" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed">
          <p>
            You are defending a high-value base asset located at the center of the tactical radar scope (0,0).
          </p>
          <p>
            Hostile kamikaze drones, recon quadcopters, and swarm formations may enter your sector. You must detect, classify, and neutralize threats before perimeter penetration!
          </p>
        </div>
      ),
    },
    {
      title: 'Step 1: Radar & EO/IR Slewing',
      icon: <Radio className="w-8 h-8 text-cyan-400" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed">
          <p>
            1. Click on any radar blip on the canvas or select it from the left Track List.
          </p>
          <p>
            2. Press <strong className="text-emerald-300">[D]</strong> or click <strong>DETECT</strong> to log the track timestamp.
          </p>
          <p>
            3. Use the <strong>SLEW CAMERA</strong> button to rotate your narrow optical EO/IR lens to inspect the target visual feed.
          </p>
        </div>
      ),
    },
    {
      title: 'Step 2: Threat Classification & Decoys',
      icon: <Eye className="w-8 h-8 text-amber-400" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed">
          <p>
            Not every blip is hostile! Birds, civilian hobbyists, and friendly patrol UAVs with faulty transponders operate in sector.
          </p>
          <ul className="list-disc pl-4 space-y-1 text-zinc-300">
            <li><strong>Bird Decoys:</strong> RCS &lt; 0.01 dBSM, low speed, erratic movement.</li>
            <li><strong>Friendly UAVs:</strong> Transponder squawk active. (Caution: intermittent squawk on faulty IFF!).</li>
            <li><strong>Hostile Attack:</strong> Fast direct path to base asset.</li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Step 3: Deploying Countermeasures',
      icon: <Crosshair className="w-8 h-8 text-red-400" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed">
          <p>Select the appropriate countermeasure based on threat type:</p>
          <ul className="list-disc pl-4 space-y-1 text-zinc-300">
            <li><strong>RF Jammer [J]:</strong> Effective against RF-linked drones within 1800m. Ineffective on autonomous fiber-optic drones!</li>
            <li><strong>Soft-Kill [S]:</strong> GPS Spoofing forces drones away from perimeter.</li>
            <li><strong>Kinetic Interceptor [H]:</strong> 100% effective hard-kill. Limited ammo (8 rounds). NEVER fire near friendly assets!</li>
            <li><strong>Sound Alarm [A]:</strong> Orders base personnel into cover, reducing damage by 50% if a drone impacts.</li>
          </ul>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 select-none">
      <div className="bg-zinc-900 border border-emerald-700/80 rounded-lg max-w-md w-full p-6 text-emerald-400 font-mono shadow-2xl">
        <div className="flex items-center space-x-3 border-b border-emerald-900 pb-3 mb-4">
          {currentStep.icon}
          <div>
            <span className="text-[10px] text-zinc-500 block">TACTICAL ORIENTATION ({step + 1}/{steps.length})</span>
            <h2 className="text-base font-bold text-emerald-300">{currentStep.title}</h2>
          </div>
        </div>

        <div className="min-h-[140px] text-zinc-300 mb-6">{currentStep.content}</div>

        <div className="flex justify-between items-center border-t border-zinc-800 pt-4">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="px-3 py-1.5 bg-zinc-800 disabled:opacity-30 text-zinc-300 text-xs font-bold rounded"
          >
            PREVIOUS
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-4 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold rounded flex items-center space-x-1"
            >
              <span>NEXT STEP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded flex items-center space-x-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ENTER SIMULATOR</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
