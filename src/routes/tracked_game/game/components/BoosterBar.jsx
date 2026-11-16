
const BOOSTERS = [
  {
    stateKey: "scoreShield",
    inventoryKey: "score_shield",
    label: "Score Shield",
    symbol: "🛡️",
    description: "Protect your turn points if you roll a 1",
  },
  {
    stateKey: "luckyReroll",
    inventoryKey: "lucky_reroll",
    label: "Lucky Reroll",
    symbol: "🍀",
    description: "Get one more chance after rolling a 1",
  },
  {
    stateKey: "doublePoints",
    inventoryKey: "double_points",
    label: "Double Points",
    symbol: "×2",
    description: "Double points from a successful roll",
  },
];

function getQuantity(inventory, key) {
  const quantity = Number(inventory?.[key] ?? 0);

  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.max(0, Math.floor(quantity));
}

export default function BoosterBar({
  player,
  value = {},
  onChange,
  disabled = false,
}) {
  const inventory = player?.active_boosters ?? {};

  function toggle(stateKey, owned) {
    if (disabled || owned <= 0 || !onChange) {
      return;
    }

    const nextValue = {
      scoreShield: Boolean(value.scoreShield),
      luckyReroll: Boolean(value.luckyReroll),
      doublePoints: Boolean(value.doublePoints),
    };

    nextValue[stateKey] = !nextValue[stateKey];

    // Reroll takes priority over Shield on a roll of 1.
    // Don't allow both to be selected simultaneously.
    if (
      stateKey === "scoreShield" &&
      nextValue.scoreShield
    ) {
      nextValue.luckyReroll = false;
    }

    if (
      stateKey === "luckyReroll" &&
      nextValue.luckyReroll
    ) {
      nextValue.scoreShield = false;
    }

    onChange(nextValue);
  }

  return (
    <section className="w-full space-y-3">
      <h2 className="text-center pri-font text-lg">
        Your Boosters
      </h2>

      <div className="grid grid-cols-3 gap-2">
        {BOOSTERS.map((booster) => {
          const owned = getQuantity(
            inventory,
            booster.inventoryKey
          );

          const active =
            owned > 0 &&
            Boolean(value[booster.stateKey]);

          const unavailable = disabled || owned <= 0;

          return (
            <button
              key={`${player?.id ?? player?.player_index ?? "player"}-${booster.stateKey}`}
              type="button"
              disabled={unavailable}
              onClick={() =>
                toggle(booster.stateKey, owned)
              }
              aria-pressed={active}
              aria-label={`${booster.label}, ${owned} available${active ? ", selected" : ""}`}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? "bg-[#D30CBD30] border-[#D30CBD]"
                  : "bg-[#ffffff10] border-[#ffffff40] hover:bg-[#ffffff20]"
              }`}
            >
              <span
                className="text-4xl font-bold leading-none"
                aria-hidden="true"
              >
                {booster.symbol}
              </span>

              <span className="font-bold text-sm text-center">
                {booster.label}
              </span>

              <span className="text-xs text-[#ffffff90] text-center">
                {booster.description}
              </span>

              <span className="text-xs font-semibold">
                Available: {owned}
              </span>

              {active && (
                <span className="text-xs text-[#F08BE8] font-bold">
                  Selected ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-[#ffffff70]">
        Selecting a booster does not consume it.
        It is used only when its effect activates.
      </p>
    </section>
  );
}
