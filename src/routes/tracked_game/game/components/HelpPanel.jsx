
export default function HelpPanel({ open, onClose }) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-[5%]"
            onClick={onClose}
        >
            <div
                className="bg-[#111111] border border-[#ffffff40] rounded-lg p-6 max-w-md w-full space-y-4 text-white max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="pri-font text-xl">How to Play</h2>

                <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Roll repeatedly to build your turn score.</li>
                    <li>Roll a 1 and you lose your turn score unless a booster saves you.</li>
                    <li>Bank to lock your turn score into your total.</li>
                    <li>First to the target score wins.</li>
                </ul>

                <h3 className="pri-font text-lg">Boosters</h3>

                <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><b>Score Shield</b> — protects your turn score.</li>
                    <li><b>Lucky Reroll</b> — rerolls instead of busting on a 1.</li>
                    <li><b>Double Points</b> — doubles your next successful roll.</li>
                </ul>

                <h3 className="pri-font text-lg">Keyboard shortcuts</h3>

                <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><b>Space / Enter</b> — Roll</li>
                    <li><b>B</b> — Bank</li>
                    <li><b>H</b> — Toggle help</li>
                </ul>

                <button
                    onClick={onClose}
                    className="sec-font rounded px-6 py-2 bg-[#D30CBD] font-bold duration-300 w-full"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
