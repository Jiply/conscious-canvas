import { twMerge } from 'tailwind-merge';
import { type ClassValue, clsx } from 'clsx';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const AGENT_PROFILE_PICTURES: Record<string, string> = {
  'Emma Kim': '/07.png',
  'Maya Chen': '/01.png',
  'Raj Patel': '/06.png',
  'Zara Ahmed': '/03.png',
  "Liam O'Brien": '/04.png',
  'Sofia Martinez': '/05.png',
  'Marcus Johnson': '/08.png',
  'Prof. James Wilson': '/02.png',
};

export const getProfilePicture = (agentName: string) => AGENT_PROFILE_PICTURES[agentName] || '/01.png';
