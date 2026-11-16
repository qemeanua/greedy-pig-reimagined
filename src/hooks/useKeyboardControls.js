import { useEffect } from "react";

export function useKeyboardControls({
  onRoll,
  onBank,
  onToggleHelp,
  enabled,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (!enabled || event.repeat) return;

      const target = event.target;
      const tag = target?.tagName;

      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(tag) ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        onRoll?.();
        return;
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        onBank?.();
        return;
      }

      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        onToggleHelp?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onRoll, onBank, onToggleHelp]);
}