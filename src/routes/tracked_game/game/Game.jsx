import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import Navbar from "src/components/Navbar";
import HomeButton from "src/components/HomeButton";

import { rollDice, bankScore } from "src/lib/api";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { useKeyboardControls } from "src/hooks/useKeyboardControls";

import HelpPanel from "./components/HelpPanel";
import BoosterBar from "./components/BoosterBar";

const EMPTY_BOOSTERS = {
  scoreShield: false,
  luckyReroll: false,
  doublePoints: false,
};

export default function TrackedGame() {
  const location = useLocation();
  const navigate = useNavigate();

  const { refreshProfile } = useGreedyPigContext();

  const {
    sessionId,
    maxScore,
    players: initialPlayers,
  } = location.state ?? {};

  const [players, setPlayers] = useState(initialPlayers ?? []);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState([]);
  const [message, setMessage] = useState("");

  const [gameOver, setGameOver] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(null);

  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  const [useBoosters, setUseBoosters] = useState(EMPTY_BOOSTERS);

  if (!sessionId || !initialPlayers?.length) {
    return <Navigate to="/tracked-game/setup/" replace />;
  }

  const current = players[currentTurnIndex];

  if (!current) {
    return <Navigate to="/" replace />;
  }

  function updatePlayer(playerIndex, updates) {
    setPlayers((previousPlayers) =>
      previousPlayers.map((player) =>
        player.player_index === playerIndex
          ? { ...player, ...updates }
          : player
      )
    );
  }

  function resetBoosterSelection() {
    setUseBoosters({ ...EMPTY_BOOSTERS });
  }

  async function handleRoll() {
    if (rolling || gameOver) return;

    setError("");
    setMessage("");
    setRolling(true);

    const activePlayer = players[currentTurnIndex];

    try {
      const result = await rollDice({
        sessionId,
        useBoosters,
      });

      // Always display the dice values returned by the server.
      setLastRoll(result.rolls ?? []);

      updatePlayer(activePlayer.player_index, {
        turn_score: result.newTurnScore,
        total_score: result.newTotalScore,
        ...(result.remainingBoosters && {
          active_boosters: result.remainingBoosters,
        }),
      });

      if (result.bust) {
        if (result.scoreLost) {
          setMessage("You rolled a 1! Your turn score was lost.");
        } else {
          setMessage("You rolled a 1, but your Score Shield protected your points!");
        }
      } else {
        setMessage(
          `You rolled ${result.rolls?.join(" and ")}!`
        );
      }

      resetBoosterSelection();

      if (result.gameOver) {
        setWinnerIndex(result.winnerPlayerIndex);
        setGameOver(true);

        if (activePlayer.profile_id) {
          await refreshProfile?.();
        }
      } else if (result.bust) {
        setCurrentTurnIndex(result.nextTurnIndex);
      }
    } catch (err) {
      setError(err.message || "Something went wrong while rolling.");
    } finally {
      setRolling(false);
    }
  }

  async function handleBank() {
    if (rolling || gameOver || current.turn_score <= 0) return;

    setError("");
    setMessage("");
    setRolling(true);

    const activePlayer = players[currentTurnIndex];

    try {
      const result = await bankScore({ sessionId });

      updatePlayer(activePlayer.player_index, {
        total_score: result.newTotalScore,
        turn_score: 0,
      });

      setLastRoll([]);
      setMessage(`${activePlayer.display_name} banked their points.`);

      resetBoosterSelection();

      if (result.gameOver) {
        setWinnerIndex(result.winnerPlayerIndex);
        setGameOver(true);

        if (activePlayer.profile_id) {
          await refreshProfile?.();
        }
      } else {
        setCurrentTurnIndex(result.nextTurnIndex);
      }
    } catch (err) {
      setError(err.message || "Something went wrong while banking.");
    } finally {
      setRolling(false);
    }
  }

  useKeyboardControls({
    onRoll: handleRoll,
    onBank: handleBank,
    onToggleHelp: () => setHelpOpen((previous) => !previous),
    enabled: !rolling && !gameOver,
  });

  if (gameOver) {
    const winner = players.find(
      (player) => player.player_index === winnerIndex
    );

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-7 px-5 text-white text-center">
        <h1 className="pri-font text-4xl md:text-5xl">
          {winner ? `${winner.display_name} wins!` : "Game over!"}
        </h1>

        <p className="text-[#ffffffa0] text-lg">
          {winner
            ? `Congratulations, ${winner.display_name}!`
            : "The game has ended."}
        </p>

        <div className="w-full max-w-sm rounded-xl border border-[#ffffff30] bg-[#ffffff10] p-5 space-y-3">
          <h2 className="pri-font text-xl">Final Scores</h2>

          {players
            .slice()
            .sort((a, b) => b.total_score - a.total_score)
            .map((player) => (
              <div
                key={player.id}
                className="flex justify-between items-center"
              >
                <span>{player.display_name}</span>
                <span className="font-bold">{player.total_score}</span>
              </div>
            ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <button
            onClick={() => navigate("/tracked-game/setup/")}
            className="sec-font text-lg rounded-lg px-8 py-4 bg-[#D30CBD] font-bold transition duration-300 hover:scale-95 flex-1"
          >
            Play Again
          </button>

          <div className="flex-1">
            <HomeButton />
          </div>
        </div>
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

      <section className="text-center space-y-2">
        <p className="text-sm text-[#ffffffa0]">
          First to {maxScore} points wins
        </p>

        <h1 className="pri-font text-2xl md:text-3xl text-[#D30CBD]">
          {current.display_name}'s Turn
        </h1>

        <p className="text-sm text-[#ffffffa0]">
          Build your score, then bank it before you roll a 1!
        </p>
      </section>

      <section className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[#ffffffa0] text-sm border-b border-[#ffffff30]">
              <th className="py-3">Player</th>
              <th className="py-3">Total</th>
              <th className="py-3">Turn</th>
            </tr>
          </thead>

          <tbody>
            {players.map((player, index) => (
              <tr
                key={player.id}
                className={`border-b border-[#ffffff15] ${
                  index === currentTurnIndex
                    ? "text-[#D30CBD] font-bold"
                    : "text-white"
                }`}
              >
                <td className="py-3">
                  {player.display_name}
                  {player.profile_id ? " (Account)" : ""}
                  {index === currentTurnIndex ? " ★" : ""}
                </td>

                <td className="py-3">{player.total_score}</td>

                <td className="py-3">{player.turn_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col items-center gap-5 pt-4">
        <div className="text-center">
          <p className="text-sm text-[#ffffffa0]">Current turn score</p>
          <p className="pri-font text-5xl text-white">
            {current.turn_score}
          </p>
        </div>

        <BoosterBar
          player={current}
          value={useBoosters}
          onChange={setUseBoosters}
        />

        <div className="min-h-12 flex items-center justify-center">
          {rolling ? (
            <p className="text-[#D30CBD] animate-pulse">
              Rolling dice...
            </p>
          ) : lastRoll.length > 0 ? (
            <div className="flex gap-3 items-center">
              {lastRoll.map((die, index) => (
                <div
                  key={index}
                  className="w-14 h-14 rounded-xl bg-white text-black flex items-center justify-center text-3xl font-bold shadow-lg"
                >
                  {die}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#ffffff70]">
              Your dice results will appear here.
            </p>
          )}
        </div>

        {message && (
          <p className="text-center text-sm text-[#ffffffc0]">
            {message}
          </p>
        )}

        {error && (
          <p className="text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={handleRoll}
            disabled={rolling}
            className="sec-font text-xl rounded-lg px-8 py-4 bg-[#D30CBD] font-bold transition duration-300 hover:scale-95 disabled:opacity-50 flex-1"
          >
            {rolling ? "Rolling..." : "Roll Dice"}
          </button>

          <button
            onClick={handleBank}
            disabled={rolling || current.turn_score <= 0}
            className="sec-font text-xl rounded-lg px-8 py-4 bg-[#ffffff20] border border-[#ffffff40] font-bold transition duration-300 hover:scale-95 disabled:opacity-30 flex-1"
          >
            Bank Points
          </button>
        </div>

        <p className="text-xs text-[#ffffff70] text-center">
          Space / Enter to roll · B to bank · H for help
        </p>
      </section>
    </div>
  );
}