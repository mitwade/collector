import React, { useEffect, useState } from 'react';
import { createRoom } from '../firebase/rooms.js';
import { useOnlineGame } from '../hooks/useOnlineGame.js';
import { BOT_LEVELS } from '../bots/index.js';

const LEVEL_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' };

export default function OnlineLobby({ uid, onGameStart, onBack }) {
  const [name, setName] = useState('Player');
  const [code, setCode] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  const online = useOnlineGame(code, uid);

  useEffect(() => {
    if (online.room?.status === 'playing') {
      onGameStart(code);
    }
  }, [online.room?.status, code, onGameStart]);

  async function handleCreate() {
    setBusy(true);
    setLocalError(null);
    try {
      const newCode = await createRoom({ hostUid: uid, hostName: name || 'Host', seatCount: 4 });
      setCode(newCode);
    } catch (e) {
      setLocalError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!joinCodeInput) return;
    setCode(joinCodeInput.toUpperCase());
  }

  // Once `code` is set for a joiner, actually claim a seat.
  useEffect(() => {
    if (!code || !online.room) return;
    const alreadyIn = online.room.seats.some((s) => s.uid === uid);
    if (!alreadyIn && online.room.status === 'lobby' && online.room.hostUid !== uid) {
      online.join(name || 'Player');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, online.room]);

  if (!code) {
    return (
      <div className="setup-screen">
        <h2>Online</h2>
        <label className="setup-screen__field">
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        </label>

        <div className="online-lobby__choice">
          <div className="online-lobby__choice-card">
            <h3>Create a room</h3>
            <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
              Create room
            </button>
          </div>
          <div className="online-lobby__choice-card">
            <h3>Join a room</h3>
            <input
              placeholder="Room code"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              maxLength={5}
            />
            <button className="btn btn-primary" onClick={handleJoin} disabled={!joinCodeInput}>
              Join room
            </button>
          </div>
        </div>

        {localError && <p className="game-board__error">{localError}</p>}
        <div className="setup-screen__actions">
          <button className="btn btn-ghost" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!online.room) {
    return (
      <div className="setup-screen">
        <p>Connecting to room {code}…</p>
        {online.error && <p className="game-board__error">{online.error}</p>}
      </div>
    );
  }

  const isHost = online.isHost;

  function setSeatType(i, type) {
    const seats = online.room.seats.slice();
    seats[i] = type === 'open' ? { seatIndex: i, type: 'open', uid: null, name: null, botLevel: null } : { ...seats[i], type, botLevel: type === 'bot' ? seats[i].botLevel || 'medium' : null, name: type === 'bot' ? `Bot ${i + 1}` : seats[i].name };
    online.editSeats(seats);
  }
  function setBotLevel(i, level) {
    const seats = online.room.seats.slice();
    seats[i] = { ...seats[i], botLevel: level };
    online.editSeats(seats);
  }
  function addSeat() {
    if (online.room.seats.length >= 6) return;
    online.editSeats([...online.room.seats, { seatIndex: online.room.seats.length, type: 'open', uid: null, name: null, botLevel: null }]);
  }
  function removeSeat(i) {
    if (online.room.seats.length <= 2) return;
    online.editSeats(online.room.seats.filter((_, idx) => idx !== i));
  }

  return (
    <div className="setup-screen">
      <h2>Room {code}</h2>
      <p className="setup-screen__hint">Share this code with friends. They can join from the Online menu.</p>

      <div className="setup-screen__bots">
        <div className="setup-screen__bots-header">
          <span>Seats ({online.room.seats.length})</span>
          {isHost && (
            <button className="btn btn-ghost" onClick={addSeat} disabled={online.room.seats.length >= 6}>
              + Add seat
            </button>
          )}
        </div>
        {online.room.seats.map((seat, i) => (
          <div key={i} className="setup-screen__bot-row">
            <span className="online-lobby__seat-label">
              {seat.type === 'open' && 'Open seat'}
              {seat.type === 'human' && (seat.name || 'Player')}
              {seat.type === 'bot' && (seat.name || `Bot ${i + 1}`)}
            </span>
            {isHost && seat.type !== 'human' && (
              <select value={seat.type} onChange={(e) => setSeatType(i, e.target.value)}>
                <option value="open">Open</option>
                <option value="bot">Bot</option>
              </select>
            )}
            {isHost && seat.type === 'bot' && (
              <select value={seat.botLevel || 'medium'} onChange={(e) => setBotLevel(i, e.target.value)}>
                {BOT_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {LEVEL_LABEL[lvl]}
                  </option>
                ))}
              </select>
            )}
            {isHost && seat.type === 'human' && seat.uid !== uid && (
              <button className="btn btn-ghost btn-danger" onClick={() => setSeatType(i, 'open')}>
                Kick
              </button>
            )}
            {isHost && (seat.type === 'bot' || seat.type === 'open') && (
              <button className="btn btn-ghost btn-danger" onClick={() => removeSeat(i)} disabled={online.room.seats.length <= 2}>
                Remove seat
              </button>
            )}
          </div>
        ))}
      </div>

      {online.error && <p className="game-board__error">{online.error}</p>}

      <div className="setup-screen__actions">
        <button
          className="btn btn-ghost"
          onClick={() => {
            online.leave();
            setCode(null);
          }}
        >
          Leave room
        </button>
        {isHost && (
          <button
            className="btn btn-primary"
            onClick={online.start}
            disabled={online.room.seats.filter((s) => s.type !== 'open').length < 2}
          >
            Start game
          </button>
        )}
        {!isHost && <span className="online-lobby__waiting">Waiting for host to start…</span>}
      </div>
    </div>
  );
}
