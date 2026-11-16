
import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";

import BackButton from "src/components/BackButton";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { supabase } from "src/lib/supabase";
import { purchaseBooster } from "src/lib/api";

const BOOSTER_ICONS = {
  score_shield: "🛡️",
  lucky_reroll: "🍀",
  double_points: "×2",
};

export default function Profile() {
  const {
    user,
    profile,
    authLoading,
    refreshProfile,
    signOut,
  } = useGreedyPigContext();

  const [achievements, setAchievements] = useState([]);
  const [unlockedKeys, setUnlockedKeys] = useState(new Set());
  const [boosters, setBoosters] = useState([]);
  const [owned, setOwned] = useState({});
  const [buyError, setBuyError] = useState("");
  const [buySuccess, setBuySuccess] = useState("");
  const [buying, setBuying] = useState(null);
  const [loadingExtras, setLoadingExtras] = useState(true);

  const loadExtras = useCallback(async () => {
    if (!user) {
      setLoadingExtras(false);
      return;
    }

    setLoadingExtras(true);

    try {
      const [
        achievementsResult,
        unlockedResult,
        boostersResult,
        ownedResult,
      ] = await Promise.all([
        supabase
          .from("achievements")
          .select("*")
          .order("requirement_value"),
        supabase
          .from("player_achievements")
          .select("achievement_key")
          .eq("profile_id", user.id),
        supabase
          .from("boosters")
          .select("*")
          .order("cost_coins"),
        supabase
          .from("player_boosters")
          .select("booster_key, quantity")
          .eq("profile_id", user.id),
      ]);

      const results = [
        achievementsResult,
        unlockedResult,
        boostersResult,
        ownedResult,
      ];

      const failed = results.find((result) => result.error);

      if (failed) {
        throw failed.error;
      }

      setAchievements(achievementsResult.data ?? []);

      setUnlockedKeys(
        new Set(
          (unlockedResult.data ?? []).map(
            (item) => item.achievement_key
          )
        )
      );

      setBoosters(boostersResult.data ?? []);

      setOwned(
        Object.fromEntries(
          (ownedResult.data ?? []).map((item) => [
            item.booster_key,
            item.quantity,
          ])
        )
      );
    } catch (error) {
      setBuyError(
        error.message || "Unable to load your profile details."
      );
    } finally {
      setLoadingExtras(false);
    }
  }, [user]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  async function handleBuy(booster) {
    if (buying) return;

    setBuying(booster.key);
    setBuyError("");
    setBuySuccess("");

    try {
      await purchaseBooster({
        boosterKey: booster.key,
        quantity: 1,
      });

      await Promise.all([
        refreshProfile(),
        loadExtras(),
      ]);

      setBuySuccess(
        `${booster.name} purchased successfully!`
      );
    } catch (error) {
      setBuyError(
        error.message || "Unable to purchase booster."
      );
    } finally {
      setBuying(null);
    }
  }

  if (authLoading) return null;

  if (!user) {
    return <Navigate to="/account" replace />;
  }

  const xpIntoLevel = profile ? profile.xp % 100 : 0;
  const coins = profile?.coins ?? 0;

  return (
    <div className="p-[5%] flex flex-col relative w-full items-center min-h-screen">
      <nav className="fixed top-0 w-full flex justify-between p-[5%] z-10">
        <BackButton />

        <button
          type="button"
          onClick={signOut}
          className="bg-[#ffffff10] hover:bg-[#ffffff40] duration-300 text-white px-4 h-[48px] border rounded-full"
        >
          Sign out
        </button>
      </nav>

      <div className="flex flex-col items-center gap-8 lg:gap-12 w-full md:max-w-[70%] xl:max-w-[55%] text-white mt-20">
        <section className="w-full text-center space-y-3">
          <h1 className="pri-font text-2xl lg:text-4xl">
            {profile?.username}
          </h1>

          <p className="text-lg">
            Level {profile?.level ?? 1}
          </p>

          <p className="text-xl font-bold text-yellow-300">
            🪙 {coins} Coins
          </p>

          <div className="w-full h-3 bg-[#ffffff20] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D30CBD]"
              style={{ width: `${xpIntoLevel}%` }}
            />
          </div>

          <p className="text-xs text-[#ffffffa0]">
            {xpIntoLevel} / 100 XP to next level
          </p>
        </section>

        <section className="w-full grid grid-cols-3 gap-4 text-center">
          <div className="bg-[#ffffff10] border rounded-lg p-4">
            <p className="text-2xl font-bold">
              {profile?.games_played ?? 0}
            </p>
            <p className="text-xs text-[#ffffffa0]">
              Games played
            </p>
          </div>

          <div className="bg-[#ffffff10] border rounded-lg p-4">
            <p className="text-2xl font-bold">
              {profile?.games_won ?? 0}
            </p>
            <p className="text-xs text-[#ffffffa0]">
              Games won
            </p>
          </div>

          <div className="bg-[#ffffff10] border rounded-lg p-4">
            <p className="text-2xl font-bold">
              {profile?.best_turn_score ?? 0}
            </p>
            <p className="text-xs text-[#ffffffa0]">
              Best turn score
            </p>
          </div>
        </section>

        <section className="w-full space-y-4">
          <div className="flex justify-between items-center gap-3">
            <h2 className="pri-font text-xl lg:text-2xl">
              Booster Shop
            </h2>

            <span className="text-yellow-300 font-bold">
              🪙 {coins}
            </span>
          </div>

          <p className="text-sm text-white/70">
            Boosters purchased during an active game will be available in your next game.
          </p>

          {buyError && (
            <p role="alert" className="text-red-300 text-sm">
              {buyError}
            </p>
          )}

          {buySuccess && (
            <p role="status" className="text-green-300 text-sm">
              {buySuccess}
            </p>
          )}

          {loadingExtras ? (
            <p className="text-white/70">
              Loading boosters...
            </p>
          ) : (
            <div className="grid grid-cols-fluid gap-4">
              {boosters.map((booster) => {
                const icon =
                  BOOSTER_ICONS[booster.key] ?? "🎁";

                const quantity = owned[booster.key] ?? 0;
                const canAfford =
                  coins >= booster.cost_coins;

                return (
                  <div
                    key={booster.key}
                    className="bg-[#ffffff10] border border-white/30 rounded-xl p-5 space-y-3 text-center flex flex-col items-center"
                  >
                    <div className="w-20 h-20 flex items-center justify-center rounded-xl bg-white/10">
                      <span
                        className="text-5xl font-bold"
                        aria-hidden="true"
                      >
                        {icon}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg">
                      {booster.name}
                    </h3>

                    <p className="text-sm text-[#ffffffa0] flex-1">
                      {booster.description}
                    </p>

                    <p className="text-sm">
                      Owned:{" "}
                      <strong>{quantity}</strong>
                    </p>

                    <p className="font-bold text-yellow-300">
                      🪙 {booster.cost_coins} Coins
                    </p>

                    <button
                      type="button"
                      onClick={() => handleBuy(booster)}
                      disabled={
                        Boolean(buying) || !canAfford
                      }
                      className="sec-font rounded-lg px-4 py-3 bg-[#D30CBD] font-bold duration-300 disabled:opacity-40 w-full"
                    >
                      {buying === booster.key
                        ? "Purchasing..."
                        : canAfford
                          ? "Buy Booster"
                          : "Not Enough Coins"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="w-full space-y-4">
          <h2 className="pri-font text-xl lg:text-2xl">
            Achievements
          </h2>

          <div className="grid grid-cols-fluid gap-4">
            {achievements.map((achievement) => {
              const unlocked = unlockedKeys.has(
                achievement.key
              );

              return (
                <div
                  key={achievement.key}
                  className={`border rounded-lg p-4 space-y-2 ${
                    unlocked
                      ? "bg-[#D30CBD30]"
                      : "bg-[#ffffff10] opacity-60"
                  }`}
                >
                  <p className="font-bold">
                    {unlocked ? "✓ " : "🔒 "}
                    {achievement.name}
                  </p>

                  <p className="text-sm text-[#ffffffa0]">
                    {achievement.description}
                  </p>

                  {achievement.coin_reward > 0 && (
                    <p className="text-xs text-yellow-300">
                      Reward: 🪙{" "}
                      {achievement.coin_reward} Coins
                    </p>
                  )}

                  <p className="text-xs">
                    {unlocked ? "Unlocked" : "Locked"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
