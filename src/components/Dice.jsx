
import { useEffect, useState } from "react";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import diceRollSound from "src/sound_effect/dice_roll.mp3";
import useAudio from "src/hooks/useAudio";

export function Dice({
  getFinalDiceValue,
  setIsRolling,
  isRolling,
  setChangeBackground,
}) {
  const { preloadSrcList } = useGreedyPigContext();

  const [currentDice, setCurrentDice] = useState(0);

  const die = preloadSrcList.filter((dice) =>
    dice.includes("dice")
  );

  const diceRollAudio = useAudio(diceRollSound);

  const handleDiceClick = () => {
    if (isRolling) return;

    if (diceRollAudio) {
      diceRollAudio.pause();
      diceRollAudio.currentTime = 0;
      diceRollAudio.play().catch(() => {});
    }

    setIsRolling(true);
    setChangeBackground(true);
  };

  useEffect(() => {
    if (!isRolling) return;

    let endRoll = 0;
    let diceValue = 0;

    const interval = setInterval(() => {
      if (endRoll < 30) {
        diceValue = Math.floor(Math.random() * 6);
        setCurrentDice(diceValue);
        endRoll++;
      } else {
        clearInterval(interval);

        getFinalDiceValue(diceValue + 1);
        setIsRolling(false);
        setChangeBackground(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRolling]);

  return (
    <button
      className="hover:scale-105 active:scale-100 duration-300 md:w-auto w-[200px]"
      onClick={handleDiceClick}
      disabled={isRolling}
      type="button"
      aria-label="Roll dice"
    >
      {die.map((dice, index) => (
        <img
          key={index}
          src={dice}
          alt={`Dice showing ${index + 1}`}
          className={currentDice === index ? "" : "hidden"}
        />
      ))}
    </button>
  );
}
