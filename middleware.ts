import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Solo aplicar middleware a rutas que empiecen con /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Verificar si hay un usuario en las cookies o headers
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
    } catch (error) {
      // Si la cookie está corrupta, redirigir a login
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
