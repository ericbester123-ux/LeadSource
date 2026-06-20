import { localEmailSyntaxCheck } from "./localEmailSyntaxCheck";

export async function zerobounceProviderPlaceholder(email: string) {
  return localEmailSyntaxCheck(email);
}
