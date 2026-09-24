import { NextResponse } from 'next/server';
import { saveLessonProgress } from '@/lib/study/student-service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin || request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Progresso inválido.' }, { status: 400 });
    const { seconds } = body as Record<string, unknown>;
    await saveLessonProgress({ lessonId: id, seconds: seconds as number, complete: false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 400 });
  }
}
