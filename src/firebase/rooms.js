import {
  doc,
  setDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from './config.js';
import { createInitialState } from '../engine/setup.js';
import { applyAction } from '../engine/actions.js';
import { runBotTurn } from '../bots/index.js';
import { PHASES } from '../engine/constants.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity

export function generateRoomCode(length = 5) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

function roomRef(code) {
  if (!db) throw new Error('Firebase is not configured.');
  return doc(db, 'games', code.toUpperCase());
}

const MAX_SEATS = 6;

function emptySeats(count) {
  return Array.from({ length: count }, (_, i) => ({
    seatIndex: i,
    type: 'open',
    uid: null,
    name: null,
    botLevel: null,
  }));
}

/** Create a new lobby. Returns the room code. Retries on (rare) collisions. */
export async function createRoom({ hostUid, hostName, seatCount = 4 }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const ref = roomRef(code);
    try {
      await setDoc(
        ref,
        {
          code,
          hostUid,
          status: 'lobby',
          seats: (() => {
            const seats = emptySeats(Math.min(seatCount, MAX_SEATS));
            seats[0] = { seatIndex: 0, type: 'human', uid: hostUid, name: hostName, botLevel: null };
            return seats;
          })(),
          gameState: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
      return code;
    } catch (e) {
      // extremely unlikely collision path; just retry with a new code
      continue;
    }
  }
  throw new Error('Could not allocate a room code, please try again.');
}

export function subscribeRoom(code, callback, onError) {
  const ref = roomRef(code);
  return onSnapshot(ref, (snap) => callback(snap.exists() ? snap.data() : null), onError);
}

/** Claim the first open seat for a joining player. */
export async function joinRoom(code, uid, name) {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = snap.data();
    if (room.status !== 'lobby') throw new Error('Game already started.');
    const seats = room.seats.slice();
    const alreadyIn = seats.find((s) => s.uid === uid);
    if (alreadyIn) return;
    const openIdx = seats.findIndex((s) => s.type === 'open');
    if (openIdx === -1) throw new Error('Room is full.');
    seats[openIdx] = { seatIndex: openIdx, type: 'human', uid, name, botLevel: null };
    tx.update(ref, { seats, updatedAt: serverTimestamp() });
  });
}

/** Host-only: edit seats (add/remove bots, change bot difficulty, resize). */
export async function updateSeats(code, uid, seats) {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = snap.data();
    if (room.hostUid !== uid) throw new Error('Only the host can edit seats.');
    if (room.status !== 'lobby') throw new Error('Game already started.');
    tx.update(ref, { seats, updatedAt: serverTimestamp() });
  });
}

/** Host-only: lock in seats and deal the opening state. */
export async function startGame(code, uid) {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = snap.data();
    if (room.hostUid !== uid) throw new Error('Only the host can start the game.');
    if (room.status !== 'lobby') return;
    const activeSeats = room.seats.filter((s) => s.type !== 'open');
    if (activeSeats.length < 2) throw new Error('Need at least 2 players to start.');
    const playerConfigs = activeSeats.map((s) => ({
      id: s.uid || `bot-${s.seatIndex}`,
      name: s.name || `Bot ${s.seatIndex + 1}`,
      isBot: s.type === 'bot',
      botLevel: s.botLevel || 'medium',
    }));
    const gameState = createInitialState(playerConfigs, Date.now() ^ (Math.random() * 1e9));
    tx.update(ref, { status: 'playing', gameState, updatedAt: serverTimestamp() });
  });
}

/**
 * Submit a single engine action on behalf of `uid`. Validated inside the
 * transaction: it must currently be that player's turn (or, for bot seats,
 * only the host may drive them - see driveBotTurnIfNeeded below).
 */
export async function submitAction(code, uid, action) {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = snap.data();
    if (room.status !== 'playing') throw new Error('Game is not in progress.');
    const state = room.gameState;
    const current = state.players[state.currentPlayerIndex];
    if (current.id !== uid) throw new Error("It is not your turn.");
    const nextState = applyAction(state, action);
    tx.update(ref, { gameState: nextState, updatedAt: serverTimestamp() });
  });
}

/**
 * Called by the host client whenever it notices it's a bot's turn. Computes
 * the bot's full turn locally and writes the result, re-validated inside the
 * transaction so two host tabs (or a race) can't double-apply it.
 */
export async function driveBotTurnIfNeeded(code, hostUid) {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    if (room.status !== 'playing') return;
    if (room.hostUid !== hostUid) return;
    const state = room.gameState;
    if (state.phase === PHASES.GAME_OVER) return;
    const current = state.players[state.currentPlayerIndex];
    if (!current.isBot) return;
    const nextState = runBotTurn(state, current.botLevel || 'medium');
    tx.update(ref, { gameState: nextState, updatedAt: serverTimestamp() });
  });
}

export async function leaveRoom(code, uid) {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    if (room.status !== 'lobby') return; // once playing, seats are locked in
    const seats = room.seats.map((s) =>
      s.uid === uid ? { seatIndex: s.seatIndex, type: 'open', uid: null, name: null, botLevel: null } : s
    );
    tx.update(ref, { seats, updatedAt: serverTimestamp() });
  });
}

export { deleteField };
