
import { Trip, User } from './types';

export const INITIAL_USERS: User[] = [];

export const PRESET_AVATARS = [
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Scooter',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Precious',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Abby',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Bandit',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Bubba',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Callie',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Cookie',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Garfield',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Gizmo',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Loki',
];

export const DEFAULT_TYPES = [
  { value: 'sightseeing', label: '景點', icon: 'fa-camera', color: 'text-blue-500' },
  { value: 'food', label: '餐廳/美食', icon: 'fa-utensils', color: 'text-orange-500' },
  { value: 'shopping', label: '購物', icon: 'fa-bag-shopping', color: 'text-pink-500' },
  { value: 'transport', label: '交通', icon: 'fa-train-subway', color: 'text-emerald-500' },
  { value: 'activity', label: '活動/體驗', icon: 'fa-ticket', color: 'text-purple-500' },
  { value: 'accommodation', label: '住宿', icon: 'fa-bed', color: 'text-indigo-500' },
  { value: 'flight', label: '航班', icon: 'fa-plane', color: 'text-sky-500' }, 
];

export const INITIAL_TRIPS: Trip[] = [];
