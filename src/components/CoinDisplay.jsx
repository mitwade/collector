import React from 'react';
import CoinToken from './CoinToken.jsx';
import { CONFIG } from '../engine/constants.js';

export default function CoinDisplay({ state, myTurn, collectedThisTurn, onTakeFromDisplay, onTakeFromDraw }) {
  const remaining = CONFIG.COINS_PER_TURN - collectedThisTurn;
  const canTake = myTurn && remaining > 0;

  return (
    <div className="coin-display">
      <div className="coin-display__row">
        <span className="eyebrow">Coin Display</span>
        <div className="coin-display__coins">
          {state.coinDisplay.length === 0 && <span className="coin-display__empty">—</span>}
          {state.coinDisplay.map((color, i) => (
            <CoinToken
              key={i}
              color={color}
              onClick={canTake ? () => onTakeFromDisplay(color) : undefined}
              disabled={!canTake}
            />
          ))}
        </div>
      </div>
      <div className="coin-display__draw">
        <button className="btn coin-display__draw-btn" disabled={!canTake} onClick={onTakeFromDraw}>
          Draw random coin
        </button>
        {myTurn && (
          <span className="coin-display__hint">
            {remaining > 0 ? `Take ${remaining} more coin${remaining > 1 ? 's' : ''} this turn` : 'Coins collected'}
          </span>
        )}
      </div>
    </div>
  );
}
