import { useState } from 'react';
import { storageService, type CurrentUser } from './storage/storageService';
import type { ScenarioConfig, SessionResult } from './types';
import { generateProceduralScenario } from './scenarios/generator';
import { computeAdaptiveDifficulty } from './adaptive/difficulty';
import { getScenarioBias } from './ai/skillModel';
import { Header } from './components/Header';
import { HotkeysModal } from './components/HotkeysModal';
import { TutorialModal } from './components/TutorialModal';
import { HomePage } from './pages/HomePage';
import { ScenarioSelectPage } from './pages/ScenarioSelectPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { DebriefPage } from './pages/DebriefPage';
import { AARDashboardPage } from './pages/AARDashboardPage';
import { LeaderboardPage } from './pages/LeaderboardPage';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<
    'home' | 'scenarios' | 'simulator' | 'debrief' | 'aar' | 'leaderboard'
  >('home');

  const [currentUser, setCurrentUser] = useState<CurrentUser>(() =>
    storageService.getCurrentUser()
  );

  const [selectedScenario, setSelectedScenario] = useState<ScenarioConfig | null>(null);
  const [latestSessionResult, setLatestSessionResult] = useState<SessionResult | null>(null);

  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const handleSaveProfile = (user: CurrentUser) => {
    setCurrentUser(user);
    storageService.setCurrentUser(user);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo session histories and profiles to initial state?')) {
      storageService.resetDemoData();
      window.location.reload();
    }
  };

  const handleStartAdaptive = () => {
    const userSessions = storageService.getSessions().filter((s) => s.traineeName === currentUser.name);
    const profiles = storageService.getProfiles();
    const currentDiff = profiles.find((p) => p.name === currentUser.name)?.currentDifficulty ?? 3;
    const adaptiveRec = computeAdaptiveDifficulty(userSessions, currentDiff);

    // --- BKT Skill Model bias ---
    const skillState = storageService.getSkillModel(currentUser.name);
    const bias = getScenarioBias(skillState);

    const sc = generateProceduralScenario({
      seed: Math.floor(Math.random() * 899999) + 100000,
      difficulty: Math.max(1, Math.min(10, adaptiveRec.nextDifficulty + bias.difficultyAdjust)),
    });

    // Merge BKT scenario hints into the generated scenario
    const scenarioWithBias: ScenarioConfig = {
      ...sc,
      hints: [
        ...(sc.hints ?? []),
        ...bias.hints,
        skillState.focusRationale,
      ],
    };

    setSelectedScenario(scenarioWithBias);
    setCurrentScreen('simulator');
  };

  const handleSelectScenario = (scenario: ScenarioConfig) => {
    setSelectedScenario(scenario);
    setCurrentScreen('simulator');
  };

  const handleFinishSession = (result: SessionResult) => {
    storageService.saveSession(result);
    setLatestSessionResult(result);
    setCurrentScreen('debrief');
  };

  const handleNextAdaptiveMission = () => {
    handleStartAdaptive();
  };

  return (
    <div className="app-shell min-h-screen text-emerald-400 flex flex-col scanlines">
      <Header
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
        currentUser={currentUser}
        onOpenHotkeys={() => setIsHotkeysOpen(true)}
        onResetData={handleResetData}
        hasActiveSession={currentScreen === 'simulator' && !!selectedScenario}
      />

      <main className="flex-1 overflow-x-hidden">
        {currentScreen === 'home' && (
          <HomePage
            currentUser={currentUser}
            onSaveProfile={handleSaveProfile}
            onStartAdaptive={handleStartAdaptive}
            onGoToScenarios={() => setCurrentScreen('scenarios')}
            onGoToAAR={() => setCurrentScreen('aar')}
            onGoToLeaderboard={() => setCurrentScreen('leaderboard')}
          />
        )}

        {currentScreen === 'scenarios' && (
          <ScenarioSelectPage
            currentUser={currentUser}
            onSelectScenario={handleSelectScenario}
          />
        )}

        {currentScreen === 'simulator' && selectedScenario && (
          <SimulatorPage
            scenario={selectedScenario}
            currentUser={currentUser}
            onFinishSession={handleFinishSession}
            onOpenTutorial={() => setIsTutorialOpen(true)}
          />
        )}

        {currentScreen === 'debrief' && latestSessionResult && (
          <DebriefPage
            sessionResult={latestSessionResult}
            onNextMission={handleNextAdaptiveMission}
            onGoToReplay={() => setCurrentScreen('aar')}
            onGoHome={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'aar' && (
          <AARDashboardPage currentUser={currentUser} />
        )}

        {currentScreen === 'leaderboard' && (
          <LeaderboardPage />
        )}
      </main>

      {/* Global Modals */}
      <HotkeysModal isOpen={isHotkeysOpen} onClose={() => setIsHotkeysOpen(false)} />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
}

export default App;
