import React from 'react';

export default function HomeScreen({ onSelectMode, firebaseConfigured }) {
  return (
    <div className="home-screen">
      <div className="home-screen__hero">
        <span className="eyebrow">A creature-collecting game of coins, timing, and rare titles</span>
        <h1>Collector</h1>
        <p className="home-screen__tagline">
          Gather coins, purchase rare creatures, and complete Collector Titles before your rivals do.
        </p>
      </div>

      <div className="home-screen__modes">
        <ModeCard
          title="Solo vs Bots"
          description="Play against 1-5 AI opponents at four difficulty tiers, right on this device."
          cta="Play solo"
          onClick={() => onSelectMode('solo')}
        />
        <ModeCard
          title="Pass & Play"
          description="2-6 players share one device, taking turns around the table."
          cta="Start pass & play"
          onClick={() => onSelectMode('passplay')}
        />
        <ModeCard
          title="Online"
          description="Create a room and share a short code with friends - play across devices, mix in bots too."
          cta={firebaseConfigured ? 'Play online' : 'Needs Firebase setup'}
          disabled={!firebaseConfigured}
          onClick={() => onSelectMode('online')}
        />
      </div>

      {!firebaseConfigured && (
        <p className="home-screen__firebase-note">
          Online play needs a Firebase project. See <code>README.md</code> for a step-by-step setup guide.
        </p>
      )}
    </div>
  );
}

function ModeCard({ title, description, cta, onClick, disabled }) {
  return (
    <div className="mode-card">
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="btn btn-primary" onClick={onClick} disabled={disabled}>
        {cta}
      </button>
    </div>
  );
}
