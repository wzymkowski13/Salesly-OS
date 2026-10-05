# Call Center Panel → Salesly OS summary contract

## Purpose

Salesly OS does not copy Call Center Panel logic. The panel exposes one small read-only endpoint with the two KPIs needed by the work dashboard.

## Endpoint

Recommended route:

```
GET /api/os-summary
```

The URL is configured in Salesly OS as:

```env
CALL_CENTER_SUMMARY_URL=https://salesly.pl/api/os-summary
CALL_CENTER_SUMMARY_TOKEN=<shared-secret>
```

The token is server-side only.

## Authorization

If `CALL_CENTER_SUMMARY_TOKEN` is configured, Salesly OS sends:

```
Authorization: Bearer <shared-secret>
```

The panel should return `401` for a missing or invalid token.

## Response

HTTP 200:

```json
{
  "leads_today": 14,
  "efficiency_today": 0.92,
  "generated_at": "2026-10-05T10:00:00Z"
}
```

Fields:

- `leads_today`: integer >= 0; number of leads counted by the Call Center Panel for the current business day.
- `efficiency_today`: decimal from 0 to 1. `0.92` means 92%. Salesly OS also tolerates values from 1 to 100 for compatibility.
- `generated_at`: optional ISO 8601 timestamp.

## Failure behaviour

Salesly OS:

- waits at most about 1.2 seconds for the panel,
- caches a successful GET for about 45 seconds,
- never blocks the rest of the dashboard if the panel is offline,
- renders `—` with a short unavailable/configuration hint instead.

The panel endpoint should therefore stay read-only and very cheap: one aggregate query or a cached summary is preferred.

## Example server logic

Pseudocode:

```ts
if (request.headers.authorization !== `Bearer ${process.env.OS_SUMMARY_TOKEN}`) {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

const leadsToday = await countAcceptedLeadsForToday();
const efficiencyToday = await calculateEfficiencyForToday();

return Response.json({
  leads_today: leadsToday,
  efficiency_today: efficiencyToday,
  generated_at: new Date().toISOString(),
});
```

Do not expose consultant-level personal data in this endpoint. The OS only needs aggregate KPI values.
