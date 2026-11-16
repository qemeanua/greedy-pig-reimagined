const BOOSTERS = [
  {
    stateKey: "scoreShield",
    inventoryKey: "score_shield",
    label: "Score Shield",
  },
  {
    stateKey: "luckyReroll",
    inventoryKey: "lucky_reroll",
    label: "Lucky Reroll",
  },
  {
    stateKey: "doublePoints",
    inventoryKey: "double_points",
    label: "Double Points",
  },
];

export default function BoosterBar({ player, value, onChange }) {
  const inventory = player?.active_boosters ?? {};

  function toggle(stateKey) {
    onChange({
      ...value,
      [stateKey]: !value[stateKey],
    });
  }

  return (
    <section className="w-full space-y-3">
      <h2 className="text-center pri-font text-lg">Your Boosters</h2>

      <div className="flex gap-3 justify-center flex-wrap">
        {BOOSTERS.map((booster) => {
          const owned = inventory[booster.inventoryKey] ?? 0;
          const active = Boolean(value[booster.stateKey]);

          return (
            <button
              key={booster.stateKey}
              type="button"
              disabled={owned <= 0}
              onClick={() => toggle(booster.stateKey)}
              aria-pressed={active}
              className={`px-4 py-3 rounded-lg border text-sm font-bold transition duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${
                active
                  ? "bg-[#D30CBD] border-[#D30CBD]"
                  : "bg-[#ffffff10] border-[#ffffff40] hover:bg-[#ffffff20]"
              }`}
            >
              {booster.label}
              <span className="block text-xs mt-1">
                Owned: {owned}
              </span>
              {active && <span className="block mt-1">Selected ✓</span>}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-[#ffffff70]">
        Selected boosters are used when you roll.
      </p>
    </section>
  );
}