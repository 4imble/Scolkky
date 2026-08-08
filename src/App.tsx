import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Camera, Check, ChevronRight, Plus, RotateCcw, Trophy, UserRound, X } from 'lucide-react';

type Phase = 'setup' | 'playing' | 'finished';
type Player = { id: string; name: string; score: number; wins: number; misses: number; eliminated: boolean; photo?: string };
type GameState = { players: Player[]; phase: Phase; turnIndex: number; winnerId: string | null };

const STORAGE_KEY = 'molkky-scorekeeper-v1';
const INITIAL_STATE: GameState = { players: [], phase: 'setup', turnIndex: 0, winnerId: null };
const FORMATION = [[7, 9, 8], [5, 11, 12, 6], [3, 10, 4], [1, 2]];

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as GameState : INITIAL_STATE;
  } catch { return INITIAL_STATE; }
}

/** Returns the next player who is still active, wrapping around the order. */
function nextActivePlayer(players: Player[], from: number): number {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (from + offset) % players.length;
    if (!players[index].eliminated) return index;
  }
  return from;
}

/** Creates a new, unbiased throwing order without mutating the saved line-up. */
function shufflePlayers(players: Player[]): Player[] {
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export default function App() {
  const [game, setGame] = useState<GameState>(loadState);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [isMiss, setIsMiss] = useState(false);
  const [showAllScores, setShowAllScores] = useState(false);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(game)), [game]);

  const current = game.players[game.turnIndex];
  const throwScore = isMiss ? 0 : selected.length === 1 ? selected[0] : selected.length;
  const winner = game.players.find((player) => player.id === game.winnerId);
  const nextThrower = game.players.length > 1
    ? game.players[nextActivePlayer(game.players, game.turnIndex)]
    : undefined;

  const rankedPlayers = useMemo(() => game.players.map((player, index) => ({ player, index })), [game.players]);

  function addPlayer(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    setGame((old) => ({ ...old, players: [...old.players, { id: crypto.randomUUID(), name: cleanName, score: 0, wins: 0, misses: 0, eliminated: false }] }));
    setName('');
  }

  function removePlayer(id: string) {
    setGame((old) => ({ ...old, players: old.players.filter((player) => player.id !== id) }));
  }

  function updatePlayerPhoto(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setGame((old) => ({ ...old, players: old.players.map((player) => player.id === id ? { ...player, photo: reader.result as string } : player) }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function startGame() {
    if (game.players.length < 2) return;
    setGame((old) => ({ ...old, phase: 'playing', turnIndex: 0, winnerId: null, players: shufflePlayers(old.players).map((p) => ({ ...p, score: 0, misses: 0, eliminated: false })) }));
    setSelected([]); setIsMiss(false); setShowAllScores(false);
  }

  function toggleSkittle(value: number) {
    setIsMiss(false);
    setSelected((old) => old.includes(value) ? old.filter((item) => item !== value) : [...old, value]);
  }

  function recordMiss() { setSelected([]); setIsMiss(true); }

  function confirmThrow() {
    if (!current || (!isMiss && selected.length === 0)) return;
    const players = game.players.map((player) => ({ ...player }));
    const player = players[game.turnIndex];
    player.misses = isMiss ? player.misses + 1 : 0;
    if (player.misses >= 3) player.eliminated = true;
    if (!isMiss) player.score = player.score + throwScore > 50 ? 25 : player.score + throwScore;

    let winnerId: string | null = null;
    if (player.score === 50) winnerId = player.id;
    // If every opponent is eliminated, the remaining player wins automatically.
    const survivors = players.filter((p) => !p.eliminated);
    if (!winnerId && survivors.length === 1) winnerId = survivors[0].id;
    if (!winnerId && survivors.length === 0) winnerId = null;
    if (winnerId) players.find((p) => p.id === winnerId)!.wins += 1;

    setGame({ players, phase: winnerId || survivors.length === 0 ? 'finished' : 'playing', turnIndex: winnerId ? game.turnIndex : nextActivePlayer(players, game.turnIndex), winnerId });
    setSelected([]); setIsMiss(false);
  }

  function resetEverything() {
    if (!window.confirm('Clear all players, scores and wins?')) return;
    localStorage.removeItem(STORAGE_KEY); setGame(INITIAL_STATE); setSelected([]); setIsMiss(false);
  }

  if (game.phase === 'setup') return (
    <main className="shell setup-shell">
      <header className="brand"><Logo /><div><p className="eyebrow">Garden game companion</p><h1>Mölkky</h1></div></header>
      <section className="hero"><p className="kicker">First to exactly</p><div className="fifty">50<span>pts</span></div><p>Add your players — the throwing order is randomized when the game starts.</p></section>
      <section className="card player-setup">
        <div className="section-heading"><div><p className="eyebrow">Line-up</p><h2>Who's playing?</h2></div><span>{game.players.length} {game.players.length === 1 ? 'player' : 'players'}</span></div>
        <form onSubmit={addPlayer} className="add-form"><input aria-label="Player or team name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Player or team name" maxLength={30}/><button aria-label="Add player"><Plus size={22}/></button></form>
        <div className="player-list">
          {game.players.length === 0 && <div className="empty"><UserRound/><p>Your throwing order will appear here.</p></div>}
          {game.players.map((player, index) => <div className="setup-player" key={player.id}><span className="order">{index + 1}</span>{player.photo ? <img className="player-avatar" src={player.photo} alt="" /> : <span className="player-avatar placeholder"><UserRound size={15}/></span>}<strong>{player.name}</strong>{player.wins > 0 && <span className="wins"><Trophy size={14}/>{player.wins}</span>}<label className="photo-button" aria-label={`Take a picture of ${player.name}`}><Camera size={17}/><input type="file" accept="image/*" capture="user" onChange={(event) => updatePlayerPhoto(player.id, event)} /></label><button onClick={() => removePlayer(player.id)} aria-label={`Remove ${player.name}`}><X size={19}/></button></div>)}
        </div>
      </section>
      <button className="primary start" disabled={game.players.length < 2} onClick={startGame}>Start game <ChevronRight/></button>
      {game.players.length < 2 && <p className="hint">Add at least 2 players to begin</p>}
      {game.players.length > 0 && <button className="text-button" onClick={resetEverything}>Reset all data</button>}
    </main>
  );

  if (game.phase === 'finished') return (
    <main className="shell finish-shell">
      <header className="brand"><Logo /><div><p className="eyebrow">Game complete</p><h1>Mölkky</h1></div></header>
      <section className="winner-card"><div className="trophy-ring"><Trophy size={54}/></div><p className="eyebrow">{winner ? 'Winner' : 'Game over'}</p><h2>{winner?.name ?? 'No players remain'}</h2>{winner && <p>{winner.score === 50 ? 'Hit exactly 50 points' : 'Last player standing'}</p>}</section>
      <section className="card standings"><div className="section-heading"><h2>Scoreboard</h2><span>All-time wins</span></div>{[...game.players].sort((a,b) => b.wins-a.wins).map((p, i) => <div className="standing" key={p.id}><span>{i+1}</span><strong>{p.name}</strong><b><Trophy size={15}/>{p.wins}</b></div>)}</section>
      <button className="primary" onClick={startGame}>Play another game <RotateCcw size={19}/></button>
      <button className="secondary" onClick={() => setGame((old) => ({ ...old, phase: 'setup' }))}>Edit players</button>
    </main>
  );

  return (
    <main className="game-layout">
      <header className="game-header"><div className="brand compact"><Logo /><div><p className="eyebrow">Scorekeeper</p><h1>Mölkky</h1></div></div><button className="icon-button" aria-label="Reset game" onClick={() => setGame((old) => ({ ...old, phase: 'setup' }))}><RotateCcw size={19}/></button></header>
      <div className="game-content">
        <section className="score-panel">
          <div className="score-prompt"><div><p className="eyebrow">Select fallen skittles</p><h3>{isMiss ? 'No skittles hit' : selected.length ? `${selected.length} selected` : 'What went down?'}</h3></div><div className={`pending-score ${selected.length || isMiss ? 'active' : ''}`}><span>Score</span><b>{throwScore}</b></div></div>
          <div className="formation" aria-label="Mölkky skittles">
            {FORMATION.map((row, rowIndex) => <div className="skittle-row" key={rowIndex}>{row.map((number) => <button key={number} aria-pressed={selected.includes(number)} onClick={() => toggleSkittle(number)} className={`skittle ${selected.includes(number) ? 'selected' : ''}`}><span>{selected.includes(number) && <Check size={17}/>}</span><b>{number}</b></button>)}</div>)}
          </div>
          <p className="rule-note">One skittle scores its number. Multiple score the number fallen.</p>
          <div className="actions"><button className={`miss-button ${isMiss ? 'chosen' : ''}`} onClick={recordMiss}><X size={22}/> Record miss</button><button className="confirm-button" disabled={!isMiss && selected.length === 0} onClick={confirmThrow}>Confirm {isMiss || selected.length ? `+${throwScore}` : ''}<ChevronRight size={22}/></button></div>
        </section>
        <aside className={`card scoreboard ${showAllScores ? 'expanded' : ''}`}><div className="section-heading"><div><p className="eyebrow">Throwing order</p><h2>Scoreboard</h2></div><span className="scoreboard-active">{game.players.filter((player) => !player.eliminated).length} active</span><span className="scoreboard-next">Next: {nextThrower?.name ?? '—'}</span></div>
          {rankedPlayers.map(({player, index}) => <div className={`score-row ${index === game.turnIndex ? 'current' : ''} ${player.eliminated ? 'eliminated' : ''}`} key={player.id}><span className="order">{index+1}</span>{player.photo ? <img className="player-avatar" src={player.photo} alt="" /> : <span className="player-avatar placeholder"><UserRound size={15}/></span>}<div className="player-meta"><strong>{player.name}</strong><small>{player.eliminated ? 'Eliminated' : player.misses ? `${player.misses}/3 misses` : `${player.wins} ${player.wins === 1 ? 'win' : 'wins'}`}</small></div><b className="player-score">{player.score}</b></div>)}
          <button className="scores-toggle" onClick={() => setShowAllScores((shown) => !shown)} aria-expanded={showAllScores}>{showAllScores ? 'Hide other scores' : 'Show all scores'}</button>
        </aside>
      </div>
    </main>
  );
}

function Logo() { return <div className="logo"><span>12</span></div>; }
