import React from 'react';
import CreatureCard from './CreatureCard.jsx';
import { availableTitleObjects, qualifiesForTitle } from '../engine/selectors.js';

export default function TitlesBoard({ state, myTurn, player, onClaim }) {
  const titles = availableTitleObjects(state);
  return (
    <div className="titles-board">
      <div className="titles-board__header">
        <h3>Collector Titles</h3>
        <span className="titles-board__count">{titles.length} available</span>
      </div>
      <div className="titles-board__grid">
        {titles.map((title) => {
          const qualifies = myTurn && player ? qualifiesForTitle(player, title) : false;
          return (
            <div key={title.id} className={`title-card${qualifies ? ' title-card--qualifies' : ''}`}>
              <div className="title-card__header">
                <span className="title-card__name">{title.name}</span>
                <span className="title-card__points">{title.points} pts</span>
              </div>
              <div className="title-card__requires">
                {title.requires.map((id, i) => (
                  <CreatureCard key={i} creatureId={id} size="xs" />
                ))}
              </div>
              {qualifies && (
                <button className="btn btn-primary title-card__claim-btn" onClick={() => onClaim(title.id)}>
                  Claim
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
