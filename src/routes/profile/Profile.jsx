import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import BackButton from "src/components/BackButton";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { supabase } from "src/lib/supabase";
import { purchaseBooster } from "src/lib/api";

export default function Profile() {
  const { user, profile, authLoading, refreshProfile, signOut } = useGreedyPigContext();
  const [achievements, setAchievements] = useState([]);
  const [unlockedKeys, setUnlockedKeys] = useState(new Set());
  const [boosters, setBoosters] = useState([]);
  const [owned, setOwned] = useState({});
  const [buyError, setBuyError] = useState("");

  const loadExtras = useCallback(async () => {
    if (!user) return;
    const [{ data: allAchievements }, { data: unlocked }, { data: allBoosters }, { data: playerBoosters }] =
      await Promise.all([
        supabase.from("achievements").select("*").order("requirement_value"),
        supabase.from("player_achievements").select("achievement_key").eq("profile_id", user.id),
        supabase.from("boosters").select("*"),
        supabase.from("player_boosters").select("booster_key, quantity").eq("profile_id", user.id),
      ]);
    setAchievements(allAchievements ?? []);
    setUnlockedKeys(new Set((unlocked ?? []).map((a) => a.achievement_key)));
    setBoosters(allBoosters ?? []);
    setOwned(Object.fromEntries((playerBoosters ?? []).map((b) => [b.booster_key, b.quantity])));
  }, [user]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  async function handleBuy(boosterKey) {
    setBuyError("");
    try {
      await purchaseBooster({ boosterKey });
      await Promise.all([refreshProfile(), loadExtras()]);
    } catch (err) {
      setBuyError(err.message);
    }
  }

  if (authLoading) return null;
  if (!user) return <Navigate to="/account" replace />;

  const xpIntoLevel = profile ? profile.xp % 100 : 0;

  return (
    <div className="p-[5%] flex flex-col relative w-full items-center min-h-screen">
      <nav className="fixed top-0 w-full flex justify-between p-[5%]">
        <BackButton />
        <button
          onClick={signOut}
          className="bg-[#ffffff10] hover:bg-[#ffffff40] duration-300 text-white px-4 h-[48px] border rounded-full"
        >
          Sign out
        </button>
      </nav>

      <div className="flex flex-col items-center gap-8 lg:gap-12 w-full md:max-w-[70%] xl:max-w-[55%] text-white mt-20">
        <section className="w-full text-center space-y-2">
          <h1 className="pri-font text-2xl lg:text-4xl">{profile?.username}</h1>
          <p>Level {profile?.level ?? 1} &middot; {profile?.coins ?? 0} coins</p>
          <div className="w-full h-3 bg-[#ffffff20] rounded-full overflow-hidden">
            <div className="h-full bg-[#D30CBD]" style={{ width: `${xpIntoLevel}%` }} />
          </div>
          <p className="text-xs text-[#ffffffa0]">{xpIntoLevel} / 100 XP to next level</p>
        </section>

        <section className="w-full grid grid-cols-3 gap-4 text-center">
          <div className="bg-[#ffffff10] border rounded-lg p-4">
            <p className="text-2xl font-bold">{profile?.games_played ?? 0}</p>
            <p className="text-xs text-[#ffffffa0]">Games played</p>
          </div>
          <div className="bg-[#ffffff10] border rounded-lg p-4">
            <p className="text-2xl font-bold">{profile?.games_won ?? 0}</p>
            <p className="text-xs text-[#ffffffa0]">Games won</p>
          </div>
          <div className="bg-[#ffffff10] border rounded-lg p-4">
            <p className="text-2xl font-bold">{profile?.best_turn_score ?? 0}</p>
            <p className="text-xs text-[#ffffffa0]">Best turn score</p>
          </div>
        </section>

        <section className="w-full space-y-4">
          <h2 className="pri-font text-xl lg:text-2xl">Booster Shop</h2>
          {buyError && <p className="text-[#ff6b6b] text-sm">{buyError}</p>}
          <div className="grid grid-cols-fluid gap-4">
            {boosters.map((b) => (
              <div key={b.key} className="bg-[#ffffff10] border rounded-lg p-4 space-y-2">
                <p className="font-bold">{b.name}</p>
                <p className="text-sm text-[#ffffffa0]">{b.description}</p>
                <p className="text-sm">Owned: {owned[b.key] ?? 0}</p>
                <button
                  onClick={() => handleBuy(b.key)}
                  disabled={(profile?.coins ?? 0) < b.cost_coins}
                  className="sec-font rounded px-4 py-2 bg-[#D30CBD] font-bold duration-300 disabled:opacity-40 w-full"
                >
                  Buy for {b.cost_coins} coins
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full space-y-4">
          <h2 className="pri-font text-xl lg:text-2xl">Achievements</h2>
          <div className="grid grid-cols-fluid gap-4">
            {achievements.map((a) => {
              const unlocked = unlockedKeys.has(a.key);
              return (
                <div
                  key={a.key}
                  className={`border rounded-lg p-4 ${unlocked ? "bg-[#D30CBD30]" : "bg-[#ffffff10] opacity-60"}`}
                >
                  <p className="font-bold">{unlocked ? "✓ " : ""}{a.name}</p>
                  <p className="text-sm text-[#ffffffa0]">{a.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
