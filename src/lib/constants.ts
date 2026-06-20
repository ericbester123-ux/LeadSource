export const leadStatuses = [
  "New",
  "Discovered",
  "Scored",
  "Verified",
  "Compliance Passed",
  "Ready for Review",
  "Approved",
  "Queued",
  "Contacted",
  "Follow Up Due",
  "Replied",
  "Interested",
  "Booked Appointment",
  "Not Interested",
  "Do Not Contact",
  "Unsubscribed",
  "Bounced",
  "Synced to GHL"
];

export const complianceStatuses = [
  "Pending Review",
  "Passed",
  "Needs Manual Approval",
  "Failed",
  "Suppressed",
  "Unsubscribed",
  "Do Not Contact"
];

export const verificationStatuses = [
  "Not Checked",
  "Valid",
  "Invalid",
  "Risky",
  "Catch-All",
  "Unknown"
];

export const qualityLabels = ["Hot Fit", "Good Fit", "Maybe", "Poor Fit", "Do Not Contact"];

export const contactTypes = [
  "Generic Business Email",
  "Named Corporate Email",
  "Individual Subscriber",
  "Sole Trader",
  "Partnership",
  "Unknown"
];

export const ghlStatuses = ["Not Ready", "Ready for GHL", "Synced", "Failed", "Skipped"];

export const leadFieldOptions = [
  { key: "skip", label: "Do not import" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "fullName", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "companyName", label: "Company name" },
  { key: "website", label: "Website" },
  { key: "location", label: "Location" },
  { key: "city", label: "City" },
  { key: "stateRegion", label: "State/region" },
  { key: "country", label: "Country" },
  { key: "industry", label: "Industry" },
  { key: "niche", label: "Niche" },
  { key: "sourceUrl", label: "Source URL" },
  { key: "sourcePlatform", label: "Lead source" },
  { key: "personalisationNote", label: "Personalisation note" },
  { key: "tags", label: "Tags" },
  { key: "notes", label: "Notes" }
];
