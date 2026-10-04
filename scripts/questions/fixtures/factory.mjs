// Synthetic non-clinical test content only. Never use as student content.
export function question(n = 1, area = 'clinica') {
  const id = `MEDHELP-ENAMED-${String(n).padStart(5, '0')}`;
  return {
    editorialId: id, version: 1, area, topic: `Tema fictício ${n}`,
    competency: { code: 'LOCAL:TEST', label: 'Competência fictícia', sourceUrl: 'https://example.org/matrix' },
    careContext: 'Teste', tags: [], stem: `Cenário fictício de validação número ${n}.`, leadIn: `Escolha o símbolo ${n}.`,
    options: ['A', 'B', 'C', 'D'].map((id) => ({ id, text: `Símbolo ${id}` })), answer: 'A',
    rationale: 'Explicação fictícia para teste.', optionRationales: { A: 'Símbolo pedido.', B: 'Outro símbolo.', C: 'Símbolo diferente.', D: 'Símbolo não solicitado.' },
    estimatedDifficulty: 'easy', learningObjective: `Distinguir o símbolo ${n}`,
    references: [{ title: 'Referência fictícia', organization: 'Teste', editionDate: '2026-01-01', url: 'https://example.org/test', evidenceLocation: 'Seção teste', consultedAt: '2026-10-03' }],
    status: 'draft', authorship: { actor: 'Test fixture', kind: 'assisted', recordedAt: '2026-10-03T00:00:00Z' }, checks: [],
  };
}
export function bundle(items = [question()]) { return { schemaVersion: 1, batchId: 'MEDHELP-ENAMED-001', items }; }
export function pilot() {
  const areas = ['clinica', 'cirurgia', 'pediatria', 'go', 'mfc_sc'];
  return bundle(areas.flatMap((area, a) => Array.from({ length: 20 }, (_, i) => {
    const q = question(a * 20 + i + 1, area);
    q.estimatedDifficulty = i < 5 ? 'easy' : i < 15 ? 'medium' : 'hard';
    if (i < 2) q.tags = ['saude_mental'];
    return q;
  })));
}
