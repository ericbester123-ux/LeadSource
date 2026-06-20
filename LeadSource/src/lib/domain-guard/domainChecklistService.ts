import { DomainReputationCheck } from "@prisma/client";
import { sendingLimitWarnings } from "./sendingLimitService";

export type ChecklistItem = {
  key: keyof DomainReputationCheck;
  label: string;
  complete: boolean;
};

export function getDomainChecklistItems(check: DomainReputationCheck): ChecklistItem[] {
  return [
    { key: "dedicatedSendingDomain", label: "Dedicated outreach domain added", complete: check.dedicatedSendingDomain },
    { key: "spfConfigured", label: "SPF configured", complete: check.spfConfigured },
    { key: "dkimConfigured", label: "DKIM configured", complete: check.dkimConfigured },
    { key: "dmarcConfigured", label: "DMARC configured", complete: check.dmarcConfigured },
    { key: "customTrackingDomainConfigured", label: "Custom tracking domain configured", complete: check.customTrackingDomainConfigured },
    { key: "businessAddressAdded", label: "Business address added", complete: check.businessAddressAdded },
    { key: "unsubscribeLinkEnabled", label: "Unsubscribe link active", complete: check.unsubscribeLinkEnabled },
    { key: "suppressionListActive", label: "Suppression list active", complete: check.suppressionListActive },
    { key: "emailVerificationEnabled", label: "Email verification active", complete: check.emailVerificationEnabled },
    { key: "complianceChecksActive", label: "Compliance checks active", complete: check.complianceChecksActive },
    { key: "sendingLimitsConfigured", label: "Daily sending limits configured", complete: check.sendingLimitsConfigured }
  ];
}

export function getChecklistSummary(check: DomainReputationCheck) {
  const items = getDomainChecklistItems(check);
  const completed = items.filter((item) => item.complete).length;
  const completion = Math.round((completed / items.length) * 100);
  const missingItems = items.filter((item) => !item.complete).map((item) => item.label);
  const warnings = sendingLimitWarnings(check);
  const readyForLiveSending = completion === 100 && warnings.length === 0 && !check.simulationMode && check.liveSendingAllowed;

  return {
    items,
    completed,
    total: items.length,
    completion,
    missingItems,
    warnings,
    readyForLiveSending
  };
}
