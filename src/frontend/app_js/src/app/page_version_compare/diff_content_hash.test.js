import { describe, it, expect } from 'vitest';

import { contentHashesDiffer, makeContentHashTiebreakerLine } from './diff_content_hash.js';

describe('diff_content_hash', () => {
  it('detects differing hashes only when both are strings', () => {
    expect(contentHashesDiffer('aaa', 'bbb')).toBe(true);
    expect(contentHashesDiffer('aaa', 'aaa')).toBe(false);
    expect(contentHashesDiffer(undefined, 'bbb')).toBe(false);
    expect(contentHashesDiffer('aaa', undefined)).toBe(false);
    expect(contentHashesDiffer(null, null)).toBe(false);
  });

  it('builds a tiebreaker line that renders as a change', () => {
    const line = makeContentHashTiebreakerLine('left-hash', 'right-hash');

    expect(line.type).toBe('line');
    expect(line.globalIndex).toBe(0);

    expect(line.lhs.lineNum).toBe(null);
    expect(line.lhs.status).toBe('del');
    expect(line.lhs.content).toEqual([{ role: 'del', txt: 'Content hash: left-hash' }]);

    expect(line.rhs.lineNum).toBe(null);
    expect(line.rhs.status).toBe('ins');
    expect(line.rhs.content).toEqual([{ role: 'ins', txt: 'Content hash: right-hash' }]);
  });
});
