import { NextResponse, type NextRequest } from "next/server";
import { CASHIER_SESSION_COOKIE, verifySessionToken } from "./lib/session";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  const session = await verifySessionToken(request.cookies.get(CASHIER_SESSION_COOKIE)?.value);

  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
