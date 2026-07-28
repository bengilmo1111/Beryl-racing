# Gilmore Games factory — plan of record

This document is the durable context for the game-factory work. Read it before starting any phase. It outlines principles, phases, and settled decisions. The per-phase brief alongside it holds the actionable spec for whichever phase is current.

Reference implementation: `bengilmo1111/Beryl-racing` (Phaser 3 + Vite, Vercel, deployed under `gilmore.games/beryl-racing/`).

---

## Principles

**1. The contracts are the product.**
Everything durable in this system is a small machine-readable file that different agents read and write without talking to each other. Agents, models and orchestrators are replaceable and will be replaced. The contracts persist, get version numbers, and are what makes the process repeatable.

The test for any proposed addition: is this a contract, or is it orchestration? Contracts go in the factory and get versioned. Orchestration stays thin and disposable.

**2. The factory is extracted, never designed.**
A pattern proves itself in a real game, then holds in a second, and only then gets promoted into the shared kit. Building templates before there is evidence means versioning guesses. Beryl is the reference implementation; things arrive in the factory by being lifted out of a game that already shipped.

**3. Two different questions, kept apart.**

| Question | Method | Speed | Authority |
|---|---|---|---|
| Did this regress? | Deterministic sim + scripted journeys | Every push, seconds | Gates merges |
| Is this any good to play? | Evaluative agent playing the build | Occasional, slow | Advisory only |

Conflating them produces either a flaky quality judge that blocks merges, or a regression suite that passes a joyless game. No LLM-produced score ever gates a merge.

---

## The contracts

Four files, each with a `schemaVersion`. These are the seams between lanes.

- **World data** — real routes, landmarks, recognition features, what must be accurate and what may be simplified, collision flags, source and attribution notes. Consumed by the code lane, the art lane *and* research. For games built on real places this is the highest-leverage artifact in the repo; it currently exists only in conversation history.
- **Asset manifest** — one record per asset slot: id, kind, dimensions, camera, required features (derived from world data), what procedural element it replaces, and a status running `requested → generating → preview-ready → approved → processing → integration-ready → integrated → verified-in-game`. A file existing is never "done". The terminal state is verified in the running game at target mobile size.
- **Playtest thresholds** — per-course pass/fail criteria for the deterministic layer. Data, not code, so tuning is a one-line reviewable change.
- **Game config** — framework, deployment base path, viewport targets, control schemes, genre. What agents read instead of rediscovering project conventions every session.

---

## Phases

### Phase 1 — Make the game inspectable
Deterministic harness, bot drivers, scripted journey scenarios, metrics report, thresholds, CI wiring. Determinism is the gate: same course, same seed, same inputs must give an identical result.

**Milestone:** every PR gets a red/green check trustworthy enough to act on, proven by fault injection.

### Phase 2 — Close the loop
Scheduled workflow reads the failing report, one agent opens one PR fixing one thing, the report re-runs against the preview, a human merges. Cost logged per run. Preview link pushed to chat so it finds you rather than the reverse.

**Milestone:** an agent finds a real problem, another fixes it, and the system proves the fix without breaking anything else.

### Phase 3 — Contracts and lanes
World data first. Then the asset manifest with the full state machine, producer and integrator as separate agents, and provider adapters so image and music vendors stay swappable — OpenRouter's unified image/audio catalogue is the natural place to try candidates cheaply, but note most of that catalogue is proprietary vendor models (Nano Banana, Seedream, Lyria) reached through one gateway, not open-weight; the win is one key and a swappable string, not licensing. Add the evaluative playtester, scoped to the shell — start flow, controls, course select, finish screen. A GUI agent will not drive a racing line; published per-genre results are clear that real-time control is where these agents are weakest. This lane is also where trying a genuinely open model (e.g. Kimi) is worth doing — advisory-only output tolerates being wrong occasionally, unlike the fix loop.

### Phase 4 — Extract the factory
With two or three games' worth of evidence, lift templates, agent profiles, workflows, schemas and the accumulated fix protocol into a separate versioned repo. Games pin a factory version. Read OpenGame's "Game Skill" (Apache-2.0, `leigest519/OpenGame`) before designing the layout — its split between a template library and a living protocol of verified fixes is likely better than anything invented cold.

A control-plane app comes after that, if still needed.

---

## Decisions ledger

Settled. Revisit deliberately, not by drift.

- **Billing:** OpenRouter as the single gateway and bill for all model calls — coding, and later image/audio experimentation — rather than separate Anthropic, OpenAI and Gemini accounts. Set the spend limit as an OpenRouter account-level credit cap, not a Console limit; the subscription Agent SDK credit was announced and then paused, so do not plan around it either way.
- **Credential:** three env vars set together and referenced in exactly one place in the workflow — `ANTHROPIC_BASE_URL=https://openrouter.ai/api`, `ANTHROPIC_AUTH_TOKEN=<openrouter key>`, `ANTHROPIC_API_KEY=` (blank, so Claude Code doesn't fall back to direct Anthropic auth). Switching provider or reverting to a direct Anthropic key is still a one-block change.
- **Model pinning:** the fix-loop's coding backend stays a Claude model (Sonnet), routed through OpenRouter, not swapped for an open model. Agentic tool-use reliability is the thing that degrades first when the backbone model changes under a harness built around Claude's tool-calling — this is not the place to chase the cheapest token price.
- **Cost monitoring:** OpenRouter's Activity dashboard, not Anthropic Console. Note protocol coverage isn't guaranteed identical to calling Anthropic directly — cache_control and fine-grained tool streaming may behave differently through the gateway — so early runs may cost somewhat more than the direct-API estimate until observed.
- **Orchestration:** GitHub Actions only. No second orchestration engine, no separate database holding a second copy of the work graph.
- **Gates:** deterministic thresholds gate merges. Evaluative output is advisory and appears as a PR comment.
- **Roster:** four agent roles — code, research, asset producer, asset integrator. Add a role when a real collision happens, not in anticipation.
- **Promotion:** a pattern must hold in two games before entering the factory.
- **Public repo hygiene:** triggers stay on `pull_request` and `schedule`. Never `pull_request_target`.
- **Open question:** GitHub's custom agent profiles (`.github/agents/*.agent.md`) are real and work from GitHub Mobile, but belong to Copilot and need a paid Copilot plan. Adopting them is a third subscription — decide deliberately.

---

## Keeping this current

Anything that changes the plan gets edited here in the same PR that changes the code, with a dated line. The retro at the end of each game asks two fixed questions:

1. What did we hand-patch in this game that should have come from the factory?
2. Has the billing, auth, or agent-platform landscape moved since the last game?

The second question exists because that area moves faster than memory of it does.
