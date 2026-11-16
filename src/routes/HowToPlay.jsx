import React from "react";
import logo from "src/assets/pig-0.png";
import { AiFillHome } from "react-icons/ai";
import { Link } from "react-router-dom";
import BackButton from "src/components/BackButton";

export default function HowToPlay() {
  return (
    <div className="p-[5%] flex flex-col relative w-full items-center">
      <nav className="fixed top-0 w-full flex justify-between p-[5%] z-10">
        <BackButton />

        <Link
          to="/"
          aria-label="Home"
          className="bg-[#D30CBD80] hover:bg-[#D30CBD] duration-300 text-white w-[48px] h-[48px] border rounded-full flex items-center justify-around"
        >
          <AiFillHome size={24} />
        </Link>
      </nav>

      <div className="flex flex-col items-center gap-6 lg:gap-12 md:max-w-[70%] xl:max-w-[55%]">
        <figure>
          <img src={logo} alt="Greedy Pig logo" width={400} />
        </figure>

        <section className="text-white space-y-4 w-full">
          <h1 className="pri-font text-2xl lg:text-4xl">
            GAME SETUP
          </h1>

          <section className="bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Enter the maximum total points you want to reach.</li>
              <li>Enter the number of players.</li>
              <li>Enter the player names.</li>
              <li>Click the Play button.</li>
            </ol>
          </section>
        </section>

        <section className="text-white space-y-4 w-full">
          <h1 className="pri-font text-2xl lg:text-4xl">
            GREEDY PIG RULES
          </h1>

          {[
            "Each turn, a player repeatedly rolls a die until either a 1 is rolled or the player decides to pass.",
            "If the player rolls a 1, they score nothing for that turn and it becomes the next player's turn.",
            "If the player rolls any other number, it is added to their turn total and the player's turn continues.",
            "The first player to reach the target score wins.",
          ].map((rule, index) => (
            <section
              key={index}
              className="bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg flex flex-col items-center text-center gap-2"
            >
              <h4 className="text-lg lg:text-2xl font-bold">
                {index + 1}.
              </h4>

              <p>{rule}</p>
            </section>
          ))}
        </section>

        <section className="text-white space-y-4 w-full">
          <h1 className="pri-font text-2xl lg:text-4xl">
            About the Devs
          </h1>

          <section className="bg-[#ffffff10] px-8 lg:px-12 py-6 border text-base lg:text-xl rounded-lg">
            <ul className="list-disc pl-5 space-y-4">
              <li>
                My name is Nwachukwu. I am a front-end developer.
              </li>

              <li>
                This is my{" "}
                <a
                  href="https://sites.google.com/view/nwachukwuujubuonu/home"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#D30CBD] font-bold"
                >
                  portfolio site
                </a>{" "}
                if you would like to see some of my other work.
              </li>

              <li>This project was built with React and Vite.</li>

              <li>
                I didn't work alone. This project was designed by{" "}
                <b>Oluwatomisin Rhema Eghosa Odukoya</b> and{" "}
                <b>Alozie Blessed Chuebuka</b>.
              </li>
            </ul>
          </section>
        </section>
      </div>
    </div>
  );
}