import { NavLink, Route, Routes } from "react-router-dom";
import { usePlayer } from "./player";
import Dashboard from "./pages/Dashboard";
import GamePlan from "./pages/GamePlan";
import HoleDetail from "./pages/HoleDetail";
import Holes from "./pages/Holes";
import LogRound from "./pages/LogRound";
import RoundDetail from "./pages/RoundDetail";
import Rounds from "./pages/Rounds";

export default function App() {
  const { players, player, error, setPlayerId } = usePlayer();
  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">
          Golf Strategy
          <span>Batchworth Park</span>
        </div>
        <div className="player-switch" role="group" aria-label="Player">
          {players.map((p) => (
            <button
              key={p.id}
              className={player?.id === p.id ? "on" : ""}
              onClick={() => setPlayerId(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/log">Log round</NavLink>
        <NavLink to="/rounds">Rounds</NavLink>
        <NavLink to="/holes">Holes</NavLink>
        <NavLink to="/plan">Game plan</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/log" element={<LogRound />} />
        <Route path="/rounds" element={<Rounds />} />
        <Route path="/rounds/:id" element={<RoundDetail />} />
        <Route path="/rounds/:id/edit" element={<LogRound />} />
        <Route path="/holes" element={<Holes />} />
        <Route path="/holes/:n" element={<HoleDetail />} />
        <Route path="/plan" element={<GamePlan />} />
      </Routes>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
