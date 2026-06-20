import { localEmailSyntaxCheck } from "./localEmailSyntaxCheck";

export async function neverbounceProviderPlaceholder(email: string) {
  return localEmailSyntaxCheck(email);
}
