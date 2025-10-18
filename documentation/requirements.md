# Conscious Campus — Hackathon Requirements Document (v1.0)

**Hackathon:** Cursor IDE (24 hours)

**Core Pitch (1‑liner):** _Observer‑dependent, real‑time “Conscious Campus” where emotionally‑motivated agents form relationships and culture while the universe only runs when someone is watching._

---

## 1 - What (Product Overview)

### 1.1 Concept

A 2D top‑down campus simulation rendered in **Pixi React**. The world clock advances only when ≥1 viewer is present (observer‑dependent time). Agents are emotionally intelligent (valence/arousal), goal‑driven (behavioral motivations), and socially aware (relationships). Emergent moments are narrated by an in‑world **Observer/World Historian**.

### 1.2 “Wow” Moments for Judges

- **Observer turns on universe:** World is frozen → viewer arrives → clock starts → agents resume mid‑step and complete atomic actions, then continue.
- **Emergent decision swing:** Agent abandons plan (e.g., heading to dorm) upon recalling test → diverts to library; we show internal thought + emotion spike.
- **Social culture beats:** Friend invites; an agent weighs fatigue vs FOMO → goes to café; sidebar feed logs gossip (“Charlie ignores text; keeps doomscrolling”).

### 1.3 MVP Scope (24h)

- Map with **Dorm, Lecture Hall, Café, Library, Quad** (minimal interactive geometry, collision tiles, entrances/exits).
- **40–60 agents** (seeded bios; scalable to 180 with batching).
- Emotional state (valence, arousal), goals, simple needs (sleep, study, social).
- **Observer‑dependent clock** + admin kill switch.
- Sidebar of agents with live status; click to focus/follow; speech/inner‑monologue bubbles.
- Pathfinding (A\* on grid), basic collision avoidance.
- LLM routing: low‑latency microdecisions vs periodic deeper deliberation.
- Replayable event log, time‑boxed world narrative.

### 1.4 Stretch (time‑permitting)

- Gemini‑generated photoreal **face avatars** in the sidebar.
- Dynamic events by **“Super‑narrator agents”** (e.g., OrientationLeader Dave: “Pop‑up study group @ Library”).
- Ambient sound / TTS moments.
- Zoom/pan camera automation (“follow most interesting agent”).

---

## 2 - Why (Goals & Differentiation)

- **Research thesis:** _Consciousness (self/other modeling) → culture_. By making agents aware of self/others with simple continuous emotions + memories, emergent campus culture surfaces.
- **Twist:** _Universe runs only under observation._ Paused computation is legible via a Convex flag; live queries prove halting/resuming.
- **Judging fit:**

  - Groq: low‑latency inference at decision points.
  - Convex: real‑time live sync of a mutable simulation state.
  - OpenAI/Anthropic: deeper planning & memory summarization.

- **Replicability:** Agent scaffolds are templated; seeding dozens of agents becomes cheap and scalable.

---

## 3 - How (Architecture & Implementation)

### 3.1 System Diagram (Textual)

**Client (Next.js + Pixi React)** ↔ **Convex (DB + actions + schedulers)** ↔ **LLM Layer (Groq/OpenAI/Anthropic via server actions)**

- **Client:** Renders via live queries; runs path interpolation at 60 FPS; sends observer heartbeats; issues user interactions.
- **Server (Convex):** Authoritative state transitions; tick orchestration; memory updates; _perception sweeps_; relationship deltas; logging; rate‑limit guard; kill switch gate.
- **LLM Router:**

  - **Groq**: fast classify/intent/next‑action with structured output.
  - **OpenAI/Anthropic**: periodic reflective planning & memory consolidation.

### 3.2 Observer‑Dependent Time

- **Heartbeat:** Each browser tab emits `observerHeartbeat(observerId)` every 5s.
- **World Mode:** Convex singleton `world_settings` holds `isRunning` boolean and `observerCount`.
- **Transition rules:**

  - `observerCount` rising from 0 → 1: set `isRunning=true`, schedule ticks.
  - falling to 0: set `isRunning=false` _after_ agents finish current atomic step; cancel scheduled ticks.

- **UI:** Banner “World Frozen” vs live clock; show # observers.

### 3.3 Simulation Loop (Authoritative on Server)

- **Tick cadence:** 2 Hz (every 500ms) physics/position updates; **LLM cadence:** per‑agent **activity boundaries** (not per second).
- **Atomic step:** Complete current activity segment (e.g., reach next waypoint, finish 10‑sec “chat”).
- **Batching:** Compute for agents whose `nextDecisionAt <= now` only.
- **Locomotion:** Pathfinding and interpolation are **non‑LLM**; LLM decides _what_ to do next and _where_ to go; motion is handled deterministically.

### 3.4 Agent Activity FSM

States: `Idle`, `Transit`, `AtLocation(activityType)`, `Interact(targetId)`, `Reflect`, `Sleep`.

- **State entry:** Set `nextDecisionAt = now + durationEstimate`.
- **Transitions:** Triggered when `now >= nextDecisionAt` or by event (invite, urgent need spike).
- **LLM calls:** Only on transitions requiring cognition (e.g., pick destination, accept invite, reprioritize goals).

### 3.5 Emotion, Needs & Biological Homeostasis

- **Emotions:** Continuous `valence [-1..1]`, `arousal [0..1]`.
- **Needs:** `sleepiness`, `studyPressure`, `hunger`, `socialDrive` (0..1), with decay/accumulation per tick.
- **Biological homeostasis (engineering spec):**

  - Each agent has a **fullness meter** `biostate.fullness ∈ [0,1]` with a **homeostatic baseline** `biostate.fullnessBaseline = 0.3`.
  - Discrete update (run each physics tick with Δt seconds; default Δt=0.5s):

    - `fullness_next = fullnessBaseline + (fullness_current - fullnessBaseline) * exp(-Δt / τ_fullness)` where `τ_fullness = 45*60` (45 real minutes).

  - After eating event with meal size `m ∈ (0,1]`: `fullness = clamp(fullness + m, 0, 1)`; typical meals: snack `m=0.2`, meal `m=0.6`.
  - Map to **hunger drive** used by decision policy: `needs.hunger = clamp(1 - fullness, 0, 1)`.
  - Optional extensions (kept off by default for hackathon): `hydration`, `bladder` with their own `τ` and baselines.

- **Decision policy:** Weighted utility e.g., `U = w1*studyPressure - w2*sleepiness - w3*needs.hunger + w4*socialDrive + noise(arousal)` as features to LLM; heuristic fallback uses thresholds.
- **Logging:** At each decision, snapshot emotions/needs/biostate for replay and analysis.

### 3.6 Memory & Relationships

- **Short‑term:** rolling window of last N observations (kept in agent doc, pruned).
- **Long‑term:** `memories` table with `(agentId, type, content, salience, timestamp, decayRate, embedding)`.
- **Decay:** Exponential: `effectiveSalience = salience * exp(-lambda * ageHours)`. Items under threshold are summarized & compacted.
- **Relationship graph:** `relationships` table with `(aId, bId, tie: {friendship, trust, attraction} 0..1, lastInteractionAt)`, adjusted by interactions and emotion contagion.

### 3.7 LLM Routing Strategy

- **Microdecisions (≤400ms target):** Groq models; tool‑free structured JSON choosing `{nextActivity, destinationPlaceId?, targetAgentId?, durationSecs, say?}`.
- **Periodic reflection (e.g., every 15–30 real mins or after salient events):** OpenAI/Anthropic to summarize past window → update long‑term memory & goal weights.
- **Fallbacks:** If LLM >2s or rate‑limited → heuristic policy picks next action; log “didn’t reply; kept scrolling” gag.

### 3.8 Pathfinding & Movement

- **Grid:** 32px tiles; campus ~ 80×50 tiles (≈ 2560×1600 px base).
- **Scale:** **1 tile ≈ 1 sim meter**. Human walking ≈ **1.5 m/s → 1.5 tiles/s → 48 px/s**; interpolate at 60 FPS.
- **A\*** via PathFinding.js; solid tiles for walls/buildings; dynamic occupancy for agents (soft avoidance by replan on blockage).

### 3.9 Rendering & UI (Shadcn + Pixi React)

- **Layout:** Left **Sidebar** (Agent list/cards, search, filters), Right **Canvas** (Pixi stage).
- **Agent card:** face avatar (photo‑real if ready), name, current activity, emotion mini‑meter, location.
- **On‑canvas:** Sprite + nameplate; speech/inner thought bubbles; click agent → follow camera + open “brain” panel.
- **Event feed:** Rolling ticker (“12:27 — Charlie ignores text; keeps doomscrolling”).
- **Zoom/pan:** Mouse/touch wheel zoom; pan drag; focus button to jump to highlights.

### 3.10 Interaction Hooks

- **Observer nudge:** Admin/Observer can inject a memory or event (“You got a call”) via sidebar action → adds salient memory, possibly interrupts current plan.
- **Universe toggle:** “Start/Freeze Universe” button (adminEnabled gate).

### 3.11 Data Model (Convex)

**Collections** (names singular for docs clarity):

- **world_settings** `{ id, isRunning: boolean, observerCount: number, adminEnabled: boolean, tickHz: number, createdAt, updatedAt }`
- **observer** `{ id, sessionId, lastHeartbeatAt, createdAt }`
- **place** `{ id, kind: 'dorm'|'lecture'|'cafe'|'library'|'quad'|string, name, tileRect: {x,y,w,h}, entrances: [{x,y}], capacity?: number }`
- **agent** `{ id, name, role: 'student'|'prof'|'barista'|string, avatarUrl?, pos: {x,y}, headingRad: number, fovDeg: number, visionRadiusM: number, path: [{x,y}], state: 'Idle'|'Transit'|'AtLocation'|'Interact'|'Reflect'|'Sleep', activity?: {type:string, placeId?, targetId?, startedAt, eta}, emotions: {valence:number, arousal:number}, needs: {sleepiness:number, hunger:number, studyPressure:number, socialDrive:number}, biostate: {fullness:number, fullnessBaseline:number}, coreTraits: {conscientiousness:number, extroversion:number, neuroticism:number}, goals: [{name, weight:number}], nextDecisionAt: number, lastObservationsAt?: number, lastLLMAt?: number, isRateLimited?: boolean }`
- **memory** `{ id, agentId, type: 'episodic'|'semantic'|'social', content: string, embedding?: number[], salience:number, decayRate:number, createdAt, lastUsedAt }`
- **relationship** `{ id, aId, bId, friendship:number, trust:number, attraction:number, lastInteractionAt }`
- **event** `{ id, ts, type: 'decision'|'move'|'chat'|'invite'|'world'|'perception', payload: any, agentIds?: string[], placeId?, text?: string }`
- **invite** `{ id, fromId, toId, placeId, proposedActivity:string, expiresAt, status:'pending'|'accepted'|'declined'|'ignored' }`
- **llm_task** `{ id, agentId, kind:'microdecision'|'reflection', prompt: string, model: string, status:'queued'|'done'|'failed', latencyMs?: number, output?: any, createdAt }`
- **perception_cache** `{ id, agentId, ts, snapshotId, perceptions: [{targetId, rel:{dx,dy}, distance:number, bearingRad:number, targetRole:string, targetState:string}], fovDeg:number, visionRadiusM:number }`

**Defaults:** `agent.fovDeg = 120`, `agent.visionRadiusM = 20`, `agent.headingRad` updates from motion vector when in `Transit`, otherwise persists.

### 3.12 API (Convex Actions/Functions)

- `observerHeartbeat(sessionId)` → updates/creates observer; recompute `observerCount`; toggle world run state accordingly.
- `adminToggle(enabled:boolean)` → flips `adminEnabled`.
- `tick()` → if `world_settings.isRunning && adminEnabled`:

  - update movement along paths;
  - update biological homeostasis (fullness decay) per agent;
  - for agents with `nextDecisionAt<=now`, enqueue `decideNext()`;
  - process invites/timeouts;
  - emit `event` rows.

- `decideNext(agentId)` → gather context snapshot → call LLM router → apply state transition; schedule `nextDecisionAt`; log `event(decision)`.
- `injectMemory(agentId, content, salience)` → create memory + possible immediate interrupt.
- `reflect(agentId)` → summarize recent events → update goals/traits/memories.
- **Perception sweep (every 5s):**

  - `perceptionSweep()` (orchestrator, runs if world running) → builds a **positions snapshot** and fans out K parallel shards.
  - `buildPositionsSnapshot()` → reads all agents’ `{id,pos,headingRad,state,role}` into a compact doc `positions_snapshot{ id, ts, items: [...] }`.
  - `computeObservationsShard(snapshotId, shardIndex, shardCount)` → for its slice of agents, computes visible neighbors within **20m radius** and **FOV sector**; persists to `perception_cache`; emits `event(perception)`.

**Scheduling:** `perceptionSweep()` scheduled on a 5‑second interval while `world_settings.isRunning=true`; `shardCount = min(6, ceil(agentCount/30))` to keep each shard under ~30 agents.

### 3.13 Structured Outputs

**Microdecision Output (LLM → server):**

```json
{
  "nextActivity": "Transit|Study|Eat|Chat|Idle|Sleep|Reflect",
  "destinationPlaceId": "string|null",
  "targetAgentId": "string|null",
  "durationSecs": 30,
  "utterance": "string|null",
  "emotionDelta": { "valence": 0.05, "arousal": -0.1 }
}
```

**Reflection Output:**

```json
{
  "summary": "...",
  "newMemories": [{ "content": "...", "salience": 0.7, "type": "episodic" }],
  "goalAdjustments": [{ "name": "study", "delta": +0.2 }],
  "relationshipAdjustments": [{ "agentId": "...", "friendshipDelta": 0.1 }],
  "traitNudges": { "conscientiousness": +0.05 }
}
```

### 3.14 Perception Geometry & Algorithms (Every 5s, Parallel)

- **Scale:** 1 tile ≈ 1m ⇒ **20m radius = 20 tiles**.
- **Heading & FOV:** Only entities **in front** are perceived. Use `agent.headingRad`; **FOV = 120°** (±60°). Compute `bearingRad = atan2(dy, dx)`, include if `|wrapAngle(bearingRad - headingRad)| ≤ FOV/2`.
- **Occlusion:** Raycast against solid tiles (Bresenham on the grid). If a wall blocks line‑of‑sight, exclude.
- **Spatial index:** Uniform spatial hash by tile (bucket size 8×8). Candidates = buckets intersecting the 20‑tile circle. Complexity ~O(n) overall with small constant.
- **Output per target:** `{targetId, rel:{dx,dy}, distance, bearingRad, targetRole, targetState}` stored in `perception_cache` and summarized into short‑term memory (optional).
- **Concurrency:** `perceptionSweep` shards agents by index (stable ordering). Each shard runs as an **independent Convex action**; all shards receive the same **immutable positions snapshot** ID to ensure consistency.

### 3.15 Cost & Rate‑Limit Strategy

- **LLM invocations per agent:** aim ≤ 6–10/hour (microdecisions); reflection 2–4/day (demo window).
- **Perception:** purely deterministic CPU on server; 180 agents × every 5s with spatial hashing is well within limits.
- **Batching:** process subsets each tick; jitter `nextDecisionAt` to avoid thundering herd.

### 3.16 Reliability & Fallbacks

- If model timeout: heuristic fallback + humorous event log entry.
- If DB backpressure: drop non‑critical events; never drop agent state.
- If world freezes (0 observers): gracefully mark partial steps “to be continued”.

### 3.17 Security / Safety

- Allow spicy content; still block obviously illegal/abusive text via a cheap classifier (client‑side precheck + server sanity).
- Admin kill switch hard‑stops `tick()` and `decideNext()`.

---

## 4 - Data Flows (Step‑by‑Step)

1. **Viewer arrives** → `observerHeartbeat` increments count → `isRunning=true` → scheduler begins ticking.
2. **Tick** updates positions, **updates biological homeostasis**, and checks agents needing decisions.
3. **Perception sweep (every 5s, sharded)** captures a consistent snapshot and computes per‑agent observations (20m radius, FOV, occlusion).
4. **decideNext()** builds compact context (including latest `perception_cache`) → Groq call → JSON decision → Convex updates agent state & `nextDecisionAt`.
5. **Interactions**: invites created/accepted; two agents move to shared place; `event` rows emitted; relationships adjusted.
6. **Reflection** (periodic or salient): summarize & store long‑term memory; adjust goals/traits.
7. **Viewer leaves** → heartbeat drops → when count=0, finish atomic steps → `isRunning=false`; ticks stop.

---

## 5 - Map & Scale Specs

- **Tile grid:** 80×50 tiles @ 32px (can extend later).
- **Places:** rectangles with named entrances; doorways are walkable.
- **Walking speed:** ~48 px/s (1.5 m/s scaled).
- **Agent radius:** 0.4–0.5 tiles; soft avoidance by not occupying same tile; replan on conflict.

---

## 6 - UI/UX Details

- **Sidebar (Shadcn)**:

  - Search/filter by role/place/emotion.
  - Agent card → hover shows quick stats; click to focus; “inject memory” admin button.

- **Canvas (Pixi)**:

  - Smooth lerp to target; label + bubble over sprite; optional emoji overlay for emotion.

- **Top bar**: live clock + observers count + world state chip (Running/Frozen) + Admin toggle.
- **Event feed**: timestamped narrative; clickable to jump camera.

---

## 7 - Testing, Telemetry & Replay

- **Event Sourcing:** All state transitions produce `event` rows; can rebuild timeline.
- **Dev tools:** “Rewind 30s” (client‑side time travel by refetching events and reapplying).
- **Metrics:** LLM latency, token use, decision rate per agent, frozen/unfrozen durations.

---

## 8 - Implementation Plan (24‑Hour Timebox)

**T‑0 to T+3h — Scaffolding**

- Next.js app + Convex + Shadcn; Pixi stage with sample map; world_settings & observer collections; admin toggle; heartbeat.

**T+3h to T+8h — Core Sim Loop**

- Grid + A\*; agent doc shape; movement interpolation; tick() server action; basic sidebar listing.

**T+8h to T+14h — LLM Integration**

- Microdecision prompt + Groq adapter; structured JSON; state transition; event logging; fallback heuristics.

**T+14h to T+18h — Emotion/Memory/Relationships**

- Needs ticks; emotion deltas; memory table + decay; basic relationship updates.

**T+18h to T+22h — Polish & Narration**

- Speech bubbles; event feed; Observer narrator script; camera follow; demo buttons.

**T+22h to T+24h — Demo Script & Fallbacks**

- Pre‑seed agents; pre‑bake 2–3 highlight sequences (if needed); load test with 40–60 agents; record a clean run.

---

## 9 - Demo Script (90 seconds)

1. **Cold open (Frozen).** Show DB `world_settings.isRunning=false`; 0 observers.
2. **Enter Observer:** Open page; counter → 1; “World Waking…”; agents finish half‑steps then resume.
3. **Follow Alice:** She recalls a test (memory spike), diverts to library; bubble shows thought; valence dips, arousal up.
4. **Social spark:** Ping from Bob; invite to café; quick weigh vs study; chooses brief café stop; logs event in feed.
5. **Narrator beat:** “At 12:27, Charlie ignores a message and keeps scrolling.” Crowd chuckles.
6. **Freeze proof:** Close page; counter→0; show `isRunning=false` again and paused timestamps.

---

## 10 - Risks & Mitigations

- **LLM cost/latency blow‑up:** Batch decisions, jitter schedules, heuristic fallback; cap `maxConcurrentDecisions`.
- **Pathfinding crowd jams:** Soft collisions + occasional replan; staggered entrances.
- **State drift between client/server:** Server authoritative; client is view only; all mutations via actions.

---

## 11 - Future Extensions

- Super‑narrator event tools (group blasts, campus‑wide alerts).
- Personal schedules and clubs; semester arcs; grades; parties.
- Audio/TTS; richer faces; gossip propagation; rumor reliability.

---

## 12 - Acceptance Criteria (Ship Checklist)

- [ ] Observer heartbeat toggles world run/freeze and is visible in UI + DB.
- [ ] Agents move via A\* and interpolate smoothly at 60 FPS.
- [ ] **Biological homeostasis:** fullness decays toward baseline; eating increases fullness; hunger maps from fullness.
- [ ] **Perception:** every 5s, each agent’s observation set is computed (20m radius, 120° FOV, occlusion), cached, and visible in an inspector.
- [ ] LLM microdecision returns strict JSON and drives activity FSM.
- [ ] Emotions/needs update and influence choices; visible mini‑meters.
- [ ] Event log captures decisions/moves/interactions/perception and can be replayed.
- [ ] Admin kill switch halts ticks and LLM calls instantly.
- [ ] Demo script reproducible with 40–60 agents; no hard errors in 2‑minute run.

---

### Appendix A: Example Heuristic Fallback

If decision overdue or LLM failed:

- If `studyPressure > 0.7` and near Library → `Study 5–10 min`.
- Else if `hunger > 0.7` → `Eat 8–12 min` at Café.
- Else if `socialDrive > 0.7` and friend nearby → `Chat 3–6 min`.
- Else → `Idle/Reflect 1–3 min`.

### Appendix B: Minimal Seeds

- **Roles:** 35 students, 5 profs, 3 baristas, 10 TAs, 5 club leaders.
- **Initial relationships:** 30% paired friendships, 10% crushes, 5% rivalries.

### Appendix C: Token/Latency Budgets

- Microdecision prompt ≤ 200 input tokens, ≤ 60 output; SLA ≤ 400ms (Groq).
- Reflection ≤ 800 in, ≤ 200 out; SLA ≤ 3s (OpenAI/Anthropic).
- Cap
  `maxConcurrentDecisions = 8–12`; queue with backoff.
