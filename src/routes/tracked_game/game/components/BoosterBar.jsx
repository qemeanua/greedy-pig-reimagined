
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
        <div className="flex gap-3 justify-center flex-wrap">
            {BOOSTERS.map((booster) => {
                const owned = inventory[booster.inventoryKey] ?? 0;
                const active = value[booster.stateKey];

                return (
                    <button
                        key={booster.stateKey}
                        type="button"
                        disabled={owned === 0}
                        onClick={() => toggle(booster.stateKey)}
                        aria-pressed={active}
                        className={`px-4 py-2 rounded-lg border text-sm font-bold duration-300 disabled:opacity-30 ${active
                                ? "bg-[#D30CBD] border-[#D30CBD]"
                                : "bg-[#ffffff10] border-[#ffffff40]"
                            }`}
                    >
                        {booster.label} ({owned})
                        {active ? " ✓" : ""}
                    </button>
                );
            })}
        </div>
    );
}
