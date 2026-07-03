import {
  AUTH_COOKIE,
  getAccessPassword,
  isAuthEnabled,
  verifySessionToken,
} from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/api/auth") {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const password = getAccessPassword();
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!password || !token || !(await verifySessionToken(token, password))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
