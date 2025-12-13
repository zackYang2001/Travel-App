
import { WeatherInfo } from '../types';

// Map WMO Weather Codes to our simplified conditions
const mapWmoCodeToCondition = (code: number): { condition: 'sunny' | 'cloudy' | 'rain' | 'storm', icon: string } => {
  // Codes from Open-Meteo docs: https://open-meteo.com/en/docs
  
  // 0: Clear sky
  // 1, 2, 3: Mainly clear, partly cloudy, and overcast
  if (code === 0 || code === 1) return { condition: 'sunny', icon: 'fa-sun' };
  if (code === 2 || code === 3) return { condition: 'cloudy', icon: 'fa-cloud' };
  
  // 45, 48: Fog
  if (code === 45 || code === 48) return { condition: 'cloudy', icon: 'fa-smog' };
  
  // 51, 53, 55: Drizzle
  // 61, 63, 65: Rain
  // 80, 81, 82: Rain showers
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { condition: 'rain', icon: 'fa-cloud-rain' };
  
  // 71, 73, 75: Snow fall
  // 77: Snow grains
  // 85, 86: Snow showers
  // For this app, we group snow with rain or cloudy but give it a snow icon if we had one in types. 
  // Since types only has sunny/cloudy/rain/storm, we map to Rain (wet) or Cloudy (cold). Let's use Rain logic for "Precipitation".
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'rain', icon: 'fa-snowflake' };

  // 95: Thunderstorm
  // 96, 99: Thunderstorm with hail
  if ([95, 96, 99].includes(code)) return { condition: 'storm', icon: 'fa-cloud-bolt' };

  return { condition: 'sunny', icon: 'fa-sun' };
};

export const fetchWeatherForLocation = async (locationName: string, date: string): Promise<WeatherInfo | undefined> => {
  try {
    // 1. Geocode the location (using Open-Meteo Geocoding API)
    // We append "city" or similar to ensure better results if generic
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=zh&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      console.warn(`Weather: Could not find location ${locationName}`);
      return undefined;
    }

    const { latitude, longitude } = geoData.results[0];

    // 2. Fetch Weather (using Open-Meteo Forecast API)
    // Supports forecasting up to 16 days. For past dates, ideally use the archive API, 
    // but the forecast API often handles recent past or returns nulls.
    // For simplicity in this demo, we assume the trip is near-future or recent.
    
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=auto&start_date=${date}&end_date=${date}`;
    
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    if (!weatherData.daily || !weatherData.daily.time || weatherData.daily.time.length === 0) {
       return undefined;
    }

    const maxTemp = weatherData.daily.temperature_2m_max[0];
    const wmoCode = weatherData.daily.weather_code[0];
    const precipChance = weatherData.daily.precipitation_probability_max?.[0] ?? 0;

    const { condition, icon } = mapWmoCodeToCondition(wmoCode);

    return {
      temp: Math.round(maxTemp),
      condition,
      icon,
      precipitationChance: precipChance
    };

  } catch (error) {
    console.error("Error fetching weather:", error);
    return undefined;
  }
};

// Deprecated synchronous mock function (keeping purely for fallback types compatibility if needed temporarily)
export const getWeatherForDate = (date: string): WeatherInfo => {
    return { temp: 25, condition: 'sunny', icon: 'fa-sun', precipitationChance: 0 };
};
