export async function checkImapRepliesPlaceholder() {
  return {
    provider: "imap",
    enabled: false,
    message: "IMAP reply tracking is a placeholder for Stage 13. Manual reply tracking is active."
  };
}
