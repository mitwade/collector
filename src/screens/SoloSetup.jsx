import React, { useState } from 'react';
import { BOT_LEVELS } from '../bots/index.js';

const LEVEL_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' };

export default function SoloSetup({ onStart, onBack }) {
  const [playerName, setPlayerName] = useState('You');
  const [bots, setBots] = useState([
    { level: 'easy' },
    { level: 'medium' },
    { level: 'hard' },
  ]);

  function addBot() {
    if (bots.length >= 5) return;
    setBots((b) => [...b, { level: 'medium' }]);
  }
  function removeBot(i) {
    setBots((b) => b.filter((_, idx) => idx !== i));
  }
  function setBotLevel(i, level) {
    setBots((b) => b.map((bot, idx) => (idx === i ? { ...bot, level } : bot)));
  }

  function handleStart() {
    const playerConfigs = [
      { id: 'human', name: playerName || 'You', isBot: false },
      ...bots.map((bot, i) => ({ id: `bot-${i}`, name: `${LEVEL_LABEL[bot.level]} Bot ${i + 1}`, isBot: true, botLevel: bot.level })),
    ];
    onStart(playerConfigs);
  }

  return (
    <div className="setup-screen">
      <h2>Solo vs Bots</h2>

      <label className="setup-screen__field">
        Your name
        <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} />
      </label>

      <div className="setup-screen__bots">
        <div className="setup-screen__bots-header">
          <span>Opponents ({bots.length})</span>
          <button className="btn btn-ghost" onClick={addBot} disabled={bots.length >= 5}>
            + Add bot
          </button>
        </div>
        {bots.map((bot, i) => (
          <div key={i} className="setup-screen__bot-row">
            <span>Bot {i + 1}</span>
            <select value={bot.level} onChange={(e) => setBotLevel(i, e.target.value)}>
              {BOT_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {LEVEL_LABEL[lvl]}
                </option>
              ))}
            </select>
            <button className="btn btn-ghost btn-danger" onClick={() => removeBot(i)} disabled={bots.length <= 1}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="setup-screen__actions">
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button className="btn btn-primary" onClick={handleStart}>
          Start game
        </button>
      </div>
    </div>
  );
}
