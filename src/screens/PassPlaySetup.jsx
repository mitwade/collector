import React, { useState } from 'react';
import { BOT_LEVELS } from '../bots/index.js';

const LEVEL_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' };

export default function PassPlaySetup({ onStart, onBack }) {
  const [players, setPlayers] = useState([
    { name: 'Player 1', isBot: false },
    { name: 'Player 2', isBot: false },
  ]);

  function addPlayer() {
    if (players.length >= 6) return;
    setPlayers((p) => [...p, { name: `Player ${p.length + 1}`, isBot: false }]);
  }
  function removePlayer(i) {
    if (players.length <= 2) return;
    setPlayers((p) => p.filter((_, idx) => idx !== i));
  }
  function update(i, patch) {
    setPlayers((p) => p.map((pl, idx) => (idx === i ? { ...pl, ...patch } : pl)));
  }

  function handleStart() {
    const playerConfigs = players.map((p, i) => ({
      id: `seat-${i}`,
      name: p.name || `Player ${i + 1}`,
      isBot: p.isBot,
      botLevel: p.isBot ? p.botLevel || 'medium' : undefined,
    }));
    onStart(playerConfigs);
  }

  return (
    <div className="setup-screen">
      <h2>Pass & Play</h2>
      <p className="setup-screen__hint">Everyone shares this device - pass it along each turn.</p>

      <div className="setup-screen__bots">
        <div className="setup-screen__bots-header">
          <span>Players ({players.length})</span>
          <button className="btn btn-ghost" onClick={addPlayer} disabled={players.length >= 6}>
            + Add player
          </button>
        </div>
        {players.map((p, i) => (
          <div key={i} className="setup-screen__bot-row">
            <input
              value={p.name}
              onChange={(e) => update(i, { name: e.target.value })}
              maxLength={20}
              placeholder={`Player ${i + 1}`}
            />
            <label className="setup-screen__bot-toggle">
              <input type="checkbox" checked={p.isBot} onChange={(e) => update(i, { isBot: e.target.checked })} />
              Bot
            </label>
            {p.isBot && (
              <select value={p.botLevel || 'medium'} onChange={(e) => update(i, { botLevel: e.target.value })}>
                {BOT_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {LEVEL_LABEL[lvl]}
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-ghost btn-danger" onClick={() => removePlayer(i)} disabled={players.length <= 2}>
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
