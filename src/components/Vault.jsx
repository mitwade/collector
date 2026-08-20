import React from 'react';
import CreatureCard from './CreatureCard.jsx';
import { canAffordCreature } from '../engine/selectors.js';
import { CONFIG } from '../engine/constants.js';

export default function Vault({ state, myTurn, onBuy, onClear, purse }) {
  const canClear =
    myTurn &&
    state.creatureDeck.length > 0 &&
    (purse.fire + purse.sky + purse.forest) >= CONFIG.CLEAR_VAULT_COST;

  return (
    <div className="vault">
      <div className="vault__header">
        <h3>The Vault</h3>
        <span className="vault__deck-count">{state.creatureDeck.length} left in deck</span>
      </div>
      <div className="vault__slots">
        {state.vault.map((creatureId, i) =>
          creatureId ? (
            <CreatureCard
              key={i}
              creatureId={creatureId}
              size="lg"
              affordable={purse ? canAffordCreature(purse, creatureId) : true}
              onClick={myTurn ? () => onBuy(i) : undefined}
            />
          ) : (
            <div key={i} className="creature-card creature-card--lg creature-card--empty">
              <span>Empty</span>
            </div>
          )
        )}
      </div>
      <button className="btn btn-ghost vault__clear-btn" disabled={!canClear} onClick={onClear}>
        Clear the Vault (pay 1 coin, any color)
      </button>
    </div>
  );
}
