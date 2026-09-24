import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const templates = resolve(process.cwd(), '../../supabase/templates');

describe('MEDHELP authentication email templates', () => {
  it.each([
    ['confirmation', 'Confirmar meu e-mail'],
    ['recovery', 'Redefinir minha senha'],
  ])('%s has a clear Portuguese action and a working Supabase link', (name, action) => {
    const html = readFileSync(resolve(templates, `${name}.html`), 'utf8');
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('MEDHELP');
    expect(html).toContain(action);
    expect(html).toContain('href="{{ .ConfirmationURL }}"');
    expect(html).toContain('Se você não solicitou');
    expect(html).not.toMatch(/powered by Supabase|Confirm your email address/);
  });
});
