import { Link } from "react-router-dom";

export default function HomeButton() {
  return (
    <Link
      to="/"
      className="inline-flex items-center justify-center rounded-lg border border-[#ffffff40] bg-[#ffffff10] px-5 py-2 text-white font-bold transition duration-300 hover:bg-[#D30CBD] hover:border-[#D30CBD]"
    >
      Home
    </Link>
  );
}