
import { useEffect } from "react";

export function useKeyboardControls({
    onRoll,
    onBank,
    onToggleHelp,
    enabled,
}) {
    useEffect(() => {
        function handleKeyDown(e) {
            console.log("Keyboard detected:", e.key, "Enabled:", enabled);

            if (!enabled || e.repeat) return;

            const tag = e.target?.tagName;

            if (
                ["INPUT", "TEXTAREA", "SELECT"].includes(tag) ||
                e.target?.isContentEditable
            ) {
                return;
            }

            if (e.code === "Space" || e.code === "Enter") {
                e.preventDefault();
                onRoll?.();
            } else if (e.key.toLowerCase() === "b") {
                onBank?.();
            } else if (e.key.toLowerCase() === "h") {
                onToggleHelp?.();
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        console.log("Keyboard controls attached");

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [enabled, onRoll, onBank, onToggleHelp]);
}
