import React from 'react';
import { CREATURE_BY_ID } from '../data/creatures.js';

export default function CreatureCard({ creatureId, size = 'md', onClick, disabled, locked, affordable }) {
  const def = CREATURE_BY_ID[creatureId];
  if (!def) return <div className="creature-card creature-card--empty" />;
  const clickable = typeof onClick === 'function';
  return (
    <button
      type="button"
      className={[
        'creature-card',
        `creature-card--${size}`,
        `creature-card--${def.color}`,
        locked ? 'creature-card--locked' : '',
        clickable && !disabled ? 'creature-card--clickable' : '',
        affordable === false ? 'creature-card--unaffordable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={clickable ? onClick : undefined}
      disabled={disabled || !clickable}
      title={`${def.name} — ${def.points} pts, costs ${def.cost} ${def.color === 'any' ? 'coin (any color)' : def.color}`}
    >
      <img src={`${import.meta.env.BASE_URL}assets/creatures/${def.image}`} alt={def.name} draggable={false} />
      <div className="creature-card__footer">
        <span className="creature-card__name">{def.name}</span>
        <span className="creature-card__stats">
          <span className="creature-card__points">{def.points}pt</span>
          <span className={`creature-card__cost coin-color-${def.color}`}>
            {def.cost}
            {def.color !== 'any' ? ` ${def.color[0].toUpperCase()}` : ' any'}
          </span>
        </span>
      </div>
      {locked && <div className="creature-card__locked-badge">Locked</div>}
    </button>
  );
}
