import React from "react";
import logo from "../assets/pig-0.png";
import { Link } from "react-router-dom";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";

export default function Home() {
  const { user, profile } = useGreedyPigContext();

  return (
    <section className=" w-full h-screen flex flex-col justify-center items-center">
      <figure>
        <img src={logo} alt="" width={400} />
      </figure>
      <div className="flex flex-col gap-8 text-[#F9F7E8] text-center">
        <h1 className="pri-font text-3xl sm:text-5xl lg:text-6xl ">
          Greedy Pig
        </h1>
        <div className="flex gap-4 flex-col">
          <Link
            to={`/live-game/setup`}
            className=" sec-font text-xl rounded px-8 py-4 bg-[#d30cbcc0] font-bold duration-500 skew-x-6 hover:bg-[#d30cbc] hover:skew-x-0 hover:scale-95 "
          >
            Quick Play
          </Link>
          <Link
            to={user ? `/tracked-game/setup` : `/account`}
            className=" sec-font text-xl rounded px-8 py-4 bg-[#d30cbcc0] font-bold duration-500 -skew-x-6 hover:bg-[#d30cbc] hover:skew-x-0 hover:scale-95  "
          >
            Tracked Play (boosters &amp; progress)
          </Link>
        </div>
        <Link to={user ? "/profile" : "/account"} className="text-sm underline text-[#ffffffa0]">
          {user ? `${profile?.username ?? "Profile"} — Level ${profile?.level ?? 1}` : "Sign in"}
        </Link>
      </div>
    </section>
  );
}
