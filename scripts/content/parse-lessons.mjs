import { normalize } from './contracts.mjs';

// Only level-two lesson sections are imported. Shared bibliography is explicit;
// quizzes and flashcards outside the lesson never become student lesson blocks.
export function parseLesson(markdown, lesson) {
  const text = normalize(markdown);
  const headings = [...text.matchAll(/^## (.+)$/gm)];
  const sections = headings.map((match, index) => ({
    title: match[1],
    body: text.slice(match.index + match[0].length, headings[index + 1]?.index ?? text.length).trim(),
  }));
  const key = lesson.secao_original ?? lesson.id;
  const matches = sections.filter(s => s.title === key || s.title.startsWith(`${key} · `) || s.title.startsWith(`${key} — `));
  if (matches.length !== 1) throw new Error(`Missing or duplicate section: ${lesson.id}`);
  if (!matches[0].body || !matches[0].body.replace(/^#{1,6} .*$/gm, '').trim()) throw new Error(`Empty lesson: ${lesson.id}`);
  const references = sections.filter(s => /^(Fontes(?: e extensão da consulta)?|Referências(?: de verificação)?)$/.test(s.title));
  const body = [matches[0].body, ...references.map(s => `## ${s.title}\n\n${s.body}`)].join('\n\n');
  return [{ block_type: 'rich_text', content: { text: body, format: 'medhelp-markdown-v1' }, position: 0 }];
}
