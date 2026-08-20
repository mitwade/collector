import React, { useEffect, useState } from 'react';
import HomeScreen from './screens/HomeScreen.jsx';
import SoloSetup from './screens/SoloSetup.jsx';
import PassPlaySetup from './screens/PassPlaySetup.jsx';
import OnlineLobby from './screens/OnlineLobby.jsx';
import GameBoard from './components/GameBoard.jsx';
import { useLocalGame } from './hooks/useLocalGame.js';
import { useOnlineGame } from './hooks/useOnlineGame.js';
import { firebaseConfigured, initAnonymousAuth, authReady } from './firebase/config.js';

export default function App() {
  const [view, setView] = useState('home'); // home | solo-setup | passplay-setup | online-lobby | solo-game | passplay-game | online-game
  const [localConfigs, setLocalConfigs] = useState(null);
  const [onlineCode, setOnlineCode] = useState(null);
  const [uid, setUid] = useState(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    initAnonymousAuth();
    authReady.then((user) => setUid(user?.uid || null));
  }, []);

  function goHome() {
    setView('home');
    setLocalConfigs(null);
    setOnlineCode(null);
  }

  return (
    <div className="app-shell">
      {view === 'home' && (
        <HomeScreen
          firebaseConfigured={firebaseConfigured}
          onSelectMode={(mode) => {
            if (mode === 'solo') setView('solo-setup');
            else if (mode === 'passplay') setView('passplay-setup');
            else if (mode === 'online') setView('online-lobby');
          }}
        />
      )}

      {view === 'solo-setup' && (
        <SoloSetup
          onBack={goHome}
          onStart={(configs) => {
            setLocalConfigs(configs);
            setView('solo-game');
          }}
        />
      )}

      {view === 'passplay-setup' && (
        <PassPlaySetup
          onBack={goHome}
          onStart={(configs) => {
            setLocalConfigs(configs);
            setView('passplay-game');
          }}
        />
      )}

      {view === 'online-lobby' && uid && (
        <OnlineLobby
          uid={uid}
          onBack={goHome}
          onGameStart={(code) => {
            setOnlineCode(code);
            setView('online-game');
          }}
        />
      )}
      {view === 'online-lobby' && !uid && <p className="setup-screen">Connecting…</p>}

      {view === 'solo-game' && localConfigs && (
        <LocalGameView configs={localConfigs} passAndPlay={false} onExit={goHome} />
      )}

      {view === 'passplay-game' && localConfigs && (
        <LocalGameView configs={localConfigs} passAndPlay onExit={goHome} />
      )}

      {view === 'online-game' && onlineCode && uid && (
        <OnlineGameView code={onlineCode} uid={uid} onExit={goHome} />
      )}
    </div>
  );
}

function LocalGameView({ configs, passAndPlay, onExit }) {
  const { state, dispatch, restart, botThinking, error } = useLocalGame(configs);
  const humanId = configs.find((c) => !c.isBot)?.id || null;
  return (
    <GameBoard
      state={state}
      dispatch={dispatch}
      myPlayerId={passAndPlay ? null : humanId}
      passAndPlay={passAndPlay}
      onPlayAgain={() => restart(configs)}
      onExit={onExit}
      botThinking={botThinking}
      error={error}
    />
  );
}

function OnlineGameView({ code, uid, onExit }) {
  const { state, dispatch, error } = useOnlineGame(code, uid);
  if (!state) return <p className="setup-screen">Loading game…</p>;
  return (
    <GameBoard
      state={state}
      dispatch={dispatch}
      myPlayerId={uid}
      passAndPlay={false}
      onExit={onExit}
      error={error}
    />
  );
}
