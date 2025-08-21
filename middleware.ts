import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Solo aplicar middleware a rutas que empiecen con /admin o /editor
  if (pathname.startsWith("/admin") || pathname.startsWith("/editor")) {
    // Verificar si hay un usuario en las cookies
    const userCookie = request.cookies.get("user")

    // Si no hay cookie de usuario, redirigir a login
    if (!userCookie) {
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }

    try {
      // Verificar que la cookie contenga datos válidos
      const userData = JSON.parse(userCookie.value)
      if (!userData.id || !userData.email) {
        const loginUrl = new URL("/login", request.url)
        return NextResponse.redirect(loginUrl)
      }

      // Verificar permisos según la ruta
      if (pathname.startsWith("/admin")) {
        // Solo el admin puede acceder a /admin
        if (userData.email !== "admin@admin.com") {
          const editorUrl = new URL("/editor", request.url)
          return NextResponse.redirect(editorUrl)
        }
      } else if (pathname.startsWith("/editor")) {
        // Los editores no pueden acceder si son admin (redirigir a admin)
        if (userData.email === "admin@admin.com") {
          const adminUrl = new URL("/admin", request.url)
          return NextResponse.redirect(adminUrl)
        }
      }
    } catch (error) {
      // Si la cookie está corrupta, redirigir a login
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/editor/:path*"],
}
