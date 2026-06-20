import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const emailBodies = [
  {
    stepNumber: 1,
    name: "Cold Email",
    delayDays: 0,
    subject: "Quick question about {{company_name}}",
    body: `Hi {{first_name}},

I came across {{company_name}} and wanted to reach out.

We help real estate agents turn online leads into booked buyer and seller appointments using paid ads, AI follow-up, and automated booking systems.

Would you be open to a quick 15-minute call to see if this could help {{company_name}}?

Kind regards,
{{sender_name}}
{{agency_name}}
https://estateselevate.com

{{business_address}}

To opt out of future emails, click here:
{{unsubscribe_link}}`
  },
  {
    stepNumber: 2,
    name: "Follow-Up 1",
    delayDays: 2,
    subject: "Re: Quick question about {{company_name}}",
    body: `Hi {{first_name}},

Just following up.

Do you currently have a system in place that follows up with every new property lead automatically and helps book them into your calendar?

Worth a quick chat?

Kind regards,
{{sender_name}}
{{agency_name}}
https://estateselevate.com

To opt out:
{{unsubscribe_link}}`
  },
  {
    stepNumber: 3,
    name: "Follow-Up 2",
    delayDays: 5,
    subject: "Re: Quick question about {{company_name}}",
    body: `Hi {{first_name}},

A lot of real estate agents lose leads not because the lead was bad, but because the follow-up was too slow.

Our system helps with lead capture, AI follow-up, appointment booking, and CRM tracking.

Would you like me to show you how it could work for {{company_name}}?

Kind regards,
{{sender_name}}
{{agency_name}}
https://estateselevate.com

To opt out:
{{unsubscribe_link}}`
  },
  {
    stepNumber: 4,
    name: "Follow-Up 3",
    delayDays: 9,
    subject: "Re: Quick question about {{company_name}}",
    body: `Hi {{first_name}},

Should I close your file for now?

If this is something you want to explore, here is my calendar:

{{calendar_link}}

Kind regards,
{{sender_name}}
{{agency_name}}
https://estateselevate.com

To opt out:
{{unsubscribe_link}}`
  },
  {
    stepNumber: 5,
    name: "Final Follow-Up",
    delayDays: 13,
    subject: "Re: Quick question about {{company_name}}",
    body: `Hi {{first_name}},

This will be my last follow-up.

If this becomes a priority later, you can book a quick call here:

{{calendar_link}}

Kind regards,
{{sender_name}}
{{agency_name}}
https://estateselevate.com

To opt out:
{{unsubscribe_link}}`
  }
];

const leads = [
  ["Amelia", "Hart", "hello@hartandcoestates.co.uk", "Hart & Co Estates", "London", "United Kingdom", 91, "Hot Fit"],
  ["James", "Porter", "sales@porterlettings.co.uk", "Porter Lettings", "Manchester", "United Kingdom", 82, "Good Fit"],
  ["Olivia", "Reed", "info@reedproperty.co.uk", "Reed Property Partners", "Birmingham", "United Kingdom", 79, "Good Fit"],
  ["George", "Ellis", "enquiries@ellisluxuryhomes.co.uk", "Ellis Luxury Homes", "Bath", "United Kingdom", 87, "Hot Fit"],
  ["Sofia", "Miles", "contact@milesagency.co.uk", "Miles Estate Agency", "Leeds", "United Kingdom", 73, "Good Fit"],
  ["Maya", "Chen", "contact@bayfrontrealty.com", "Bayfront Realty Group", "Miami", "United States", 88, "Hot Fit"],
  ["Noah", "Brooks", "team@lonestarproperty.com", "Lone Star Property Advisors", "Dallas", "United States", 76, "Good Fit"],
  ["Ava", "Stone", "hello@stonebrookrealty.com", "Stonebrook Realty", "New York", "United States", 84, "Good Fit"],
  ["Ethan", "Grant", "info@pacificlistings.com", "Pacific Listings", "Los Angeles", "United States", 89, "Hot Fit"],
  ["Lily", "Morgan", "sales@floridaluxuryagents.com", "Florida Luxury Agents", "Orlando", "United States", 86, "Hot Fit"]
];

async function main() {
  await prisma.emailVerification.updateMany({
    where: { provider: "local", status: "Valid" },
    data: {
      status: "Unknown",
      resultDetails: "Local syntax check passed. Real provider verification required.",
      manuallyApproved: false
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@estateselevate.com" },
    update: {},
    create: { name: "Estates Elevate Admin", email: "admin@estateselevate.com" }
  });

  const source = await prisma.leadSource.upsert({
    where: { id: "seed-source-manual" },
    update: {},
    create: {
      id: "seed-source-manual",
      name: "Seed Mock Discovery",
      type: "Mock",
      provider: "local",
      description: "Stage 2 fake UK and US real estate leads."
    }
  });

  const run = await prisma.leadDiscoveryRun.create({
    data: {
      query: "real estate agents UK and USA",
      country: "United Kingdom, United States",
      industry: "Real Estate",
      niche: "Estate agents, letting agents, brokers, property agencies",
      provider: "mock",
      leadsFound: leads.length
    }
  });

  const campaign = await prisma.campaign.upsert({
    where: { id: "default-real-estate-campaign" },
    update: {
      mode: "Review Required",
      pauseReason: null,
      pausedBy: null,
      pausedAt: null,
      minimumLeadScore: 75,
      maxEmailsSentPerDay: 20,
      requireManualApprovalBeforeSend: true
    },
    create: {
      id: "default-real-estate-campaign",
      name: "UK and US Real Estate Agents",
      mode: "Review Required",
      targetCountry: "United Kingdom, United States",
      targetLocations: "UK and US",
      targetIndustry: "Real Estate",
      targetNiche: "Estate agents, letting agents, brokers, property agencies",
      offer: "AI lead follow-up and booked appointment system for real estate agents.",
      minimumLeadScore: 75,
      maxLeadsDiscoveredPerDay: 50,
      maxEmailsSentPerDay: 20
    }
  });

  await prisma.emailSendLog.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.sendingQueueItem.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.campaignStep.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.emailTemplate.deleteMany({ where: { campaignId: campaign.id } });

  for (const step of emailBodies) {
    await prisma.campaignStep.create({
      data: { campaignId: campaign.id, ...step }
    });
    await prisma.emailTemplate.create({
      data: {
        campaignId: campaign.id,
        name: step.name,
        subject: step.subject,
        body: step.body,
        stepNumber: step.stepNumber,
        mergeTags: "{{first_name}},{{last_name}},{{full_name}},{{company_name}},{{website}},{{location}},{{city}},{{state}},{{country}},{{industry}},{{niche}},{{personalisation_note}},{{calendar_link}},{{sender_name}},{{agency_name}},{{unsubscribe_link}},{{business_address}}"
      }
    });
  }

  for (const [firstName, lastName, email, companyName, city, country, score, qualityLabel] of leads) {
    const lead = await prisma.lead.upsert({
      where: { email: String(email) },
      update: {
        firstName: String(firstName),
        lastName: String(lastName),
        fullName: `${firstName} ${lastName}`,
        companyName: String(companyName),
        website: `https://${String(companyName).toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
        location: `${city}, ${country}`,
        city: String(city),
        country: String(country),
        industry: "Real Estate",
        niche: country === "United Kingdom" ? "Estate agents and letting agents" : "Real estate brokers and agencies",
        sourceUrl: `https://${String(companyName).toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com/contact`,
        sourcePlatform: "Official website",
        confidenceScore: Number(score),
        contactType: "Generic Business Email",
        status: Number(score) >= 75 ? "Compliance Passed" : "Scored",
        doNotContact: false,
        unsubscribed: false,
        bounced: false,
        manuallyApproved: false,
        leadSourceId: source.id,
        personalisationNote: `I noticed ${companyName} works in the ${city} property market.`
      },
      create: {
        firstName: String(firstName),
        lastName: String(lastName),
        fullName: `${firstName} ${lastName}`,
        email: String(email),
        companyName: String(companyName),
        website: `https://${String(companyName).toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
        location: `${city}, ${country}`,
        city: String(city),
        country: String(country),
        industry: "Real Estate",
        niche: country === "United Kingdom" ? "Estate agents and letting agents" : "Real estate brokers and agencies",
        sourceUrl: `https://${String(companyName).toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com/contact`,
        sourcePlatform: "Official website",
        discoveryQuery: country === "United Kingdom" ? "estate agents UK" : "real estate brokers USA",
        confidenceScore: Number(score),
        contactType: "Generic Business Email",
        status: Number(score) >= 75 ? "Compliance Passed" : "Scored",
        leadSourceId: source.id,
        discoveryRunId: run.id,
        personalisationNote: `I noticed ${companyName} works in the ${city} property market.`
      }
    });

    await prisma.reply.deleteMany({ where: { leadId: lead.id, campaignId: campaign.id } });
    await prisma.booking.deleteMany({ where: { leadId: lead.id } });

    await prisma.leadScore.upsert({
      where: { leadId: lead.id },
      update: {
        score: Number(score),
        qualityLabel: String(qualityLabel),
        reasonForScore: "Relevant real estate business with public contact details and clear B2B fit.",
        suggestedPainPoint: "Slow lead follow-up and missed appointment opportunities.",
        suggestedOfferAngle: "AI follow-up and automated booking system.",
        suggestedSubjectLine: "Quick question about {{company_name}}",
        recommendedCampaign: campaign.name,
        personalisationFirstLine: `I noticed ${companyName} is active in ${city}, so I thought this would be relevant.`
      },
      create: {
        leadId: lead.id,
        score: Number(score),
        qualityLabel: String(qualityLabel),
        reasonForScore: "Relevant real estate business with public contact details and clear B2B fit.",
        suggestedPainPoint: "Slow lead follow-up and missed appointment opportunities.",
        suggestedOfferAngle: "AI follow-up and automated booking system.",
        suggestedSubjectLine: "Quick question about {{company_name}}",
        recommendedCampaign: campaign.name,
        personalisationFirstLine: `I noticed ${companyName} is active in ${city}, so I thought this would be relevant.`
      }
    });

    await prisma.emailVerification.upsert({
      where: { leadId: lead.id },
      update: {
        status: "Valid",
        provider: "zerobounce",
        resultDetails: "Seeded deliverability-valid test record for simulated queue workflow.",
        manuallyApproved: false,
        verifiedAt: new Date()
      },
      create: {
        leadId: lead.id,
        status: "Valid",
        provider: "zerobounce",
        resultDetails: "Seeded deliverability-valid test record for simulated queue workflow.",
        verifiedAt: new Date()
      }
    });

    await prisma.complianceCheck.upsert({
      where: { leadId: lead.id },
      update: {
        status: Number(score) >= 75 ? "Passed" : "Pending Review",
        countryProfile: String(country),
        riskLevel: Number(score) >= 75 ? "Lower Risk" : "Needs Review",
        sourceUrlPresent: true,
        lawfulBasisPresent: country === "United Kingdom",
        notes: "Seed contact uses public generic business email with unsubscribe requirement enabled.",
        checkedAt: new Date()
      },
      create: {
        leadId: lead.id,
        status: Number(score) >= 75 ? "Passed" : "Pending Review",
        countryProfile: String(country),
        riskLevel: Number(score) >= 75 ? "Lower Risk" : "Needs Review",
        sourceUrlPresent: true,
        lawfulBasisPresent: country === "United Kingdom",
        notes: "Seed contact uses public generic business email with unsubscribe requirement enabled.",
        checkedAt: new Date()
      }
    });

    await prisma.campaignEnrollment.upsert({
      where: { campaignId_leadId: { campaignId: campaign.id, leadId: lead.id } },
      update: { status: "Ready for Review", currentStep: 1, approvedAt: null, stoppedAt: null, stopReason: null },
      create: {
        campaignId: campaign.id,
        leadId: lead.id,
        status: "Ready for Review"
      }
    });
  }

  await prisma.settings.upsert({
    where: { key: "default_safety_settings" },
    update: {
      value: "Conservative defaults with simulated sending enabled.",
      description: "LeadSource default safety controls.",
      simulateEmailSending: true,
      reviewRequired: true,
      dailyLimitPerInbox: 20,
      emailVerificationRequired: true,
      complianceCheckRequired: true,
      unsubscribeLinkRequired: true,
      suppressionListActive: true,
      doNotContactLogicActive: true,
      auditLogsEnabled: true
    },
    create: {
      key: "default_safety_settings",
      value: "Conservative defaults with simulated sending enabled.",
      description: "LeadSource default safety controls.",
      simulateEmailSending: true,
      reviewRequired: true,
      dailyLimitPerInbox: 20,
      emailVerificationRequired: true,
      complianceCheckRequired: true,
      unsubscribeLinkRequired: true,
      suppressionListActive: true,
      doNotContactLogicActive: true,
      auditLogsEnabled: true
    }
  });

  await prisma.settings.upsert({
    where: { key: "default_outreach_identity" },
    update: {
      value: JSON.stringify({
        senderName: "Eric",
        agencyName: "Estates Elevate",
        websiteUrl: "https://estateselevate.com",
        calendarBookingLink: "https://estateselevate.com/book",
        defaultTargetCountries: "United Kingdom, United States",
        defaultIndustry: "Real Estate",
        campaignMode: "Review Required"
      }),
      description: "Default sender identity and targeting values for LeadSource."
    },
    create: {
      key: "default_outreach_identity",
      value: JSON.stringify({
        senderName: "Eric",
        agencyName: "Estates Elevate",
        websiteUrl: "https://estateselevate.com",
        calendarBookingLink: "https://estateselevate.com/book",
        defaultTargetCountries: "United Kingdom, United States",
        defaultIndustry: "Real Estate",
        campaignMode: "Review Required"
      }),
      description: "Default sender identity and targeting values for LeadSource.",
      simulateEmailSending: true,
      reviewRequired: true,
      dailyLimitPerInbox: 20
    }
  });

  await prisma.sendingInbox.upsert({
    where: { email: "outreach@estateselevate.com" },
    update: {},
    create: {
      name: "Estates Elevate Outreach",
      email: "outreach@estateselevate.com",
      provider: "SMTP",
      fromName: "Estates Elevate",
      dailyLimit: 20,
      sendingDomain: "estateselevate.com"
    }
  });

  for (const entry of [
    { email: "unsubscribe@example.com", reason: "Unsubscribed", source: "Seed" },
    { email: "bounced@example.com", reason: "Bounced", source: "Seed" },
    { email: "notinterested@example.com", reason: "Not Interested", source: "Seed" }
  ]) {
    await prisma.suppressionListEntry.upsert({
      where: { email: entry.email },
      update: {},
      create: entry
    });
  }

  await prisma.integrationConfig.upsert({
    where: { id: "ghl-stage-config" },
    update: {},
    create: {
      id: "ghl-stage-config",
      provider: "GoHighLevel",
      name: "Sample GHL Stages",
      isEnabled: false,
      config: "New Lead, Interested, Booked Appointment, Not Interested"
    }
  });

  await prisma.domainReputationCheck.upsert({
    where: { id: "default-domain-guard" },
    update: {},
    create: {
      id: "default-domain-guard",
      sendingDomain: "estateselevate.com",
      dailyLimitPerInbox: 20,
      sendingDays: "Monday-Friday",
      sendingWindowStart: "09:00",
      sendingWindowEnd: "15:30",
      warmupMode: true,
      simulationMode: true,
      liveSendingAllowed: false,
      liveSendingEnabledAt: null,
      liveSendingEnabledBy: null,
      lastGateCheckAt: null,
      lastGateBlockReason: "Live sending has not been enabled.",
      complianceChecksActive: true,
      bounceThreshold: 0.03,
      unsubscribeThreshold: 0.03,
      complaintThreshold: 0.01,
      status: "Needs Review"
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "Seed data created",
      entityType: "System",
      reason: "Stage 2 seed setup",
      metadata: "Simulation mode enabled; review required."
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
