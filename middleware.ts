import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value

  // If the token doesn't exist and the path is not login, redirect to login
  if (!token && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If the token exists and the path is login, redirect to dashboard
  if (token && request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // If the token exists and the path is not login, verify the token
  if (token && !request.nextUrl.pathname.startsWith("/login")) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
      const { payload } = await jwtVerify(token, secret)

      // Check if user has admin or administrativo role for admin routes
      const roles = payload.roles as string[]
      const hasAdminAccess = roles.includes("ADMIN") || roles.includes("ADMINISTRATIVO")
      
      if (request.nextUrl.pathname.startsWith("/admin") && !hasAdminAccess) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
      
      // Restrict ADMINISTRATIVO users to only central and reportes
      if (roles.includes("ADMINISTRATIVO") && !roles.includes("ADMIN")) {
        const path = request.nextUrl.pathname
        const allowedPaths = ["/admin/central", "/admin/reportes"]
        const isAllowed = allowedPaths.some(allowedPath => path.startsWith(allowedPath))
        
        if (!isAllowed && path.startsWith("/admin")) {
          return NextResponse.redirect(new URL("/admin/central", request.url))
        }
      }

      // Central routes are now under admin, so this check is no longer needed
      // as admin routes are already protected above
    } catch (error) {
      // If token verification fails, redirect to login
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/admin/:path*",
    "/aulas/:path*",

    "/mis-notas/:path*",
    "/horario/:path*",
  ],
}
