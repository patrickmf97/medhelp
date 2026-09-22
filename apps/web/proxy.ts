import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const { authenticated, response } = await updateSession(request);
  const protectedRoute = request.nextUrl.pathname.startsWith('/aluno') || request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/editor');

  if (protectedRoute && !authenticated) {
    const login = new URL('/entrar', request.url);
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = { matcher: ['/aluno/:path*', '/admin/:path*', '/editor/:path*', '/auth/callback'] };
