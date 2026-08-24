# ADR-011 Open-Meteo Weather Provider

## Status

Accepted

## Context

Closet AI needs real weather context for outfit recommendations while preserving
the domain boundary. The Technology Decision & Architecture Assessment approves
Open-Meteo as the weather provider and Redis as temporary operational cache.

## Decision

Implement weather access behind a semantic `WeatherPort` with an
`OpenMeteoAdapter`.

Weather Context v1 uses an approximate user-configured location:

```text
city
latitude
longitude
timezone
```

The application normalizes provider output into `WeatherContext`:

```text
temperature
apparentTemperature
minTemperature
maxTemperature
rainProbability
windSpeed
humidity
```

Weather responses are cached through `WeatherCachePort` with Redis using
`weather:{lat}:{lon}:{timeBucket}` style keys and a short TTL. PostgreSQL
remains the source of truth for user location. Weather history is not persisted
in this slice.

If Open-Meteo or Redis cache access fails during outfit recommendation, Closet
AI continues without weather and marks weather as unavailable.

## Alternatives Considered

- Calling Open-Meteo directly from controllers.
- Passing raw Open-Meteo responses to OpenAI.
- Using device GPS or background geolocation.
- Persisting weather snapshots in PostgreSQL immediately.

## Consequences

- Weather provider can be replaced without changing domain logic.
- Recommendations can use weather when available without making Weather a hard
  dependency of outfit generation.
- The MVP avoids location history and precise tracking.
- Redis is used only as cache, not as domain state.

## Risks

- User-entered coordinates can be imprecise.
- No city lookup or map validation exists yet.
- No historical weather analytics are available until a future slice introduces
  explicit persistence.
