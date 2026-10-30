import { NextResponse, type NextRequest } from "next/server";

// Basic Auth på /intrum når ADMIN_PASSWORD er satt (brukernavn: admin)
export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.next();
  const [scheme, encoded] = (req.headers.get("authorization") ?? "").split(" ");
  if (scheme === "Basic" && encoded && atob(encoded) === `admin:${password}`) return NextResponse.next();
  return new NextResponse("Krever innlogging", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Intrum admin"' } });
}

export const config = { matcher: ["/intrum", "/intrum/:path*", "/api/intrum/:path*"] };
