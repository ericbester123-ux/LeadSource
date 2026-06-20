import { localEmailSyntaxCheck } from "./localEmailSyntaxCheck";

export async function debounceProviderPlaceholder(email: string) {
  return localEmailSyntaxCheck(email);
}
