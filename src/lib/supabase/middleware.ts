import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Rotas protegidas: sem usuário => login
  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/auth");
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && !isPublic && path !== "/agenda" && path !== "/pacientes") {
    const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (perfil?.role === "secretaria") {
      if (path.startsWith("/api/") || path.endsWith("/pdf")) {
        return new NextResponse(null, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/agenda";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return response;
}
