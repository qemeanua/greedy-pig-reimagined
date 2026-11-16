import React from "react";
import logo from "../assets/pig-0.png";
import { Link } from "react-router-dom";
import HomeButton from "./HomeButton";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 w-full flex justify-between py-3 px-4 md:px-[2%] text-white border-b border-b-[#ffffff40] backdrop-blur items-center">
      <div className="flex items-center gap-2">
        <img src={logo} alt="Greedy Pig logo" width={55} />

        <h1 className="pri-font text-lg sm:text-xl md:text-2xl">
          Greedy Pig
        </h1>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <HomeButton />

        <Link
          to="/profile/"
          className="text-white hover:underline duration-300 font-bold"
        >
          Profile
        </Link>

        <Link
          to="/live-game/how-to-play/"
          className="text-white hover:underline duration-300 font-bold hidden md:flex"
        >
          How To Play
        </Link>
      </div>
    </nav>
  );
}