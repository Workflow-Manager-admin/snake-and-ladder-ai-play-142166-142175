import React, { useState, useEffect } from 'react';
import './App.css';

// Color palette constants
const COLORS = {
  accent: '#d32f2f',
  primary: '#388e3c',
  secondary: '#ffb300',
  boardLight: '#fafafa',
  boardDark: '#eeeeee',
  pawnUser: '#388e3c',
  pawnAI: '#d32f2f',
  dice: '#ffb300'
};

// Helpers for the game logic
const BOARD_SIZE = 10;
const BOARD_LEN = BOARD_SIZE * BOARD_SIZE;

// Snakes and ladders definition (can be adjusted)
const SNAKES = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78
};
const LADDERS = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100
};

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function getFinalPosition(pos) {
  if(SNAKES[pos]) return SNAKES[pos];
  if(LADDERS[pos]) return LADDERS[pos];
  return pos;
}

// Authentication (Guest Only)
function GuestAuth({ onLogin }) {
  // PUBLIC_INTERFACE
  const [name, setName] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if(name.trim()) {
      onLogin({ name: name.trim(), isGuest: true });
    }
  };
  return (
    <div className="guest-login">
      <h2>Play as Guest</h2>
      <form onSubmit={handleSubmit}>
        <input
          aria-label="Enter your display name"
          type="text"
          value={name}
          placeholder="Enter your name"
          onChange={e => setName(e.target.value)}
          className="input"
          required
          maxLength={16}
        />
        <button className="btn primary" type="submit">Start</button>
      </form>
    </div>
  );
}

// Game Board UI
function Board({ playerPos, aiPos, lastMove, finished, winner }) {
  // PUBLIC_INTERFACE
  // Create the board squares with snakes/ladders
  let squares = [];
  // Reverse order every other row to simulate "zig-zag"
  for (let row = BOARD_SIZE; row > 0; row--) {
    let rowSquares = [];
    const leftToRight = row % 2 === 1;
    for (let col = 0; col < BOARD_SIZE; col++) {
      let id = (row - 1) * BOARD_SIZE + (leftToRight ? (col + 1) : (BOARD_SIZE - col));
      let content = (
        <>
          <span className="cell-num">{id}</span>
          {SNAKES[id] ? <span className="snake" title={`Snake to ${SNAKES[id]}`}>🐍</span> : null}
          {LADDERS[id] ? <span className="ladder" title={`Ladder to ${LADDERS[id]}`}>🪜</span> : null}
          <div className="pawns">
            {playerPos === id && <span className="pawn player" title="You"></span>}
            {aiPos === id && <span className="pawn ai" title="AI"></span>}
          </div>
        </>
      );
      rowSquares.push(
        <div className={`square ${lastMove === id ? 'recent' : ''}`} key={id} data-cell={id}>
          {content}
        </div>
      );
    }
    squares.push(
      <div className="board-row" key={row}>
        {rowSquares}
      </div>
    );
  }
  return (
    <div className={`board-outer${finished ? ' finished' : ''}`}>
      <div className="board">
        {squares}
      </div>
      {finished &&
        <div className="winner-banner">
          <span>{winner === 'player' ? '🎉 You win!' : '🤖 AI wins!'}</span>
        </div>
      }
    </div>
  );
}

// Control Panel
function Controls({ playerTurn, onRoll, onReplay, finished, dice, rolling, disableInput }) {
  // PUBLIC_INTERFACE
  return (
    <div className="controls">
      {!finished && (
        <button
          className={`btn btn-large primary`}
          onClick={onRoll}
          disabled={!playerTurn || rolling || disableInput}
          aria-label="Roll the dice"
        >
          {rolling ? 'Rolling…' : 'Roll Dice'}
        </button>
      )}
      {typeof dice === 'number' && !finished && (
        <span className="dice" style={{ background: COLORS.dice }}>
          🎲 {dice}
        </span>
      )}
      {finished && (
        <button className="btn btn-large accent" onClick={onReplay}>
          Replay
        </button>
      )}
    </div>
  );
}

// Scoreboard/History
function SidePanel({ history, playerStats, aiStats, games, onSelectHistory }) {
  // PUBLIC_INTERFACE
  return (
    <div className="side-panel">
      <section>
        <h3>Scoreboard</h3>
        <div className="scores">
          <strong>You:</strong> {playerStats.wins} Wins <br />
          <strong>AI:</strong> {aiStats.wins} Wins <br />
          <span style={{ fontSize: '0.95em', color: "#888" }}>{games} Game{games !== 1 ? 's' : ''} played</span>
        </div>
      </section>
      <section>
        <h3>History</h3>
        {history.length === 0 ? (
          <div className="history-empty">No games played yet.</div>
        ) : (
          <div className="history-list">
            {history.map((item, i) => (
              <div key={i} className="history-item" onClick={() => onSelectHistory(i)} tabIndex={0}>
                <span>{item.date}</span>
                <span>{item.winner === 'player' ? "You" : "AI"} won in {item.turns} turns</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Main App
// PUBLIC_INTERFACE
function App() {
  // THEME STATE
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  // AUTH
  const [user, setUser] = useState(null);

  // GAME STATE
  const [playerPos, setPlayerPos] = useState(1);
  const [aiPos, setAiPos] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerTurn, setPlayerTurn] = useState(true); // player first
  const [gameFinished, setGameFinished] = useState(false);
  const [winner, setWinner] = useState(null);
  const [dice, setDice] = useState(null);
  const [history, setHistory] = useState(() => {
    // Load from sessionStorage if possible
    try {
      return JSON.parse(window.sessionStorage.getItem('snlhistory') || '[]');
    } catch {
      return [];
    }
  });
  const [stats, setStats] = useState(() => {
    try {
      return JSON.parse(window.sessionStorage.getItem('snlstats') || '{"player":{"wins":0},"ai":{"wins":0},"totalGames":0}');
    } catch {
      return { player: { wins: 0 }, ai: { wins: 0 }, totalGames: 0 };
    }
  });
  // For game replay history
  const [moveHistory, setMoveHistory] = useState([]);
  const [currentReplay, setCurrentReplay] = useState(null); // null, otherwise history index
  const [replayMoveIdx, setReplayMoveIdx] = useState(0);
  const [rolling, setRolling] = useState(false);

  // Handle theme changes for minimalistic light look with palette
  useEffect(() => {
    document.body.style.background = "#fafafa";
  }, []);

  // Game initialization/reset
  const startNewGame = () => {
    setPlayerPos(1);
    setAiPos(1);
    setGameStarted(true);
    setPlayerTurn(true);
    setGameFinished(false);
    setWinner(null);
    setDice(null);
    setMoveHistory([{ playerPos: 1, aiPos: 1, move: 'start', turn: 'player' }]);
    setCurrentReplay(null);
    setReplayMoveIdx(0);
    setRolling(false);
  };

  // On login, start a new game
  useEffect(() => {
    if(user) startNewGame();
    // eslint-disable-next-line
  }, [user]);

  // Handle player/AI moves and main game loop
  const processPlayerMove = async () => {
    setRolling(true);
    await new Promise(res => setTimeout(res, 400 + Math.random()*400));
    let roll = rollDice();
    setDice(roll);
    let tentative = playerPos + roll;
    let finalPos = tentative > 100 ? playerPos : getFinalPosition(tentative);
    setPlayerPos(finalPos);
    setMoveHistory(h => [
      ...h,
      { playerPos: finalPos, aiPos, move: roll, turn: 'player' }
    ]);
    setRolling(false);
    // Check for win
    if(finalPos === 100) {
      finishGame('player');
    } else {
      setPlayerTurn(false);
      // Give control to AI after short delay
      setTimeout(processAIMove, 850);
    }
  };

  const processAIMove = async () => {
    setRolling(true);
    await new Promise(res => setTimeout(res, 450 + Math.random()*350));
    let roll = rollDice();
    setDice(roll);
    let tentative = aiPos + roll;
    let finalPos = tentative > 100 ? aiPos : getFinalPosition(tentative);
    setAiPos(finalPos);
    setMoveHistory(h => [
      ...h,
      { playerPos, aiPos: finalPos, move: roll, turn: 'ai' }
    ]);
    setRolling(false);
    // Check for win
    if(finalPos === 100) {
      finishGame('ai');
    } else {
      setPlayerTurn(true);
      setDice(null);
    }
  };

  const finishGame = (winnerVal) => {
    setWinner(winnerVal);
    setGameFinished(true);
    setGameStarted(false);
    setDice(null);
    let turns = moveHistory.length + 1; // count current move
    const date = new Date();
    const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString().slice(0,5);
    const histEntry = {
      winner: winnerVal,
      turns,
      date: formattedDate,
      replay: [
        ...moveHistory,
        winnerVal === "player"
          ? { playerPos: 100, aiPos, move: null, turn: 'player' }
          : { playerPos, aiPos: 100, move: null, turn: 'ai' }
      ]
    };
    let newHistory = [histEntry, ...history].slice(0,10); // save up to 10 games
    setHistory(newHistory);
    let newStats = { ...stats };
    newStats[winnerVal].wins = (newStats[winnerVal].wins || 0) + 1;
    newStats.totalGames = (newStats.totalGames || 0) + 1;
    setStats(newStats);
    try {
      window.sessionStorage.setItem('snlhistory', JSON.stringify(newHistory));
      window.sessionStorage.setItem('snlstats', JSON.stringify(newStats));
    } catch {}
  };

  // Replay support (select a game from history)
  const onSelectHistory = (idx) => {
    setCurrentReplay(idx);
    setReplayMoveIdx(0);
    setGameStarted(false);
    setPlayerTurn(false);
    setRolling(false);
    setGameFinished(true);
    setWinner(history[idx].winner);
    setDice(null);
    setPlayerPos(1);
    setAiPos(1);
  };

  // Progress through moves in replay
  useEffect(() => {
    if(currentReplay !== null) {
      setPlayerPos(1);
      setAiPos(1);
      setDice(null);
      setGameStarted(false);
      setPlayerTurn(false);
      setGameFinished(true);
      setWinner(history[currentReplay].winner);

      if(replayMoveIdx > 0) {
        let step = history[currentReplay].replay[replayMoveIdx];
        setPlayerPos(step.playerPos);
        setAiPos(step.aiPos);
        setDice(step.move != null ? step.move : null);
      }
    }
    // eslint-disable-next-line
  }, [currentReplay, replayMoveIdx]);

  // Keyboard controls for replay navigation (left/right arrows)
  useEffect(() => {
    if(currentReplay === null) return;
    const handleKey = (e) => {
      if(e.code === 'ArrowLeft') {
        setReplayMoveIdx(i => Math.max(i-1, 0));
      }
      if(e.code === 'ArrowRight') {
        setReplayMoveIdx(i => Math.min(i+1, history[currentReplay].replay.length - 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line
  }, [currentReplay, history, replayMoveIdx]);

  // Start replay from beginning
  const startReplay = () => {
    setReplayMoveIdx(0);
  };
  // Replay controls
  const nextReplay = () => {
    if(currentReplay === null) return;
    setReplayMoveIdx(i => Math.min(i+1, history[currentReplay].replay.length-1));
  };
  const prevReplay = () => {
    if(currentReplay === null) return;
    setReplayMoveIdx(i => Math.max(i-1, 0));
  };
  // Exit replay
  const exitReplay = () => {
    setCurrentReplay(null);
    setReplayMoveIdx(0);
    // Reset view to last game
    if (history.length > 0) {
      setWinner(history[0].winner);
      setGameFinished(true);
      setPlayerPos(1);
      setAiPos(1);
    }
  };

  // Layout
  return (
    <div className="App main-layout">
      <header className="main-header">
        <h1>
          🎲 Snake &amp; Ladder
        </h1>
        <button
          className="theme-toggle"
          onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </header>
      <div className="main-content">
        <aside>
          <SidePanel
            history={history}
            playerStats={stats.player}
            aiStats={stats.ai}
            games={stats.totalGames || 0}
            onSelectHistory={onSelectHistory}
          />
        </aside>
        <main>
          {!user && <GuestAuth onLogin={setUser} />}
          {user && (
            <>
              <div className="user-bar">
                <span className="greet">Hi, {user.name}!</span>
                <button className="btn minimal" onClick={() => setUser(null)}>Logout</button>
              </div>
              <Board
                playerPos={playerPos}
                aiPos={aiPos}
                lastMove={playerTurn && dice ? playerPos : !playerTurn && dice ? aiPos : null}
                finished={gameFinished}
                winner={winner}
              />
              {currentReplay === null && (
                <Controls
                  playerTurn={playerTurn}
                  onRoll={processPlayerMove}
                  onReplay={startNewGame}
                  finished={gameFinished}
                  dice={dice}
                  rolling={rolling}
                  disableInput={!gameStarted || rolling || gameFinished}
                />
              )}
              {currentReplay !== null && (
                <div className="replay-box">
                  <div className="replay-controls">
                    <button className="btn minimal" onClick={prevReplay} disabled={replayMoveIdx === 0}>&larr;</button>
                    <span>
                      Move {replayMoveIdx + 1} / {history[currentReplay].replay.length}
                    </span>
                    <button className="btn minimal" onClick={nextReplay} disabled={replayMoveIdx === history[currentReplay].replay.length - 1}>&rarr;</button>
                    <button className="btn accent" onClick={exitReplay}>Exit Replay</button>
                  </div>
                  <div className="replay-summary">
                    <small>
                      {history[currentReplay].winner === 'player' ? 'You' : 'AI'} won in {history[currentReplay].turns} moves
                    </small>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <footer className="main-footer">
        <span>Minimal Snake &amp; Ladder &mdash; Demo</span>
      </footer>
    </div>
  );
}

export default App;
