import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/api/cron') return NextResponse.next();
  const username = process.env.APP_USERNAME;
  const password = process.env.APP_PASSWORD;
  if (!username || !password) {
    if (process.env.NODE_ENV === 'production') return new NextResponse('Set APP_USERNAME and APP_PASSWORD to secure your personal workspace before running in production.', { status: 503 });
    return NextResponse.next();
  }
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Basic ')) {
    try {
      const decoded = atob(authorization.slice(6));
      const separator = decoded.indexOf(':');
      if (decoded.slice(0, separator) === username && decoded.slice(separator + 1) === password) return NextResponse.next();
    } catch {}
  }
  return new NextResponse('Sign in to your personal workspace.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="PulseRemind", charset="UTF-8"' } });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
