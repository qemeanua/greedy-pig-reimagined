# Greedy Pig Reimagined

CSC 419 — Advances in Web, Mobile and Blockchain Development, Pan-Atlantic University.

**Team**
- Queen-Esther Emeanua — 23120112016
- Tobenna Dike — 23120112014

**Live app:** TBD
**Base game this builds on:** https://github.com/Hemephelus/greed_pig

## The three improvements

1. **Boosters & Power-ups** (Gameplay/Rules) — Score Shield, Lucky Reroll, and Double Points give players limited ways to manage the risk of rolling a 1.
2. **Keyboard controls & in-game help** (Accessibility) — the game is fully playable without a mouse, and rules/booster info are reachable from a help panel mid-game, not just before it.
3. **Player progression** (Progression) — accounts, XP and levels, coins, achievements, and a booster shop that persist between sessions.

## How it works

The original game is local/pass-and-play with no backend — rolls and scoring happen entirely in the browser. That's still how **Quick Play** works here: no login, nothing to lose, same as before.

Signing in unlocks **Tracked Play**, where boosters, XP, coins, and achievements are at stake — so for that mode, the dice roll, booster effects, and score updates are computed by a Postgres-backed Supabase Edge Function, not the browser. The client sends a roll/bank/purchase request; the server generates the result and is the only thing allowed to update scores, coins, or inventory. That's what stops a player from editing client state to fake a win or free boosters.

## Tech stack

- React 18 + Vite + Tailwind CSS (frontend)
- Supabase: Postgres (data), Auth (accounts), Edge Functions (server-side game logic)

## Running locally

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

### Backend (Supabase)

The schema and Edge Functions live in `supabase/`. To stand up your own instance:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
npx supabase functions deploy start-game roll-dice bank-score purchase-booster
```
