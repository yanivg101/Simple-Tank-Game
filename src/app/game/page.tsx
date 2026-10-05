'use client';

import { useState } from 'react';
import Game from '@/components/game/Game';
import styles from './page.module.css';

export default function GamePage() {
  const [mapIndex, setMapIndex] = useState(0);
  const [gameMode, setGameMode] = useState<'battle' | 'survival'>('battle');
  const [difficulty, setDifficulty] = useState<'normal' | 'hard'>('normal');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [highScores, setHighScores] = useState<{ player: number; ai: number; mode: string; diff: string }[]>([]);
  const [vfxVolume, setVfxVolume] = useState(0.5);
  const [musicVolume, setMusicVolume] = useState(0.5);

  const handleGameOver = (gameWinner: 'player' | 'ai' | null, pScore: number, aScore: number) => {
    setWinner(gameWinner);
    setPlayerScore(pScore);
    setAiScore(aScore);
    setGameOver(true);

    setHighScores((prev) => {
      const newScores = [...prev, { player: pScore, ai: aScore, mode: gameMode, diff: difficulty }];
      return newScores.slice(-5);
    });
  };

  const handleRestart = () => {
    setGameOver(false);
    setWinner(null);
  };

  const handleMapChange = (index: number) => {
    setMapIndex(index);
  };

  const handleGameModeChange = (mode: 'battle' | 'survival') => {
    setGameMode(mode);
  };

  return (
    <main className={styles.main}>
      {gameOver ? (
        <div className={styles.gameOver}>
          <h1 className={winner === 'player' ? styles.win : styles.lose}>
            {winner === 'player' ? 'Victory!' : winner === 'ai' ? 'Defeat!' : 'Draw!'}
          </h1>
          <div className={styles.finalScores}>
            <div className={styles.finalScoreItem}>
              <span>You:</span>
              <span className={styles.playerScore}>{playerScore}</span>
            </div>
            <span className={styles.vs}>vs</span>
            <div className={styles.finalScoreItem}>
              <span>{gameMode === 'survival' ? 'Wave' : 'AI'}:</span>
              <span className={styles.aiScore}>{aiScore}</span>
            </div>
          </div>
          <button className={styles.restartButton} onClick={handleRestart}>
            Play Again
          </button>
        </div>
      ) : (
        <Game 
          mapIndex={mapIndex} 
          onGameOver={handleGameOver}
          onMapChange={handleMapChange}
          gameMode={gameMode}
          onGameModeChange={handleGameModeChange}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          vfxVolume={vfxVolume}
          onVfxVolumeChange={setVfxVolume}
          musicVolume={musicVolume}
          onMusicVolumeChange={setMusicVolume}
        />
      )}

      {highScores.length > 0 && (
        <div className={styles.highScores}>
          <h3>Recent Games</h3>
          <ul>
            {highScores.map((score, index) => (
              <li key={index}>
                <span>{score.mode === 'survival' ? 'Survival' : 'Battle'}</span> - 
                <span>{score.diff === 'hard' ? ' 🔴' : ' 🟢'}</span> You {score.player} - {score.ai}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}