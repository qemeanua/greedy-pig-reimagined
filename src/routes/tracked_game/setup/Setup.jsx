import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  IoIosArrowBack,
  IoIosArrowForward,
  IoMdAdd,
} from "react-icons/io";

import BackButton from "src/components/BackButton";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { startGame } from "src/lib/api";
import { generateId } from "src/utils/generateData";
import useAudio from "src/hooks/useAudio";
import selectSound from "src/sound_effect/selection_button.mp3";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

function createPlayer(index, pigs) {
  return {
    id: generateId(),
    name: "",
    pigIndex: pigs.length ? index % pigs.length : 0,
  };
}

export default function TrackedSetup() {
  const {
    user,
    authLoading,
    profile,
    preloadSrcList,
    pigPetNames,
  } = useGreedyPigContext();

  const navigate = useNavigate();
  const audio = useAudio(selectSound);

  const pigs = preloadSrcList.filter((image) =>
    image.includes("pig")
  );

  const accountName =
    profile?.username ||
    user?.user_metadata?.username ||
    "You";

  const [players, setPlayers] = useState(() => [
    createPlayer(0, pigs),
    createPlayer(1, pigs),
  ]);

  const [accountPlayerIndex, setAccountPlayerIndex] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  if (authLoading) return null;
  if (!user) return <Navigate to="/account" replace />;

  function playSelectionSound() {
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function addPlayer() {
    if (players.length >= MAX_PLAYERS) return;

    playSelectionSound();

    setPlayers((currentPlayers) => [
      ...currentPlayers,
      createPlayer(currentPlayers.length, pigs),
    ]);
  }

  function removePlayer(index) {
    if (players.length <= MIN_PLAYERS) return;

    playSelectionSound();

    const updatedPlayers = players.filter(
      (_, playerIndex) => playerIndex !== index
    );

    setPlayers(updatedPlayers);

    if (index === accountPlayerIndex) {
      setAccountPlayerIndex(
        Math.min(index, updatedPlayers.length - 1)
      );
    } else if (index < accountPlayerIndex) {
      setAccountPlayerIndex((current) => current - 1);
    }
  }

  function updatePlayerName(index, value) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, playerIndex) =>
        playerIndex === index
          ? { ...player, name: value }
          : player
      )
    );
  }

  function changePig(index, direction) {
    if (!pigs.length) return;

    playSelectionSound();

    setPlayers((currentPlayers) =>
      currentPlayers.map((player, playerIndex) => {
        if (playerIndex !== index) return player;

        const nextIndex =
          (player.pigIndex + direction + pigs.length) %
          pigs.length;

        return { ...player, pigIndex: nextIndex };
      })
    );
  }

  function assignAccount(index) {
    playSelectionSound();
    setAccountPlayerIndex(index);
  }

  async function handleStart() {
    setError("");

    const score = Number(maxScore);

    if (
      !Number.isInteger(score) ||
      score < 25 ||
      score > 1000
    ) {
      setError(
        "Maximum score must be a whole number between 25 and 1000."
      );
      return;
    }

    if (
      accountPlayerIndex < 0 ||
      accountPlayerIndex >= players.length
    ) {
      setError("Please select the player representing your account.");
      return;
    }

    const playerNames = players.map((player, index) => {
      if (index === accountPlayerIndex) return accountName;
      return player.name.trim() || `Player ${index + 1}`;
    });

    setStarting(true);

    try {
      const { session, players: sessionPlayers } = await startGame({
        playerNames,
        maxScore: score,
        accountPlayerIndex,
      });

      // Attach the selected pig artwork to the returned server players.
      const playersWithAvatars = sessionPlayers.map(
        (sessionPlayer, index) => ({
          ...sessionPlayer,
          avatar: pigs[players[index].pigIndex],
          pig_index: players[index].pigIndex,
        })
      );

      navigate("/tracked-game/play", {
        state: {
          sessionId: session.id,
          maxScore: session.max_score,
          players: playersWithAvatars,
        },
      });
    } catch (err) {
      setError(
        err.message || "Unable to start the game. Please try again."
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="p-[5%] flex flex-col relative w-full items-center min-h-screen">
      <nav className="fixed top-0 w-full p-[5%] z-10">
        <BackButton />
      </nav>

      <div className="flex flex-col items-center gap-6 text-white mt-20 w-full max-w-4xl">
        <section className="text-center space-y-2">
          <h1 className="pri-font text-2xl lg:text-3xl">
            Tracked Play
          </h1>

          <p className="text-sm text-[#ffffffa0] max-w-xl">
            Play with friends on the same device. Choose your pigs
            and select which player represents your account.
            Your XP, coins and progression will be recorded for
            that player.
          </p>
        </section>

        <section className="flex flex-col w-full max-w-xs gap-2">
          <label htmlFor="max-score">Maximum Score</label>

          <input
            id="max-score"
            type="number"
            min={25}
            max={1000}
            step={1}
            value={maxScore}
            onChange={(event) => setMaxScore(event.target.value)}
            className="p-3 bg-[#ffffff20] border border-[#ffffff40] rounded-md w-full"
          />

          <p className="text-xs text-[#ffffff80]">
            Choose a target between 25 and 1000 points.
          </p>
        </section>

        <section className="w-full space-y-3">
          <div className="flex justify-between items-center gap-3">
            <h2 className="pri-font text-lg">
              Players ({players.length}/{MAX_PLAYERS})
            </h2>

            <p className="text-xs text-[#ffffff80]">
              Minimum {MIN_PLAYERS} players
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player, index) => {
              const isAccountPlayer =
                index === accountPlayerIndex;

              const pigName =
                pigPetNames?.[player.pigIndex] || "Your pig";

              return (
                <div
                  key={player.id}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border duration-300 ${
                    isAccountPlayer
                      ? "border-[#D30CBD] bg-[#D30CBD15]"
                      : "border-[#ffffff40] bg-[#ffffff10]"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <h3 className="font-bold">
                      Player {index + 1}
                    </h3>

                    {isAccountPlayer ? (
                      <span className="text-xs text-[#F08BE8] border border-[#D30CBD80] rounded-full px-2 py-1">
                        Your account
                      </span>
                    ) : (
                      <span className="text-xs text-[#ffffff80]">
                        Guest
                      </span>
                    )}
                  </div>

                  <div className="w-full h-40 flex items-center justify-center">
                    {pigs.length > 0 && (
                      <img
                        src={pigs[player.pigIndex]}
                        alt={pigName}
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>

                  <p className="text-sm text-[#ffffffa0]">
                    {pigName}
                  </p>

                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => changePig(index, -1)}
                      disabled={pigs.length === 0}
                      aria-label={`Previous pig for player ${index + 1}`}
                      className="flex-1 flex justify-center items-center p-2 rounded border border-[#ffffff40] bg-[#ffffff10] hover:bg-[#ffffff30] disabled:opacity-30"
                    >
                      <IoIosArrowBack size={22} />
                    </button>

                    <button
                      type="button"
                      onClick={() => changePig(index, 1)}
                      disabled={pigs.length === 0}
                      aria-label={`Next pig for player ${index + 1}`}
                      className="flex-1 flex justify-center items-center p-2 rounded border border-[#ffffff40] bg-[#ffffff10] hover:bg-[#ffffff30] disabled:opacity-30"
                    >
                      <IoIosArrowForward size={22} />
                    </button>
                  </div>

                  {isAccountPlayer ? (
                    <div className="w-full p-3 rounded-md bg-[#D30CBD20] border border-[#D30CBD60] text-center">
                      <p className="text-xs text-[#ffffff80]">
                        Signed-in player
                      </p>

                      <p className="font-bold break-words">
                        {accountName}
                      </p>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={player.name}
                        onChange={(event) =>
                          updatePlayerName(index, event.target.value)
                        }
                        placeholder={`Enter Player ${index + 1}'s name`}
                        maxLength={40}
                        className="w-full p-3 text-center bg-[#ffffff10] border border-[#ffffff40] rounded-md"
                      />

                      <button
                        type="button"
                        onClick={() => assignAccount(index)}
                        className="w-full p-2 text-sm rounded-md border border-[#D30CBD80] text-[#F08BE8] hover:bg-[#D30CBD20] duration-200"
                      >
                        Set as my player
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => removePlayer(index)}
                    disabled={players.length <= MIN_PLAYERS}
                    className="text-xs text-red-300 hover:text-red-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Remove player
                  </button>
                </div>
              );
            })}

            {players.length < MAX_PLAYERS && (
              <button
                type="button"
                onClick={addPlayer}
                className="min-h-64 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-[#ffffff50] bg-[#ffffff08] hover:bg-[#ffffff15] duration-200"
              >
                <IoMdAdd size={32} />
                <span className="font-bold">Add Player</span>
                <span className="text-xs text-[#ffffff80]">
                  Add another local guest
                </span>
              </button>
            )}
          </div>
        </section>

        <div className="text-sm text-center text-[#ffffffa0] space-y-1">
          <p>
            Only the player representing your account receives
            account progression rewards.
          </p>

          <p>All other players are local guests.</p>
        </div>

        {error && (
          <p className="text-[#ff6b6b] text-sm text-center">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={starting || players.length < MIN_PLAYERS}
          className="sec-font text-xl rounded px-16 py-4 bg-[#D30CBD] font-bold duration-300 hover:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {starting ? "Starting..." : "Start Game"}
        </button>
      </div>
    </div>
  );
}