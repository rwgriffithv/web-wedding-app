import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { isSessionRevoked } from "@/lib/session-revocation";
import { parseClientIp } from "@/lib/ip";

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function setCacheHeader(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return setCacheHeader(NextResponse.next());

  const session = verifyToken(token);
  if (!session) {
    const response = NextResponse.next();
    clearSessionCookie(response);
    return setCacheHeader(response);
  }

  const ip = parseClientIp(request.headers);

  if (isSessionRevoked(session, ip)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    clearSessionCookie(response);
    // Redirect responses are not cached by browsers, so no-store here is
    // technically unnecessary.  Applied for logical consistency: every
    // response that leaves the proxy carries the same directive.
    return setCacheHeader(response);
  }

  return setCacheHeader(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
