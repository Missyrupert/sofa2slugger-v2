# TECH_STACK.md  
**Technology Stack & Constraints**

## Platform
- Mobile-first application
- iOS and Android support
- Cross-platform framework acceptable
- Background audio playback required

The product must function with the phone locked or screen off.

---

## Frontend
- Minimal UI surface
- Audio player with background playback support
- Explicit user-initiated play only
- Offline-tolerant audio playback where feasible

The frontend must never:
- track user behavior
- infer compliance
- simulate progress

---

## Backend
Backend is intentionally minimal.

Used only for:
- Audio file delivery
- Purchase validation
- Session unlock authorization

No backend logic related to:
- usage frequency
- completion tracking
- behavior analysis

---

## Payments
- One-time purchase (£9.99)
- Unlocks Sessions 2–10
- No subscriptions
- No trials beyond Session 1
- No discounts, bundles, or upsells

---

## Data Storage

### Local Storage
- `session1Completed: boolean`
- `purchaseUnlocked: boolean`

Local state is sufficient for most behavior.

### Server Storage (If Required)
- Purchase receipt validation
- Audio access authorization

---

## Explicitly Forbidden Technologies
- Analytics or telemetry frameworks
- Push notification services
- A/B testing tools
- Engagement optimization SDKs
- Social or sharing SDKs
- Behavioral tracking of any kind

---

## Versioning Philosophy
- Favor stability over novelty
- Do not upgrade dependencies without explicit reason
- Avoid unnecessary abstraction

