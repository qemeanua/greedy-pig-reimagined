import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "src/components/BackButton";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";

export default function Account() {
  const { signUp, signIn } = useGreedyPigContext();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, username);
      } else {
        await signIn(email, password);
      }
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-[5%] flex flex-col relative w-full items-center min-h-screen">
      <nav className="fixed top-0 w-full p-[5%]">
        <BackButton />
      </nav>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm mt-24 text-white"
      >
        <h1 className="pri-font text-2xl lg:text-4xl text-center mb-4">
          {mode === "signup" ? "Create Account" : "Sign In"}
        </h1>

        {mode === "signup" && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            maxLength={24}
            className="p-3 bg-[#ffffff10] border rounded-md"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-3 bg-[#ffffff10] border rounded-md"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="p-3 bg-[#ffffff10] border rounded-md"
        />

        {error && <p className="text-[#ff6b6b] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="sec-font text-lg rounded px-8 py-3 bg-[#D30CBD] font-bold duration-300 disabled:opacity-50"
        >
          {submitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="text-sm text-[#ffffffa0] underline"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}
