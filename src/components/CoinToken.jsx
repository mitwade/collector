import React from 'react';

const COIN_LABEL = { fire: 'Fire', sky: 'Sky', forest: 'Forest' };

export default function CoinToken({ color, size = 40, onClick, disabled, count, selected }) {
  const clickable = typeof onClick === 'function';
  return (
    <button
      type="button"
      className={`coin-token coin-token--${color}${selected ? ' coin-token--selected' : ''}`}
      style={{ width: size, height: size }}
      onClick={clickable ? onClick : undefined}
      disabled={disabled || !clickable}
      aria-label={`${COIN_LABEL[color]} coin${count !== undefined ? `, ${count} available` : ''}`}
      title={COIN_LABEL[color]}
    >
      <img src={`/assets/coins/${color}.png`} alt="" draggable={false} />
      {count !== undefined && <span className="coin-token__count">{count}</span>}
    </button>
  );
}
