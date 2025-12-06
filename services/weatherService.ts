
import { WeatherInfo } from '../types';

// Mock function to simulate fetching weather based on date
// In a real app, this would call OpenWeatherMap or similar API
export const getWeatherForDate = (date: string): WeatherInfo => {
  // Simple deterministic hash based on date string to return consistent mock data
  const dayChar = date.slice(-1); 
  const num = parseInt(dayChar, 10);
  const randomChance = (num * 10) % 100; // Deterministic pseudo-random

  if (isNaN(num)) return { temp: 24, condition: 'sunny', icon: 'fa-sun', precipitationChance: 0 };

  if (num % 3 === 0) {
    return { temp: 20, condition: 'rain', icon: 'fa-cloud-rain', precipitationChance: 70 + (num % 30) };
  } else if (num % 3 === 1) {
    return { temp: 22, condition: 'cloudy', icon: 'fa-cloud', precipitationChance: 30 + (num % 20) };
  } else {
    return { temp: 26, condition: 'sunny', icon: 'fa-sun', precipitationChance: randomChance % 20 };
  }
};
