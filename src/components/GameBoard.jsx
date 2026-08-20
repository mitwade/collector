import React, { useState } from 'react';
import Vault from './Vault.jsx';
import CoinDisplay from './CoinDisplay.jsx';
import TitlesBoard from './TitlesBoard.jsx';
import PlayerPanel from './PlayerPanel.jsx';
import CoinToken from './CoinToken.jsx';
import GameOverScreen from './GameOverScreen.jsx';
import { ACTIONS, CONFIG, PHASES } from '../engine/constants.js';
import { getCurrentPlayer, totalCoins } from '../engine/selectors.js';

/**
 * @param {object} props
 * @param {object} props.state - engine state
 * @param {(action:object)=>void} props.dispatch
 * @param {string|null} props.myPlayerId - null in pass-and-play (everyone can act on the active seat)
 * @param {boolean} props.passAndPlay
 * @param {()=>void} [props.onPlayAgain]
 * @param {()=>void} props.onExit
 * @param {boolean} [props.botThinking]
 * @param {string|null} [props.error]
 */
export default function GameBoard({ state, dispatch, myPlayerId, passAndPlay, onPlayAgain, onExit, botThinking, error }) {
  const [discardChoice, setDiscardChoice] = useState({ fire: 0, sky: 0, forest: 0 });
  const current = getCurrentPlayer(state);
  const isMySeat = passAndPlay ? true : current.id === myPlayerId;
  const myTurn = isMySeat && !current.isBot && state.phase !== PHASES.GAME_OVER;

  if (state.phase === PHASES.GAME_OVER) {
    return <GameOverScreen state={state} onPlayAgain={onPlayAgain} onExit={onExit} />;
  }

  const purseTotal = totalCoins(current.purse);
  const overLimit = purseTotal > CONFIG.COIN_HAND_LIMIT;
  const mustDiscard = overLimit && state.phase === PHASES.CLAIM;
  const discardSelectedTotal = discardChoice.fire + discardChoice.sky + discardChoice.forest;
  const discardTarget = purseTotal - CONFIG.COIN_HAND_LIMIT;

  function adjustDiscard(color, delta) {
    setDiscardChoice((prev) => {
      const next = { ...prev, [color]: Math.max(0, Math.min(current.purse[color], prev[color] + delta)) };
      return next;
    });
  }

  function handleEndTurn() {
    if (mustDiscard) {
      dispatch({ type: ACTIONS.END_TURN, payload: { discard: discardChoice } });
      setDiscardChoice({ fire: 0, sky: 0, forest: 0 });
    } else {
      dispatch({ type: ACTIONS.END_TURN, payload: {} });
    }
  }

  return (
    <div className="game-board">
      <header className="game-board__topbar">
        <div>
          <span className="eyebrow">Collector</span>
          <h2>{passAndPlay ? `${current.name}'s turn` : myTurn ? 'Your turn' : `${current.name}'s turn`}</h2>
        </div>
        <div className="game-board__phase-indicator">
          <PhaseStep label="Collect" active={state.phase === PHASES.COLLECT} done={state.phase !== PHASES.COLLECT} />
          <PhaseStep label="Market" active={state.phase === PHASES.MARKET} done={state.phase === PHASES.CLAIM} />
          <PhaseStep label="Claim" active={state.phase === PHASES.CLAIM} done={false} />
        </div>
        <button className="btn btn-ghost" onClick={onExit}>
          Exit
        </button>
      </header>

      {error && <div className="game-board__error">{error}</div>}
      {botThinking && !myTurn && <div className="game-board__bot-thinking">{current.name} is thinking…</div>}

      <div className="game-board__players-strip">
        {state.players.map((p) => (
          <PlayerPanel key={p.id} player={p} isCurrent={p.id === current.id} isMe={!passAndPlay && p.id === myPlayerId} compact />
        ))}
      </div>

      <main className="game-board__main">
        <div className="game-board__center">
          <Vault
            state={state}
            myTurn={myTurn && state.phase === PHASES.MARKET}
            purse={current.purse}
            onBuy={(vaultIndex) => dispatch({ type: ACTIONS.BUY_CREATURE, payload: { vaultIndex } })}
            onClear={() => dispatch({ type: ACTIONS.CLEAR_VAULT, payload: {} })}
          />

          <CoinDisplay
            state={state}
            myTurn={myTurn && state.phase === PHASES.COLLECT}
            collectedThisTurn={state.coinsCollectedThisTurn}
            onTakeFromDisplay={(color) => dispatch({ type: ACTIONS.TAKE_COIN, payload: { source: 'display', color } })}
            onTakeFromDraw={() => dispatch({ type: ACTIONS.TAKE_COIN, payload: { source: 'draw' } })}
          />

          <div className="game-board__turn-controls">
            {state.phase === PHASES.MARKET && myTurn && (
              <button className="btn btn-primary" onClick={() => dispatch({ type: ACTIONS.ADVANCE_TO_CLAIM })}>
                Done buying → Claim titles
              </button>
            )}
            {state.phase === PHASES.CLAIM && myTurn && !mustDiscard && (
              <button className="btn btn-primary" onClick={handleEndTurn}>
                End turn
              </button>
            )}
            {mustDiscard && myTurn && (
              <div className="discard-panel">
                <p>
                  You have {purseTotal} coins (limit {CONFIG.COIN_HAND_LIMIT}). Discard {discardTarget} coin
                  {discardTarget > 1 ? 's' : ''} to end your turn:
                </p>
                <div className="discard-panel__coins">
                  {['fire', 'sky', 'forest'].map((c) => (
                    <div key={c} className="discard-panel__row">
                      <CoinToken color={c} size={30} />
                      <button className="btn btn-ghost" onClick={() => adjustDiscard(c, -1)} disabled={discardChoice[c] <= 0}>
                        −
                      </button>
                      <span>{discardChoice[c]}</span>
                      <button
                        className="btn btn-ghost"
                        onClick={() => adjustDiscard(c, 1)}
                        disabled={discardChoice[c] >= current.purse[c] || discardSelectedTotal >= discardTarget}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" disabled={discardSelectedTotal !== discardTarget} onClick={handleEndTurn}>
                  Confirm discard & end turn
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="game-board__side">
          <TitlesBoard
            state={state}
            myTurn={myTurn && state.phase === PHASES.CLAIM}
            player={current}
            onClaim={(titleId) => dispatch({ type: ACTIONS.CLAIM_TITLE, payload: { titleId } })}
          />
        </aside>
      </main>
    </div>
  );
}

function PhaseStep({ label, active, done }) {
  return <span className={`phase-step${active ? ' phase-step--active' : ''}${done ? ' phase-step--done' : ''}`}>{label}</span>;
}
