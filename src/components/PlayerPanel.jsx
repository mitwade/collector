import React from 'react';
import CoinToken from './CoinToken.jsx';
import CreatureCard from './CreatureCard.jsx';
import { scorePlayer } from '../engine/selectors.js';

export default function PlayerPanel({ player, isCurrent, isMe, compact }) {
  const score = scorePlayer(player);
  const grouped = {};
  for (const cr of player.creatures) {
    grouped[cr.creatureId] = grouped[cr.creatureId] || { count: 0, lockedCount: 0 };
    grouped[cr.creatureId].count += 1;
    if (cr.locked) grouped[cr.creatureId].lockedCount += 1;
  }

  return (
    <div className={`player-panel${isCurrent ? ' player-panel--current' : ''}${compact ? ' player-panel--compact' : ''}`}>
      <div className="player-panel__header">
        <span className="player-panel__name">
          {player.name}
          {isMe ? ' (you)' : ''}
          {player.isBot ? ` · ${player.botLevel} bot` : ''}
        </span>
        {isCurrent && <span className="player-panel__turn-badge">Current turn</span>}
      </div>

      <div className="player-panel__purse">
        {['fire', 'sky', 'forest'].map((c) => (
          <div key={c} className="player-panel__coin">
            <CoinToken color={c} size={26} />
            <span>{player.purse[c]}</span>
          </div>
        ))}
        <span className="player-panel__coin-total">{player.purse.fire + player.purse.sky + player.purse.forest} total</span>
      </div>

      {!compact && (
        <div className="player-panel__creatures">
          {Object.entries(grouped).map(([id, info]) => (
            <div key={id} className="player-panel__creature-chip">
              <CreatureCard creatureId={id} size="xs" locked={info.lockedCount === info.count} />
              {info.count > 1 && <span className="player-panel__creature-count">×{info.count}</span>}
            </div>
          ))}
          {player.creatures.length === 0 && <span className="player-panel__empty">No creatures yet</span>}
        </div>
      )}

      <div className="player-panel__score">
        <span>
          {score.creaturePoints} creature pts + {score.titlePoints} title pts ={' '}
          <strong>{score.total}</strong>
        </span>
        <span className="player-panel__titles-count">{player.titlesClaimed.length} titles</span>
      </div>
    </div>
  );
}
