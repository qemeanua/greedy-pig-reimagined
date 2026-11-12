import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import BackButton from "src/components/BackButton";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { startGame } from "src/lib/api";

export default function TrackedSetup() {
  const { user, authLoading, profile } = useGreedyPigContext();
  const navigate = useNavigate();
  const [guestNames, setGuestNames] = useState([]);
  const [maxScore, setMaxScore] = useState(100);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  if (authLoading) return null;
  if (!user) return <Navigate to="/account" replace />;

  function addGuest() {
    if (guestNames.length >= 7) return;
    setGuestNames([...guestNames, ""]);
  }

  function updateGuest(index, value) {
    setGuestNames(guestNames.map((n, i) => (i === index ? value : n)));
  }

  function removeGuest(index) {
    setGuestNames(guestNames.filter((_, i) => i !== index));
  }

  async function handleStart() {
    setError("");
    setStarting(true);
    try {
      const playerNames = [profile?.username ?? "You", ...guestNames.map((n) => n.trim() || undefined).filter(Boolean)];
      const { session, players } = await startGame({ playerNames, maxScore: Number(maxScore) });
      navigate("/tracked-game/play", { state: { sessionId: session.id, maxScore: session.max_score, players } });
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="p-[5%] flex flex-col relative w-full items-center min-h-screen">
      <nav className="fixed top-0 w-full p-[5%]">
        <BackButton />
      </nav>

      <div className="flex flex-col items-center gap-6 text-white mt-20 w-full max-w-md">
        <h1 className="pri-font text-2xl lg:text-3xl">Tracked Play</h1>
        <p className="text-sm text-[#ffffffa0] text-center">
          Rolls and scoring run on the server. Only {profile?.username ?? "you"} earns XP, coins, and achievements —
          anyone else here plays as a guest on this device.
        </p>

        <section className="flex flex-col w-full">
          <label>Max Score</label>
          <input
            type="number"
            min={25}
            max={1000}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            className="p-2 bg-[#ffffff20] border rounded-md"
          />
        </section>

        <section className="w-full space-y-2">
          <p>Other local players (optional)</p>
          {guestNames.map((name, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={name}
                onChange={(e) => updateGuest(i, e.target.value)}
                placeholder={`Guest ${i + 1}`}
                className="p-2 bg-[#ffffff20] border rounded-md flex-1"
              />
              <button onClick={() => removeGuest(i)} className="px-3 bg-[#ffffff10] border rounded-md">
                ✕
              </button>
            </div>
          ))}
          {guestNames.length < 7 && (
            <button onClick={addGuest} className="text-sm underline text-[#ffffffa0]">
              + Add guest player
            </button>
          )}
        </section>

        {error && <p className="text-[#ff6b6b] text-sm">{error}</p>}

        <button
          onClick={handleStart}
          disabled={starting}
          className="sec-font text-xl rounded px-16 py-4 bg-[#D30CBD] font-bold duration-300 disabled:opacity-50"
        >
          {starting ? "Starting..." : "Start Game"}
        </button>
      </div>
    </div>
  );
}
