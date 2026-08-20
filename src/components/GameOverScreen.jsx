import React from 'react';
import { scorePlayer } from '../engine/selectors.js';

export default function GameOverScreen({ state, onPlayAgain, onExit }) {
  const ranked = state.players
    .map((p) => ({ player: p, score: scorePlayer(p) }))
    .sort((a, b) => b.score.total - a.score.total);

  return (
    <div className="game-over">
      <div className="parchment-panel game-over__panel">
        <span className="eyebrow">Final Tally</span>
        <h1>
          {state.winnerIds.length > 1
            ? 'The title is shared!'
            : `${state.players.find((p) => p.id === state.winnerIds[0])?.name} wins!`}
        </h1>
        <table className="game-over__table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Creatures</th>
              <th>Titles</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ player, score }) => (
              <tr key={player.id} className={state.winnerIds.includes(player.id) ? 'game-over__winner-row' : ''}>
                <td>{player.name}</td>
                <td>
                  {score.creatureCount} ({score.creaturePoints}pt)
                </td>
                <td>
                  {score.titleCount} ({score.titlePoints}pt)
                </td>
                <td>
                  <strong>{score.total}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="game-over__actions">
          {onPlayAgain && (
            <button className="btn btn-primary" onClick={onPlayAgain}>
              Play again
            </button>
          )}
          <button className="btn btn-ghost" onClick={onExit}>
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
