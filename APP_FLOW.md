# APP_FLOW.md  
**Application Flow & Navigation**

## Global Principles
- Audio is primary
- UI is subordinate
- Silence is intentional
- No autoplay
- No coercion
- The app waits for the user

---

## App Launch Flow

### First Launch
1. App opens
2. Session 1 screen is shown immediately
3. Primary CTA: **Play Session 1**
4. No onboarding, explanation, tutorial, or setup

This flow is identical on every launch until Session 1 is completed.

---

## Session Playback Flow (All Sessions)

1. User presses Play
2. Audio starts immediately
3. Phone becomes background object
4. No in-session UI changes
5. No monitoring or detection
6. No interruption logic

The app does not attempt to:
- verify compliance
- pause for inactivity
- prompt continuation
- intervene visually

---

## Session 1 Completion Flow

1. Audio outro plays
   - Voice explains what comes next
   - Mentions the full programme (£9.99)
   - No urgency, countdown, or pressure
2. Audio ends
3. Completion screen appears:
   - Confirms Session 1 is complete
   - Offers a single clear path: **Unlock the Full Programme**
4. App waits

---

## Post-Purchase Flow

1. Payment is confirmed
2. Sessions 2–10 unlock visually
3. Same screen layout
4. Same interaction model
5. No new mechanics introduced

---

## Refusal Flow (No Purchase)

- User may replay Session 1 indefinitely
- No reminders
- No prompts
- No degradation of experience
- Silence is respected

---

## Session List Flow (Unlocked Programme)

- Sessions are listed numerically (1–10)
- Only unlocked sessions are playable
- No autoplay between sessions
- The user must explicitly press Play each time

---

## End of Programme Flow (After Session 10)

1. Session 10 completes
2. No new content unlocks
3. No completion ceremony
4. App remains static
5. User may replay any session freely

---

## Error & Failure Handling

### User Non-Compliance
- The app does nothing
- Failure is silent and private
- No correction or feedback

### Technical Errors
- Audio fails or stops → user may replay
- No panic messaging
- No blame
- No urgency language
- Silence is acceptable

---

## Explicit Refusals (System-Level)

The app must never:
- Auto-play a session
- Force progression
- Close itself after playback
- Simulate momentum
- Escalate engagement

