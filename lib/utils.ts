import { twMerge } from "tailwind-merge";
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AGENT_PROFILE_PICTURES: Record<string, string> = {
  "Maya Chen": "/01.png",
  "Prof. James Wilson": "/02.png",
  "Zara Ahmed": "/03.png",
  "Liam O'Brien": "/04.png",
  "Sofia Martinez": "/05.png",
  "Raj Patel": "/06.png",
  "Emma Kim": "/07.png",
  "Marcus Johnson": "/08.png",
};

export function getProfilePicture(agentName: string) {
  return AGENT_PROFILE_PICTURES[agentName] || "/01.png";
}
