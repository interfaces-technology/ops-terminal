import { AUTH_COOKIE, getAccessPassword, isAuthEnabled, verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function isAuthenticated(): Promise<boolean> {
  if (!isAuthEnabled()) {
    return true;
  }

  const password = getAccessPassword();
  if (!password) {
    return true;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    return false;
  }

  return verifySessionToken(token, password);
}
