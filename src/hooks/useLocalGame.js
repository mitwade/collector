import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialState } from '../engine/setup.js';
import { applyAction } from '../engine/actions.js';
import { runBotTurn } from '../bots/index.js';
import { PHASES } from '../engine/constants.js';
import { getCurrentPlayer } from '../engine/selectors.js';

/**
 * @param {Array<{id,name,isBot,botLevel}>} playerConfigs
 */
export function useLocalGame(playerConfigs) {
  const [state, setState] = useState(() => createInitialState(playerConfigs));
  const [botThinking, setBotThinking] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  const dispatch = useCallback((action) => {
    setError(null);
    setState((prev) => {
      try {
        return applyAction(prev, action);
      } catch (e) {
        setError(e.message);
        return prev;
      }
    });
  }, []);

  const restart = useCallback((newConfigs) => {
    setState(createInitialState(newConfigs || playerConfigs));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.phase === PHASES.GAME_OVER) return undefined;
    const current = getCurrentPlayer(state);
    if (!current.isBot) return undefined;

    setBotThinking(true);
    timeoutRef.current = setTimeout(() => {
      setState((prev) => {
        const p = getCurrentPlayer(prev);
        if (!p.isBot || prev.phase === PHASES.GAME_OVER) return prev;
        return runBotTurn(prev, p.botLevel || 'medium');
      });
      setBotThinking(false);
    }, 650 + Math.random() * 500);

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return { state, dispatch, restart, botThinking, error };
}
