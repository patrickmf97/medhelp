import type { ReactNode } from 'react';

function safeLink(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch { return false; }
}

// Deliberately small Markdown subset. Unrecognized markup remains readable text.
// React escapes every text node; raw HTML is never interpreted.
function inline(text: string): ReactNode[] {
  const tokens = /!?\[([^\]\n]+)\]\(([^\s]+?)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  const nodes: ReactNode[] = [];
  let start = 0;
  for (const match of text.matchAll(tokens)) {
    nodes.push(text.slice(start, match.index));
    if (match[1] && match[2] && !match[0].startsWith('!') && safeLink(match[2])) {
      nodes.push(<a key={match.index} href={match[2]} rel="noopener noreferrer">{match[1]}</a>);
    } else if (match[3]) {
      nodes.push(<strong key={match.index}>{match[3]}</strong>);
    } else if (match[4]) {
      nodes.push(<em key={match.index}>{match[4]}</em>);
    } else nodes.push(match[0]);
    start = match.index + match[0].length;
  }
  nodes.push(text.slice(start));
  return nodes;
}

const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
const tableRow = (line: string) => /^\|.+\|\s*$/.test(line);
const separator = (line: string) => tableRow(line) && cells(line).every(cell => /^:?-{3,}:?$/.test(cell));
const listItem = (line: string) => /^(?:[-*] |\d+\. )(.+)$/.exec(line);

export function LessonText({ text, formatted }: { text: string; formatted: boolean }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (!formatted) return <>{lines.map((line, index) => <p key={index}>{line}</p>)}</>;
  const nodes: ReactNode[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!;
    if (!line.trim()) { i++; continue; }
    const key = i;
    if (tableRow(line) && separator(lines[i + 1] ?? '') && cells(line).length === cells(lines[i + 1]!).length) {
      const headers = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && tableRow(lines[i]!) && cells(lines[i]!).length === headers.length) rows.push(cells(lines[i++]!));
      nodes.push(<div key={key} className="student-table-scroll" role="region" aria-label="Tabela da aula" tabIndex={0} style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <table><thead><tr>{headers.map((header, index) => <th scope="col" key={index}>{inline(header)}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{inline(cell)}</td>)}</tr>)}</tbody>
        </table>
      </div>);
      continue;
    }
    const heading = /^(#{1,6}) (.+)$/.exec(line);
    if (heading) {
      const Tag = `h${Math.max(2, heading[1]!.length)}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      nodes.push(<Tag key={key}>{inline(heading[2]!)}</Tag>);
      i++; continue;
    }
    if (listItem(line)) {
      const ordered = /^\d+\./.test(line);
      const Tag = ordered ? 'ol' : 'ul';
      const items: ReactNode[] = [];
      while (i < lines.length && listItem(lines[i]!) && /^\d+\./.test(lines[i]!) === ordered) {
        items.push(<li key={i}>{inline(listItem(lines[i++]!)![1]!)}</li>);
      }
      nodes.push(<Tag key={key}>{items}</Tag>);
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i]!.trim() && !/^#{1,6} /.test(lines[i]!) && !listItem(lines[i]!) && !tableRow(lines[i]!)) paragraph.push(lines[i++]!);
    nodes.push(<p key={key}>{inline(paragraph.join('\n'))}</p>);
  }
  return <>{nodes}</>;
}
