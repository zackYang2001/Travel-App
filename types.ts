
export interface ItineraryItem {
  id: string;
  time: string;
  location: string;
  description: string;
  type: string; 
  lat?: number;
  lng?: number;
  // Flight specific fields
  flightNumber?: string;
  isArrival?: boolean; 
  origin?: string; 
  destination?: string; 
  originTerminal?: string; 
  destinationTerminal?: string; 
  departureTime?: string;
  arrivalTime?: string;
  // New Metadata
  rating?: number;
  price?: string; // $, $$, $$$
  openTime?: string;
  imageUrl?: string;
  imageOffsetY?: number; // 0 to 100 percentage
}

export interface DayItinerary {
  id: string;
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g., "Day 1"
  items: ItineraryItem[];
  weather?: WeatherInfo;
}

export interface WeatherInfo {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'rain' | 'storm';
  icon: string;
  precipitationChance?: number; // 0-100 percentage
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  payerId: string;
  date: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Balance {
  userId: string;
  amount: number; // Positive means you are owed money, negative means you owe
}

export interface Trip {
  id: string;
  name: string; // e.g. "Shanghai Trip"
  destination: string; // e.g. "Shanghai"
  startDate: string;
  endDate: string;
  coverImage: string;
  coverImageDark?: string; // Optional dark mode specific image
  days: DayItinerary[];
  expenses: Expense[];
  participants?: string[]; // List of User IDs who are in this trip
}

export enum AppTab {
  ITINERARY = 'ITINERARY',
  EXPENSES = 'EXPENSES',
  MAP = 'MAP',
}