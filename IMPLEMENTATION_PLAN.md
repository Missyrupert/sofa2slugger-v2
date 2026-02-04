# IMPLEMENTATION_PLAN.md  
**Step-by-Step Build Order**

This plan is authoritative.  
Steps must be completed sequentially.  
No step may be skipped or merged.

---

## Phase 1 — Foundation

### Step 1
Initialize the project repository and establish the base folder structure.

Deliverables:
- Clean project scaffold
- Canonical docs present at root
- No application code yet

---

## Phase 2 — Audio Core

### Step 2
Implement a minimal audio player capable of:
- Immediate playback on press
- Background playback
- Screen-lock resilience

No UI polish.

---

### Step 3
Wire Session 1 audio to the player.

Deliverables:
- Session 1 plays reliably
- No autoplay
- No additional controls

---

## Phase 3 — Session 1 Flow

### Step 4
Build the Session 1 screen.

Deliverables:
- Single CTA: Play Session 1
- No secondary actions
- No copy beyond what is required

---

### Step 5
Build the Session 1 completion screen.

Deliverables:
- Confirmation of completion
- One clear path: Unlock Full Programme
- No pressure language

---

## Phase 4 — Purchase Gate

### Step 6
Integrate one-time purchase flow.

Deliverables:
- Purchase unlocks Sessions 2–10
- Purchase state persists
- No subscription logic

---

## Phase 5 — Full Programme

### Step 7
Add Session list (1–10).

Deliverables:
- Fixed numeric ordering
- Locked / unlocked states
- Explicit play only

---

### Step 8
Wire Sessions 2–10 audio.

Deliverables:
- All audio files playable
- No autoplay
- No progression enforcement

---

## Phase 6 — Edge Handling

### Step 9
Handle audio interruption gracefully.

Deliverables:
- Resume or restart behavior
- No error drama
- Silent failure allowed

---

## Phase 7 — Finalization

### Step 10
Final review and restraint audit.

Deliverables:
- Copy review against forbidden list
- UX audit for pressure or momentum simulation
- Manual end-to-end testing

