import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "src/components/Navbar";
import { rollDice, bankScore } from "src/lib/api";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { useKeyboardControls } from "src/hooks/useKeyboardControls";
import HelpPanel from "./components/HelpPanel";
import BoosterBar from "./components/BoosterBar";

export default function TrackedGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshProfile } = useGreedyPigContext();
  const { sessionId, maxScore, players: initialPlayers } = location.state ?? {};

  const [players, setPlayers] = useState(initialPlayers);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(null);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  console.log("TRACKED GAME IS RUNNING");

  const [useBoosters, setUseBoosters] = useState({
    scoreShield: false,
    luckyReroll: false,
    doublePoints: false,
  });

  if (!sessionId) return <Navigate to="/tracked-game/setup" replace />;

  const current = players[currentTurnIndex];

  function applyCurrentPlayerUpdate(patch) {
    setPlayers((prev) => prev.map((p, i) => (i === currentTurnIndex ? { ...p, ...patch } : p)));
  }

  async function handleRoll() {
    setError("");
    setRolling(true);
    try {

      const result = await rollDice({ sessionId, useBoosters });
      applyCurrentPlayerUpdate({
        turn_score: result.newTurnScore,
        total_score: result.newTotalScore,
        ...(result.remainingBoosters && {
          active_boosters: result.remainingBoosters,
        }),
      });
      setMessage(
        result.bust
          ? result.scoreLost
            ? "Rolled a 1 — turn score lost."
            : "Rolled a 1 — Score Shield saved your points!"
          : `Rolled a ${result.rolls[result.rolls.length - 1]}.`
      );
      setUseBoosters({
        scoreShield: false,
        luckyReroll: false,
        doublePoints: false,
      });

      if (result.gameOver) {
        setGameOver(true);
        setWinnerIndex(result.winnerPlayerIndex);
        if (current.profile_id) refreshProfile();
      } else if (result.bust) {
        setCurrentTurnIndex(result.nextTurnIndex);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRolling(false);
    }
  }

  async function handleBank() {
    setError("");
    setRolling(true);
    try {
      const result = await bankScore({ sessionId });
      applyCurrentPlayerUpdate({ total_score: result.newTotalScore, turn_score: 0 });
      setMessage(`${current.display_name} banked their points.`);

      if (result.gameOver) {
        setGameOver(true);
        setWinnerIndex(result.winnerPlayerIndex);
        if (current.profile_id) refreshProfile();
      } else {
        setCurrentTurnIndex(result.nextTurnIndex);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRolling(false);
    }
  }

  useKeyboardControls({
    onRoll: handleRoll,
    onBank: handleBank,
    onToggleHelp: () => setHelpOpen((o) => !o),
    enabled: !rolling && !gameOver,
  });

  if (gameOver) {
    const winner = players.find((p) => p.player_index === winnerIndex);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-white">
        <h1 className="pri-font text-3xl">{winner ? `${winner.display_name} wins!` : "Game over"}</h1>
        <button
          onClick={() => navigate("/tracked-game/setup")}
          className="sec-font text-xl rounded px-8 py-4 bg-[#D30CBD] font-bold duration-300"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-[5%] text-white space-y-6">
      <Navbar />
      <div className="flex justify-end">
        <button
          onClick={() => setHelpOpen(true)}
          className="text-sm underline text-[#ffffffa0]"
        >
          Help (H)
        </button>
      </div>

      <HelpPanel
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

      <table className="w-full text-left">
        <thead>
          <tr className="text-[#ffffffa0] text-sm">
            <th>Player</th>
            <th>Total</th>
            <th>Turn</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.id} className={i === currentTurnIndex ? "text-[#D30CBD] font-bold" : ""}>
              <td>{p.display_name}</td>
              <td>{p.total_score}</td>
              <td>{p.turn_score}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-sm text-[#ffffffa0]">Max score: {maxScore}</p>

      <div className="flex flex-col items-center gap-4">
        <BoosterBar
          player={current}
          value={useBoosters}
          onChange={setUseBoosters}
        />
        {lastRoll && <p className="text-2xl">🎲 {lastRoll.join(" → ")}</p>}
        {message && <p>{message}</p>}
        {error && <p className="text-[#ff6b6b] text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            onClick={handleRoll}
            disabled={rolling}
            className="sec-font text-xl rounded px-8 py-4 bg-[#D30CBD] font-bold duration-300 disabled:opacity-50"
          >
            Roll
          </button>
          <button
            onClick={handleBank}
            disabled={rolling || current.turn_score === 0}
            className="sec-font text-xl rounded px-8 py-4 bg-[#ffffff20] font-bold duration-300 disabled:opacity-50"
          >
            Bank
          </button>
        </div>
        <p className="text-xs text-[#ffffffa0] text-center">
          Space to roll · B to bank · H for help
        </p>
      </div>
    </div>
  );
}
