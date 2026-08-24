import { WeatherCachePort, WeatherPort } from "@closet-ai/application";

export const WEATHER_PROVIDER = Symbol("WEATHER_PROVIDER");
export const WEATHER_CACHE = Symbol("WEATHER_CACHE");

export type WeatherProvider = WeatherPort;
export type WeatherCacheProvider = WeatherCachePort;
