import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session on every matched request and keeps signed-out visitors out of the app.
const PROTECTED = ["/write", "/history", "/api/score"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Cache headers from Supabase stop a CDN from serving one user's session to another.
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  // Nothing may run between creating the client and getClaims(), or sessions drop at random (Supabase docs).
  const { data } = await supabase.auth.getClaims();

  const path = request.nextUrl.pathname;
  if (!data?.claims && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    if (path.startsWith("/api/")) return NextResponse.json({ detail: "Sign in to score a response." }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  // Landing-page buttons point at /signup; someone already signed in goes straight to the app.
  if (data?.claims && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/write";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Keep any token getClaims() just refreshed, or the browser and server sessions drift apart.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  // Everything except static assets, so sessions refresh wherever a signed-in user goes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
