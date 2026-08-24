import { afterEach, describe, expect, it, vi } from "vitest";
import { WeatherProviderFailedError } from "@closet-ai/application";
import { OpenMeteoAdapter } from "./open-meteo.adapter.js";

describe("OpenMeteoAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps Open-Meteo current and daily response into normalized weather context", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          current: {
            temperature_2m: 18,
            apparent_temperature: 17,
            relative_humidity_2m: 68,
            wind_speed_10m: 12
          },
          daily: {
            temperature_2m_min: [14],
            temperature_2m_max: [22],
            precipitation_probability_max: [45]
          }
        }),
        { status: 200 }
      )
    );

    const adapter = new OpenMeteoAdapter({ baseUrl: "https://weather.example/v1", requestTimeoutMs: 5000, cacheTtlSeconds: 1200 });

    await expect(
      adapter.getCurrent({ latitude: 19.4326, longitude: -99.1332, timezone: "America/Mexico_City" })
    ).resolves.toEqual({
      temperature: 18,
      apparentTemperature: 17,
      minTemperature: 14,
      maxTemperature: 22,
      rainProbability: 45,
      windSpeed: 12,
      humidity: 68
    });
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/v1/forecast");
    expect(url.searchParams.get("current")).toContain("temperature_2m");
    expect(url.searchParams.get("daily")).toContain("precipitation_probability_max");
  });

  it("wraps provider HTTP errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Nope", { status: 503 }));
    const adapter = new OpenMeteoAdapter({ baseUrl: "https://weather.example/v1", requestTimeoutMs: 5000, cacheTtlSeconds: 1200 });

    await expect(adapter.getCurrent({ latitude: 1, longitude: 2, timezone: "Etc/UTC" })).rejects.toThrow(WeatherProviderFailedError);
  });

  it("wraps timeout and network errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("timeout"));
    const adapter = new OpenMeteoAdapter({ baseUrl: "https://weather.example/v1", requestTimeoutMs: 1, cacheTtlSeconds: 1200 });

    await expect(adapter.getCurrent({ latitude: 1, longitude: 2, timezone: "Etc/UTC" })).rejects.toThrow(WeatherProviderFailedError);
  });

  it("rejects malformed JSON or missing fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ current: {}, daily: {} }), { status: 200 }));
    const adapter = new OpenMeteoAdapter({ baseUrl: "https://weather.example/v1", requestTimeoutMs: 5000, cacheTtlSeconds: 1200 });

    await expect(adapter.getCurrent({ latitude: 1, longitude: 2, timezone: "Etc/UTC" })).rejects.toThrow(WeatherProviderFailedError);
  });
});
