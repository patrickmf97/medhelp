import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LessonText } from './lesson-text';

afterEach(cleanup);

describe('formatted lesson text', () => {
  it('preserves table relationships with accessible column headers', () => {
    render(<LessonText formatted text={'| Resultado | Com condição | Sem condição |\n| --- | --- | --- |\n| Positivo | 90 | 90 |\n| Negativo | 10 | 810 |'} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map(x => x.textContent)).toEqual(['Resultado', 'Com condição', 'Sem condição']);
    expect(within(table).getAllByRole('row')[2]?.textContent).toBe('Negativo10810');
    expect(within(table).getByRole('columnheader', { name: 'Com condição' })).toHaveAttribute('scope', 'col');
  });
  it('renders headings, lists, emphasis and reference links', () => {
    render(<LessonText formatted text={'## Referências\n\n- **S1**: *Livro* [fonte](https://example.org/book)\n- Outra fonte\n\n1. Ler\n2. Revisar'} />);
    expect(screen.getByRole('heading', { name: 'Referências' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('S1').tagName).toBe('STRONG');
    expect(screen.getByText('Livro').tagName).toBe('EM');
    expect(screen.getByRole('link', { name: 'fonte' })).toHaveAttribute('href', 'https://example.org/book');
  });
  it('escapes HTML and refuses unsafe links without hiding their text', () => {
    const { container } = render(<LessonText formatted text={'[abrir](javascript:alert(1)) <script>bad()</script> [dados](data:text/html,evil) ![imagem](https://example.org/x)'} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('script, img')).toBeNull();
    expect(container.textContent).toContain('<script>bad()</script>');
    expect(container.textContent).toContain('[abrir](javascript:alert(1))');
  });
  it('keeps old unformatted blocks as plain text', () => {
    render(<LessonText formatted={false} text={'**Objetivo**\n[fonte](https://example.org)'} />);
    expect(screen.getByText('**Objetivo**')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
