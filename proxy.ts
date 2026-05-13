import { type NextRequest, NextResponse } from "next/server";

import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = new Set<string>(["/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public sign-up is intentionally disabled. Users are added through
  // admin-only provisioning code. Block the sign-up endpoint so it cannot
  // be exercised over HTTP, even if someone discovers the URL.
  if (pathname.startsWith("/api/auth/sign-up")) {
    return NextResponse.json(
      { error: "Sign-up is disabled. Contact an administrator." },
      { status: 403 }
    );
  }

  // Let better-auth handle the rest of /api/auth/*.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "dg-tracker",
  });

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirectTo", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on all routes except:
     * - _next static assets and image optimization
     * - favicon and any file with an extension (e.g. images, fonts)
     *
     * /api/auth/* IS matched so we can block sign-up; other /api/auth
     * paths are passed through inside the middleware body.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
