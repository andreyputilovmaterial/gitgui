
import { describe, it, expect } from 'vitest';

import { parseDiffOutputs, splitStatLineForColoring } from './parse_diff_outputs.js';

const encoder = new TextEncoder();

const ZERO40 = '0'.repeat(40);
const ONE40 = '1'.repeat(40);

function rawEntryString({ oldMode = '100644', newMode = '100644', oldOid = ZERO40, newOid = ONE40, status = 'M', paths }) {
  let s = `:${oldMode} ${newMode} ${oldOid} ${newOid} ${status}\0`;
  for (const p of paths) {
    s += `${p}\0`;
  }
  return s;
}

function makeCombinedBytes(entryStrings, statText) {
  return encoder.encode(entryStrings.join('') + statText);
}

describe('parseDiffOutputs', () => {
  it('parses raw records and the trailing --stat lines', () => {
    const bytes = makeCombinedBytes(
      [
        rawEntryString({ status: 'M', paths: ['f.txt'] }),
        rawEntryString({ status: 'M', paths: ['g.txt'] }),
      ],
      ' f.txt | 3 ++-\n g.txt | 1 +\n 2 files changed, 3 insertions(+), 1 deletion(-)\n',
    );

    const { records, statLines } = parseDiffOutputs(bytes);

    expect(records).toEqual([
      { old_mode: '100644', new_mode: '100644', old_oid: ZERO40, new_oid: ONE40, status: 'M', path: 'f.txt' },
      { old_mode: '100644', new_mode: '100644', old_oid: ZERO40, new_oid: ONE40, status: 'M', path: 'g.txt' },
    ]);

    expect(statLines).toEqual([
      ' f.txt | 3 ++-',
      ' g.txt | 1 +',
      ' 2 files changed, 3 insertions(+), 1 deletion(-)',
    ]);
  });

  it('parses renames (two paths) and keeps the rename stat line', () => {
    const bytes = makeCombinedBytes(
      [ rawEntryString({ status: 'R100', paths: ['old.txt', 'new.txt'] }) ],
      ' old.txt => new.txt | 0\n 1 file changed, 0 insertions(+), 0 deletions(-)\n',
    );

    const { records, statLines } = parseDiffOutputs(bytes);

    expect(records).toEqual([
      {
        old_mode: '100644',
        new_mode: '100644',
        old_oid: ZERO40,
        new_oid: ONE40,
        status: 'R100',
        old_path: 'old.txt',
        new_path: 'new.txt',
        path: 'new.txt',
      },
    ]);

    expect(statLines).toEqual([
      ' old.txt => new.txt | 0',
      ' 1 file changed, 0 insertions(+), 0 deletions(-)',
    ]);
  });

  it('returns empty records and statLines for empty input', () => {
    const { records, statLines } = parseDiffOutputs(new Uint8Array([]));

    expect(records).toEqual([]);
    expect(statLines).toEqual([]);
  });
});

describe('splitStatLineForColoring', () => {
  it('colors +/- only in the count/bar part, leaving the path intact', () => {
    const segments = splitStatLineForColoring(' a+b-c.txt | 3 ++-');

    expect(segments).toEqual([
      { txt: ' a+b-c.txt', cls: null },
      { txt: ' | 3 ', cls: null },
      { txt: '+', cls: 'mdm-git-gui-historydiff-stat-add' },
      { txt: '+', cls: 'mdm-git-gui-historydiff-stat-add' },
      { txt: '-', cls: 'mdm-git-gui-historydiff-stat-del' },
    ]);
  });

  it('does not color the arrow in a binary "Bin X -> Y bytes" line', () => {
    const segments = splitStatLineForColoring(' bin.dat | Bin 0 -> 12 bytes');

    expect(segments).toEqual([
      { txt: ' bin.dat', cls: null },
      { txt: ' | Bin 0 -> 12 bytes', cls: null },
    ]);
  });

  it('colors the summary line in full', () => {
    const segments = splitStatLineForColoring(' 2 files changed, 3 insertions(+), 1 deletion(-)');

    expect(segments).toEqual([
      { txt: ' 2 files changed, 3 insertions(', cls: null },
      { txt: '+', cls: 'mdm-git-gui-historydiff-stat-add' },
      { txt: '), 1 deletion(', cls: null },
      { txt: '-', cls: 'mdm-git-gui-historydiff-stat-del' },
      { txt: ')', cls: null },
    ]);
  });
});
