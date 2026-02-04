# BACKEND_STRUCTURE.md  
**Backend & Data Model**

## Backend Philosophy
The backend exists only to support access.  
It must never interpret, infer, or evaluate user behavior.

No behavioral authority lives on the server.

---

## Data Model (Minimal by Design)

### Local Application State
- `session1Completed: boolean`
- `purchaseUnlocked: boolean`

These values determine all UI state.

No other state is permitted.

---

## Server Responsibilities (If Applicable)

### Audio Access
- Serve audio files for sessions
- Respect purchase unlock state

### Purchase Validation
- Validate one-time purchase receipt
- Confirm unlock eligibility

---

## What Is Explicitly NOT Stored
- Session completion counts
- Playback duration
- Frequency of use
- Time of day usage
- User identity
- Device fingerprints
- Analytics events
- Behavioral telemetry

---

## API Contracts (Conceptual)

### `GET /sessions`
Returns:
- Session metadata (id, title, locked/unlocked)
- No progress data

### `GET /audio/{sessionId}`
Returns:
- Audio stream or file
- No tracking hooks

### `POST /purchase/verify`
Accepts:
- Purchase receipt
Returns:
- Boolean unlock confirmation

---

## Error Handling Philosophy
- Fail quietly
- Allow retry
- No escalation
- No behavioral inference

Errors must never:
- pressure the user
- imply urgency
- suggest failure as a moral state

---

## Security Posture
- Minimal surface area
- No personal data collection
- No accounts
- No authentication system

The backend should be boring.

