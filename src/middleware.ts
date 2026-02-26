import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org";
const PROTECTED_PREFIXES = ["/admin", "/facilitator", "/learn", "/superadmin"];

function getSubdomain(hostname: string): string | null {
  // Development: gracechurch.localhost or gracechurch.localhost:3000
  if (hostname.endsWith(".localhost") || hostname.includes(".localhost:")) {
    const part = hostname.split(".")[0];
    return part && part !== "www" ? part : null;
  }
  // Production: gracechurch.kyston.org
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    return sub && sub !== "www" ? sub : null;
  }
  return null;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const subdomain = getSubdomain(hostname);
  const pathname = request.nextUrl.pathname;

  const requestHeaders = new Headers(request.headers);

  // No subdomain or www → root domain; only home, login, register, app routes, API, and auth are allowed (external/marketing pages redirect to home)
  if (!subdomain) {
    const allowedOnRoot =
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/facilitator") ||
      pathname.startsWith("/learn") ||
      pathname.startsWith("/superadmin");
    if (!allowedOnRoot) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const { response } = await runSupabaseAuth(request, requestHeaders);
    return response;
  }

  // superadmin subdomain → no church, serve /superadmin
  if (subdomain === "superadmin") {
    const { response, user } = await runSupabaseAuth(request, requestHeaders);
    if (response.status === 307 || response.status === 302) return response;
    if (isProtectedPath(pathname) && !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Tenant subdomain: resolve church
  const church = await getChurchBySubdomain(subdomain);
  if (!church) {
    return NextResponse.redirect(new URL("https://" + APP_DOMAIN));
  }

  requestHeaders.set("x-church-id", church.id);
  requestHeaders.set("x-church-subdomain", church.subdomain);

  const requestWithTenant = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });

  const { response, user } = await runSupabaseAuth(requestWithTenant, requestHeaders);
  if (response.status === 307 || response.status === 302) return response;

  if (isProtectedPath(pathname) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

async function getChurchBySubdomain(subdomain: string): Promise<{ id: string; subdomain: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/churches?subdomain=eq.${encodeURIComponent(subdomain)}&is_active=eq.true&select=id,subdomain`,
    {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

const SESSION_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh if expiring within 5 minutes

async function runSupabaseAuth(
  request: NextRequest,
  requestHeaders: Headers
): Promise<{ response: NextResponse; user: { id: string } | null }> {
  const nextRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });
  const response = NextResponse.next({
    request: nextRequest,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...(options as object), path: "/" })
          );
        },
      },
    }
  );

  // Refresh session when expired or expiring soon so the session persists across requests
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.refresh_token) {
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    if (!expiresAt || expiresAt - now < SESSION_REFRESH_BUFFER_MS) {
      await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
