import { DomainReputationCheck } from "@prisma/client";

export function sendingLimitWarnings(check: DomainReputationCheck) {
  return [
    check.dailyLimitPerInbox > 50 && "Daily sending limit is above 50 emails per inbox per day.",
    check.bounceThreshold <= 0 && "Bounce threshold is missing.",
    check.unsubscribeThreshold <= 0 && "Unsubscribe threshold is missing.",
    !check.sendingWindowStart || !check.sendingWindowEnd ? "Sending window is missing." : null,
    !check.sendingDays ? "Sending days are missing." : null
  ].filter(Boolean) as string[];
}

export function sendingWindowLabel(check: DomainReputationCheck) {
  return check.sendingWindowStart && check.sendingWindowEnd ? `${check.sendingWindowStart} to ${check.sendingWindowEnd}` : "Missing";
}
