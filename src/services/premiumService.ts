import { getAdFreeEventName, hasAdFreeEntitlement } from "@/services/purchaseService";
import { getHouseProjects } from "@/services/storage";

export const FREE_HOUSE_PROJECT_LIMIT = 1;

export const hasPremiumAccess = (): boolean => hasAdFreeEntitlement();

export const getHouseProjectLimit = (premium = hasPremiumAccess()): number =>
  premium ? Number.POSITIVE_INFINITY : FREE_HOUSE_PROJECT_LIMIT;

export const getHouseProjectsCount = (): number => {
  try {
    return getHouseProjects().length;
  } catch {
    return 0;
  }
};

export const canCreateHouseProject = (
  currentCount = getHouseProjectsCount(),
  premium = hasPremiumAccess(),
): boolean => premium || currentCount < FREE_HOUSE_PROJECT_LIMIT;

export const getRemainingFreeHouseProjectSlots = (
  currentCount = getHouseProjectsCount(),
  premium = hasPremiumAccess(),
): number => {
  if (premium) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_HOUSE_PROJECT_LIMIT - currentCount);
};

export const getPremiumEventName = (): string => getAdFreeEventName();