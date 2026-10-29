import { describe, it, expect } from 'vitest';
import { normaliseMarkdown } from '@/components/chemtrace/Markdown';
describe('normaliseMarkdown', () => {
  it('converts \\[ \\] display maths to $$ blocks', () => {
    expect(normaliseMarkdown('\\[ \\text{A} \\]')).toContain('$$\n\\text{A}\n$$');
  });
  it('converts bare [ \\text ] blocks to $$', () => {
    expect(normaliseMarkdown('[ \\text{Acyl-Cl} + B ]')).toContain('$$');
  });
  it('splits table rows glued on one line', () => {
    expect(normaliseMarkdown('| A | B | |---|---| | x | y |').split('\n').length).toBe(3);
  });
});
