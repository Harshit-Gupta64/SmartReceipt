import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/'])

const EIGHT_HOURS = 8 * 60 * 60 * 1000 // 8 hours in milliseconds
// const EIGHT_HOURS = 10 * 1000 // 10 seconds for testing

export const proxy = clerkMiddleware(async (auth, request) => {
  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // Protect the route
  await auth.protect()

  const response = NextResponse.next()
  const now = Date.now()

  // Get last activity cookie
  const lastActivity = request.cookies.get('last_activity')?.value

  if (lastActivity) {
    const lastTime = parseInt(lastActivity)
    const timeDiff = now - lastTime

    // If inactive for more than 8 hours, clear session cookie and redirect to home
    if (timeDiff > EIGHT_HOURS) {
      const redirectResponse = NextResponse.redirect(new URL('/', request.url))
      redirectResponse.cookies.delete('last_activity')
      redirectResponse.cookies.delete('__session')
      return redirectResponse
    }
  }

  // Update last activity cookie
  response.cookies.set('last_activity', now.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: EIGHT_HOURS / 1000, // in seconds
    path: '/',
  })

  return response
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}