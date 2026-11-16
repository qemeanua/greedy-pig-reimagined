export default function HelpPanel({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracked-game-help-title"
        className="bg-[#111111] border border-[#ffffff40] rounded-xl p-6 max-w-md w-full space-y-5 text-white max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="tracked-game-help-title"
          className="pri-font text-2xl"
        >
          How to Play
        </h2>

        <div className="space-y-2">
          <h3 className="font-bold text-[#D30CBD]">Game Rules</h3>

          <ul className="list-disc pl-5 space-y-2 text-sm text-[#ffffffc0]">
            <li>Roll the dice to build your turn score.</li>
            <li>Keep rolling to increase your score.</li>
            <li>Roll a 1 and you lose your turn score unless a booster protects you.</li>
            <li>Bank your points to add them to your total score.</li>
            <li>The first player to reach the target score wins.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-[#D30CBD]">Boosters</h3>

          <ul className="list-disc pl-5 space-y-2 text-sm text-[#ffffffc0]">
            <li>
              <b>Score Shield:</b> protects your accumulated turn score if you roll a 1.
            </li>
            <li>
              <b>Lucky Reroll:</b> gives you another roll if your first roll is a 1.
            </li>
            <li>
              <b>Double Points:</b> doubles the points from your next successful roll.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-[#D30CBD]">Keyboard Controls</h3>

          <ul className="list-disc pl-5 space-y-2 text-sm text-[#ffffffc0]">
            <li><b>Space / Enter:</b> Roll dice</li>
            <li><b>B:</b> Bank points</li>
            <li><b>H:</b> Open or close help</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="sec-font rounded-lg px-6 py-3 bg-[#D30CBD] font-bold transition duration-300 hover:scale-95 w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
}