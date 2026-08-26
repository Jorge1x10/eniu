import { localStore } from '@/lib/local-store';

export const MILESTONES = [1, 50, 100, 500, 1000, 5000, 10000];
const NOTIFICATIONS_KEY = 'eniu.milestone.notifications';

export async function getLastCelebratedMilestone(catalogueId: string) {
  const value = await localStore.getItem(`eniu.milestone.${catalogueId}`);
  return value ? Number(value) : 0;
}

export async function setLastCelebratedMilestone(catalogueId: string, milestone: number) {
  await localStore.setItem(`eniu.milestone.${catalogueId}`, String(milestone));
}

export function nextUncelebratedMilestone(views: number, last: number) {
  const reached = MILESTONES.filter((milestone) => milestone <= views && milestone > last);
  return reached.length ? reached[reached.length - 1] : null;
}

export function upcomingMilestone(views: number) {
  return MILESTONES.find((milestone) => milestone > views) ?? null;
}

export async function getMilestoneNotificationsEnabled() {
  const value = await localStore.getItem(NOTIFICATIONS_KEY);
  return value !== 'false';
}

export async function setMilestoneNotificationsEnabled(enabled: boolean) {
  await localStore.setItem(NOTIFICATIONS_KEY, String(enabled));
}
