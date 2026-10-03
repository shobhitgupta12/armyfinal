import React, { useState } from 'react';
import { storageService } from '../storage/storageService';
import { Trophy, Shield, Users, Flame } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const [selectedUnit, setSelectedUnit] = useState<string>('All Units');

  const profiles = storageService.getProfiles();
  const filteredProfiles = profiles
    .filter((p) => selectedUnit === 'All Units' || p.unit === selectedUnit)
    .sort((a, b) => b.avgScore - a.avgScore);

  // Aggregate unit stats
  const totalSessions = filteredProfiles.reduce((acc, p) => acc + p.sessionsCount, 0);
  const overallAvg = Math.round(
    filteredProfiles.reduce((acc, p) => acc + p.avgScore, 0) / (filteredProfiles.length || 1)
  );

  const topPerformer = filteredProfiles[0]?.name || 'N/A';

  return (
    <div className="min-h-[calc(100vh-60px)] bg-zinc-950 text-emerald-400 font-mono p-6 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-wider text-purple-300 flex items-center space-x-2">
              <Trophy className="w-6 h-6 text-purple-400" />
              <span>UNIT LEADERBOARD & READINESS INDEX</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Comparative ranking of C-UAS operators across platoons and squads.
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-zinc-900 border border-purple-800 text-purple-300 px-3 py-1.5 rounded text-xs font-bold focus:outline-none"
            >
              <option value="All Units">ALL UNITS (EVERY PLATOON)</option>
              <option value="Alpha Squad 1st Platoon">ALPHA SQUAD 1ST PLATOON</option>
              <option value="Bravo Battery 2nd Platoon">BRAVO BATTERY 2ND PLATOON</option>
            </select>
          </div>
        </div>

        {/* Aggregated Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-purple-900/60 rounded-lg p-5 flex items-center space-x-4 shadow-xl">
            <div className="p-3 bg-purple-950 rounded-lg border border-purple-700 text-purple-300">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block">UNIT READINESS INDEX</span>
              <span className="text-3xl font-extrabold text-purple-300">{overallAvg}%</span>
              <span className="text-[10px] text-zinc-500 block">Operational Readiness Rating</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-amber-900/60 rounded-lg p-5 flex items-center space-x-4 shadow-xl">
            <div className="p-3 bg-amber-950 rounded-lg border border-amber-700 text-amber-300">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block">TOP PERFORMING OPERATOR</span>
              <span className="text-xl font-extrabold text-amber-300">{topPerformer}</span>
              <span className="text-[10px] text-zinc-500 block">Highest Rolling Average</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-cyan-900/60 rounded-lg p-5 flex items-center space-x-4 shadow-xl">
            <div className="p-3 bg-cyan-950 rounded-lg border border-cyan-700 text-cyan-300">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block">TOTAL DRILLS COMPLETED</span>
              <span className="text-3xl font-extrabold text-cyan-300">{totalSessions}</span>
              <span className="text-[10px] text-zinc-500 block">Across Active Roster</span>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-zinc-300">OPERATOR RANKINGS & SKILL PROFILES</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase">
                  <th className="py-3 px-4">RANK</th>
                  <th className="py-3 px-4">OPERATOR NAME</th>
                  <th className="py-3 px-4">UNIT / SQUAD</th>
                  <th className="py-3 px-4">DRILLS</th>
                  <th className="py-3 px-4">AVG SCORE</th>
                  <th className="py-3 px-4">TOP SCORE</th>
                  <th className="py-3 px-4">WEAKEST SKILL AREA</th>
                  <th className="py-3 px-4 text-right">QUALIFICATION BADGE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredProfiles.map((p, idx) => {
                  const rank = idx + 1;
                  const skills = [
                    { name: 'Detection', val: p.skillProfile.detection },
                    { name: 'Classification', val: p.skillProfile.classification },
                    { name: 'Engagement', val: p.skillProfile.engagement },
                    { name: 'Efficiency', val: p.skillProfile.efficiency },
                  ].sort((a, b) => a.val - b.val);

                  const weakest = skills[0];

                  return (
                    <tr key={p.name} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3.5 px-4 font-extrabold">
                        {rank === 1 ? (
                          <span className="text-amber-400 text-sm flex items-center space-x-1">
                            <Trophy className="w-4 h-4" />
                            <span>#1</span>
                          </span>
                        ) : rank === 2 ? (
                          <span className="text-zinc-300 font-bold">#2</span>
                        ) : rank === 3 ? (
                          <span className="text-amber-600 font-bold">#3</span>
                        ) : (
                          <span className="text-zinc-500">#{rank}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-zinc-100">{p.name}</td>
                      <td className="py-3.5 px-4 text-zinc-400">{p.unit}</td>
                      <td className="py-3.5 px-4 text-cyan-400 font-bold">{p.sessionsCount}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-extrabold">{p.avgScore}%</td>
                      <td className="py-3.5 px-4 text-purple-400 font-bold">{p.topScore}%</td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        <span className="px-2 py-0.5 bg-zinc-950 rounded border border-zinc-800 text-[10px] uppercase">
                          {weakest.name} ({weakest.val}%)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${
                          p.avgScore >= 90
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : p.avgScore >= 80
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {p.avgScore >= 90 ? 'MASTER C-UAS OPERATOR' : p.avgScore >= 80 ? 'EXPERT INTERCEPTOR' : 'QUALIFIED OPERATOR'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
