import { useCallback, useEffect, useRef, useState } from 'react';
import {
  subscribeRoom,
  submitAction,
  driveBotTurnIfNeeded,
  startGame,
  updateSeats,
  joinRoom,
  leaveRoom,
} from '../firebase/rooms.js';
import { PHASES } from '../engine/constants.js';

export function useOnlineGame(code, uid) {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const drivingRef = useRef(false);

  useEffect(() => {
    if (!code) return undefined;
    const unsub = subscribeRoom(
      code,
      (data) => setRoom(data),
      (err) => setError(err.message)
    );
    return unsub;
  }, [code]);

  // If we're the host, keep driving bot turns whenever it's a bot's turn.
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    if (room.hostUid !== uid) return;
    const state = room.gameState;
    if (state.phase === PHASES.GAME_OVER) return;
    const current = state.players[state.currentPlayerIndex];
    if (!current.isBot) return;
    if (drivingRef.current) return;

    drivingRef.current = true;
    const t = setTimeout(() => {
      driveBotTurnIfNeeded(code, uid)
        .catch((e) => setError(e.message))
        .finally(() => {
          drivingRef.current = false;
        });
    }, 650 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [room, code, uid]);

  const dispatch = useCallback(
    (action) => {
      setError(null);
      submitAction(code, uid, action).catch((e) => setError(e.message));
    },
    [code, uid]
  );

  const editSeats = useCallback((seats) => updateSeats(code, uid, seats).catch((e) => setError(e.message)), [code, uid]);
  const start = useCallback(() => startGame(code, uid).catch((e) => setError(e.message)), [code, uid]);
  const join = useCallback((name) => joinRoom(code, uid, name).catch((e) => setError(e.message)), [code, uid]);
  const leave = useCallback(() => leaveRoom(code, uid).catch((e) => setError(e.message)), [code, uid]);

  return {
    room,
    state: room?.gameState || null,
    isHost: room?.hostUid === uid,
    dispatch,
    editSeats,
    start,
    join,
    leave,
    error,
  };
}
