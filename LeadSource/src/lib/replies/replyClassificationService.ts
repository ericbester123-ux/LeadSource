export const replyStatuses = [
  "No Reply",
  "Positive",
  "Neutral",
  "Not Interested",
  "Unsubscribe Request",
  "Angry",
  "Out of Office",
  "Referral",
  "Booked"
];

export type ReplyStatus = (typeof replyStatuses)[number];

export type ReplyClassification = {
  status: ReplyStatus;
  sentiment: string;
  summary: string;
};

export function classifyReply(rawReplyBody: string): ReplyClassification {
  const body = rawReplyBody.toLowerCase();

  if (body.includes("unsubscribe") || body.includes("remove me") || body.includes("take me off")) {
    return { status: "Unsubscribe Request", sentiment: "Negative", summary: "Contact asked to be removed from future outreach." };
  }
  if (body.includes("not interested") || body.includes("no thanks") || body.includes("not for us")) {
    return { status: "Not Interested", sentiment: "Negative", summary: "Contact declined the offer." };
  }
  if (body.includes("out of office") || body.includes("away") || body.includes("annual leave")) {
    return { status: "Out of Office", sentiment: "Neutral", summary: "Contact appears to be unavailable temporarily." };
  }
  if (body.includes("angry") || body.includes("stop emailing") || body.includes("complaint") || body.includes("spam")) {
    return { status: "Angry", sentiment: "Negative", summary: "Contact responded negatively and should not receive follow-ups." };
  }
  if (body.includes("referral") || body.includes("speak to") || body.includes("contact my colleague")) {
    return { status: "Referral", sentiment: "Positive", summary: "Contact referred the conversation to another person." };
  }
  if (body.includes("booked") || body.includes("meeting booked") || body.includes("call booked")) {
    return { status: "Booked", sentiment: "Positive", summary: "Contact appears to have booked a meeting." };
  }
  if (body.includes("book") || body.includes("call") || body.includes("meeting") || body.includes("interested")) {
    return { status: "Positive", sentiment: "Positive", summary: "Contact showed interest in a call or next step." };
  }

  return { status: "Neutral", sentiment: "Neutral", summary: "Reply needs manual review." };
}

export function canUseAiClassificationLater() {
  return Boolean(process.env.OPENAI_API_KEY);
}
