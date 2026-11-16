
import { useState, useEffect, useRef } from "react";
import Confetti from "react-confetti";
import diceRollSound from "src/sound_effect/dice_roll.mp3";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import Navbar from "src/components/Navbar";
import HomeButton from "src/components/HomeButton";

import { rollDice, bankScore } from "src/lib/api";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { useKeyboardControls } from "src/hooks/useKeyboardControls";
import useAudio from "src/hooks/useAudio";
import celebrationSound from "src/sound_effect/celebration.mp3";

import HelpPanel from "./components/HelpPanel";
import BoosterBar from "./components/BoosterBar";

const EMPTY_BOOSTERS = {
  scoreShield: false,
  luckyReroll: false,
  doublePoints: false,
};

// Each game has its own saved state.
// This prevents a previous game's boosters or scores
// from being loaded into a different game.
function storageKey(sessionId) {
  return `greedy-pig-active-game-${sessionId}`;
}

function loadSavedGame(sessionId) {
  if (!sessionId || typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      storageKey(sessionId)
    );

    if (!raw) return null;

    const saved = JSON.parse(raw);

    if (
      saved.sessionId !== sessionId ||
      !Array.isArray(saved.players) ||
      saved.players.length === 0
    ) {
      return null;
    }

    return saved;
  } catch (error) {
    console.warn("Could not restore saved game:", error);
    return null;
  }
}

function saveGame(sessionId, state) {
  if (!sessionId || typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      storageKey(sessionId),
      JSON.stringify({
        sessionId,
        ...state,
      })
    );
  } catch (error) {
    console.warn("Could not save game state:", error);
  }
}

export default function TrackedGame() {
  const location = useLocation();
  const navigate = useNavigate();

  const { refreshProfile, preloadSrcList } =
    useGreedyPigContext();

  const diceImages = preloadSrcList.filter((src) =>
    src.includes("dice")
  );

  const rollAudio = useAudio(diceRollSound);
  const celebrationAudio = useAudio(celebrationSound);

  const rollTimer = useRef(null);

  const {
    sessionId,
    maxScore,
    players: initialPlayers,
  } = location.state ?? {};

  // Read the saved game ONCE when this page mounts.
  // Do not reset it just because Profile was opened.
  const [savedGame] = useState(() =>
    loadSavedGame(sessionId)
  );

  const [players, setPlayers] = useState(
    () => savedGame?.players ?? initialPlayers ?? []
  );

  const [currentTurnIndex, setCurrentTurnIndex] =
    useState(() => savedGame?.currentTurnIndex ?? 0);

  const [visualDie, setVisualDie] = useState(
    () => savedGame?.visualDie ?? 1
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [riskNotice, setRiskNotice] = useState(false);

  const [rolling, setRolling] = useState(false);

  const [lastRoll, setLastRoll] = useState(
    () => savedGame?.lastRoll ?? []
  );

  const [message, setMessage] = useState(
    () => savedGame?.message ?? ""
  );

  const [gameOver, setGameOver] = useState(
    () => savedGame?.gameOver ?? false
  );

  const [winnerIndex, setWinnerIndex] = useState(
    () => savedGame?.winnerIndex ?? null
  );

  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  // Booster selections are temporary.
  // Remaining quantities are saved in each player.
  const [useBoosters, setUseBoosters] = useState({
    ...EMPTY_BOOSTERS,
  });

  // Save the CURRENT scores, turn, and booster counts.
  // The saved data belongs to this specific session ID.
  useEffect(() => {
    if (!sessionId || players.length === 0) return;

    saveGame(sessionId, {
      players,
      currentTurnIndex,
      visualDie,
      lastRoll,
      message,
      gameOver,
      winnerIndex,
    });
  }, [
    sessionId,
    players,
    currentTurnIndex,
    visualDie,
    lastRoll,
    message,
    gameOver,
    winnerIndex,
  ]);

  // Clear the dice animation when leaving the page.
  useEffect(() => {
    return () => {
      if (rollTimer.current) {
        clearInterval(rollTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!gameOver || !celebrationAudio) return;

    celebrationAudio.currentTime = 0;
    celebrationAudio.play().catch(() => {});
  }, [gameOver, celebrationAudio]);

  // Never put a hook below a conditional return.
  const current = players[currentTurnIndex];

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
    if (
      rolling ||
      gameOver ||
      !current ||
      !sessionId
    ) {
      return;
    }

    setError("");
    setMessage("");
    setRolling(true);

    if (rollAudio) {
      rollAudio.pause();
      rollAudio.currentTime = 0;
      rollAudio.play().catch(() => {});
    }

    let frame = 0;

    rollTimer.current = setInterval(() => {
      frame += 1;

      setVisualDie((previous) =>
        (previous % 6) + 1
      );

      if (frame >= 18) {
        clearInterval(rollTimer.current);
        rollTimer.current = null;
      }
    }, 85);

    const activePlayer = current;

    try {
      const result = await rollDice({
        sessionId,
        useBoosters,
      });

      setLastRoll(result.rolls ?? []);

      // Update only the player who rolled.
      // Other players' booster counts stay unchanged.
      updatePlayer(activePlayer.player_index, {
        turn_score: result.newTurnScore,
        total_score: result.newTotalScore,
        ...(result.remainingBoosters && {
          active_boosters: result.remainingBoosters,
        }),
      });

      if (result.riskBonus) {
        setMessage("Risk bonus earned!");
        setRiskNotice(true);

        setTimeout(() => {
          setRiskNotice(false);
        }, 2400);

        await refreshProfile?.();
      } else if (result.bust) {
        if (result.scoreLost) {
          setMessage(
            "You rolled a 1! Your turn score was lost."
          );
        } else {
          setMessage(
            "You rolled a 1, but your Score Shield protected your points!"
          );
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
      setError(
        err.message ||
          "Something went wrong while rolling."
      );
    } finally {
      if (rollTimer.current) {
        clearInterval(rollTimer.current);
        rollTimer.current = null;
      }

      setRolling(false);
    }
  }

  async function handleBank() {
    if (
      rolling ||
      gameOver ||
      !current ||
      !sessionId ||
      current.turn_score <= 0
    ) {
      return;
    }

    setError("");
    setMessage("");
    setRolling(true);

    const activePlayer = current;

    try {
      const result = await bankScore({
        sessionId,
      });

      updatePlayer(activePlayer.player_index, {
        total_score: result.newTotalScore,
        turn_score: 0,
      });

      setLastRoll([]);

      setMessage(
        `${activePlayer.display_name} banked their points.`
      );

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
      setError(
        err.message ||
          "Something went wrong while banking."
      );
    } finally {
      setRolling(false);
    }
  }

  // IMPORTANT:
  // This hook is called on EVERY render,
  // before any conditional return.
  // This avoids the previous React hooks crash.
  useKeyboardControls({
    onRoll: handleRoll,
    onBank: handleBank,
    onToggleHelp: () =>
      setHelpOpen((previous) => !previous),
    enabled:
      !rolling &&
      !gameOver &&
      Boolean(current) &&
      Boolean(sessionId),
  });

  const sortedPlayers = [...players].sort(
    (a, b) => b.total_score - a.total_score
  );

  const winner = players.find(
    (player) =>
      player.player_index === winnerIndex
  );

  const imageFor = (player) =>
    player?.avatar || null;

  // Conditional navigation happens AFTER all hooks.
  if (!sessionId || !initialPlayers?.length) {
    return (
      <Navigate
        to="/tracked-game/setup/"
        replace
      />
    );
  }

  if (!current) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative min-h-screen text-white md:grid md:grid-cols-[minmax(210px,24%)_1fr_minmax(220px,22%)]">
      <aside className="md:sticky md:top-0 md:h-screen border-r border-white/20 bg-black/10 flex flex-col items-center justify-around gap-5 p-5">
        <button
          type="button"
          onClick={handleRoll}
          disabled={rolling || gameOver}
          aria-label="Roll dice"
          className="w-48 h-48 md:w-full md:max-w-60 md:h-auto md:aspect-square rounded-lg flex items-center justify-center hover:scale-105 transition disabled:opacity-60"
        >
          {diceImages.length >= 6 ? (
            <img
              src={
                diceImages[
                  (rolling
                    ? visualDie
                    : lastRoll[0] || visualDie) - 1
                ]
              }
              alt="Dice — tap to roll"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-8xl">🎲</span>
          )}
        </button>

        <button
          onClick={handleBank}
          disabled={
            rolling ||
            gameOver ||
            current.turn_score <= 0
          }
          className="w-full rounded-lg border border-white/50 bg-[#056FA4c0] p-4 text-xl font-semibold disabled:opacity-40"
        >
          PASS / BANK
        </button>

        <div className="w-full rounded-lg border border-white/30 bg-white/10 p-4 text-center space-y-2">
          <p>{players.length} players</p>
          <p>{maxScore} max points</p>

          <p className="text-sm text-white/70">
            Space / Enter: Roll · B: Bank · H: Help
          </p>
        </div>

        <div className="relative">
          <button
            aria-label="Game menu"
            onClick={() =>
              setMenuOpen(!menuOpen)
            }
            className="rounded-full bg-[#95129b] w-12 h-12 text-2xl"
          >
            ☰
          </button>

          {menuOpen && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-44 rounded-lg border border-white/30 bg-[#23152c] p-2 z-20 space-y-2 shadow-xl">
              <button
                className="block w-full p-2 hover:bg-white/10"
                onClick={() =>
                  navigate("/tracked-game/setup/")
                }
              >
                New Game
              </button>

              <button
                className="block w-full p-2 hover:bg-white/10"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                Resume
              </button>

              <button
                className="block w-full p-2 hover:bg-white/10"
                onClick={() =>
                  setHelpOpen(true)
                }
              >
                Help (H)
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="p-3 min-w-0 space-y-5">
        <Navbar />

        <div className="overflow-x-auto">
          <table className="w-full text-center border border-white/30 border-collapse">
            <thead className="bg-white/10">
              <tr>
                <th className="p-3">Icons</th>
                <th className="p-3">Name</th>
                <th className="p-3">
                  Total Points
                </th>
                <th className="p-3">
                  Running Points
                </th>
              </tr>
            </thead>

            <tbody>
              {players.map((player) => (
                <tr
                  key={
                    player.id ||
                    player.player_index
                  }
                  className={`border-t border-white/20 ${
                    player.player_index ===
                    current.player_index
                      ? "bg-white/25"
                      : "bg-white/5"
                  }`}
                >
                  <td className="p-2">
                    {imageFor(player) ? (
                      <img
                        src={imageFor(player)}
                        alt=""
                        className="w-12 h-12 object-contain mx-auto"
                      />
                    ) : (
                      "🐷"
                    )}
                  </td>

                  <td className="p-2">
                    {player.display_name}
                    {player.profile_id
                      ? " ★"
                      : ""}
                  </td>

                  <td className="p-2">
                    {player.total_score}
                  </td>

                  <td className="p-2">
                    {player.turn_score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="max-w-3xl mx-auto pt-3">
          <BoosterBar
            player={current}
            value={useBoosters}
            onChange={setUseBoosters}
            disabled={rolling || gameOver}
          />
        </div>

        <div className="text-center space-y-2">
          <p className="text-white/70">
            Current turn score:{" "}
            <strong className="text-white">
              {current.turn_score}
            </strong>
          </p>

          {lastRoll.length > 1 && (
            <p>
              Dice rolled:{" "}
              {lastRoll.join(" + ")}
            </p>
          )}

          {riskNotice && (
            <div className="text-2xl text-green-300 font-bold animate-bounce">
              ↑ +10 XP · +5 coins
            </div>
          )}

          {message && (
            <p className="text-white/80">
              {message}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="text-red-300"
            >
              {error}
            </p>
          )}

          <p className="text-xs text-white/60">
            Tap the dice to roll · Select a
            booster before rolling
          </p>
        </div>
      </main>

      <aside className="border-l border-white/20 bg-black/10">
        <div className="flex flex-col items-center gap-2 p-5 border-b border-white/30">
          {imageFor(current) ? (
            <img
              src={imageFor(current)}
              alt=""
              className="w-36 h-36 object-contain rounded-lg border border-white/30 bg-white/10"
            />
          ) : (
            <div className="text-7xl">
              🐷
            </div>
          )}

          <p>
            {current.display_name}'s Turn
          </p>
        </div>

        <h2 className="pri-font text-center text-2xl p-4 border-b border-white/30">
          Leader Board
        </h2>

        <div className="p-2 space-y-1">
          {sortedPlayers.map(
            (player, index) => (
              <div
                key={
                  player.id ||
                  player.player_index
                }
                className={`flex items-center gap-3 p-3 border ${
                  index === 0
                    ? "border-yellow-500 text-yellow-300"
                    : "border-pink-800"
                }`}
              >
                <span>{index + 1}</span>

                {imageFor(player) && (
                  <img
                    src={imageFor(player)}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                )}

                <span className="flex-1 truncate">
                  {player.display_name}
                </span>

                <span>
                  {player.total_score +
                    player.turn_score}
                </span>
              </div>
            )
          )}
        </div>
      </aside>

      <HelpPanel
        open={helpOpen}
        onClose={() =>
          setHelpOpen(false)
        }
      />

      {gameOver && (
        <div className="fixed inset-0 z-40 bg-black/85 flex justify-center items-center p-5 text-center">
          <Confetti
            width={
              typeof window !== "undefined"
                ? window.innerWidth
                : 1200
            }
            height={
              typeof window !== "undefined"
                ? window.innerHeight
                : 800
            }
          />

          <div className="relative z-10 w-full max-w-sm space-y-5">
            {imageFor(winner) ? (
              <img
                src={imageFor(winner)}
                alt=""
                className="h-52 mx-auto object-contain"
              />
            ) : (
              <div className="text-8xl">
                🐷
              </div>
            )}

            <h1 className="pri-font text-5xl">
              {winner?.display_name ||
                "Player"}{" "}
              Wins!
            </h1>

            <button
              onClick={() =>
                navigate("/tracked-game/setup/")
              }
              className="block w-full rounded-lg bg-[#D30CBD] p-4 text-xl font-bold"
            >
              Play Again
            </button>

            <button
              onClick={() =>
                navigate("/")
              }
              className="block w-full rounded-lg bg-[#D30CBD] p-4 text-xl font-bold"
            >
              Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
