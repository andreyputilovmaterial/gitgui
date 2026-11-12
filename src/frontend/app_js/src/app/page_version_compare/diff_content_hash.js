
// Helpers for the "identical converted text but different bytes" case in the
// diff view. textconv embeds a `hash:` header (SHA-256 of the source bytes);
// when two files convert to the exact same text but their content hashes
// differ, the diff must still show a difference. See docs/textconv.md.

export function contentHashesDiffer(leftHash, rightHash) {
  return (
    typeof leftHash === 'string' &&
    typeof rightHash === 'string' &&
    leftHash !== rightHash
  );
}

export function makeContentHashTiebreakerLine(leftHash, rightHash) {
  return {
    type: 'line',
    lhs: {
      lineNum: null,
      status: 'del',
      content: [{ role: 'del', txt: `Content hash: ${leftHash}` }],
    },
    rhs: {
      lineNum: null,
      status: 'ins',
      content: [{ role: 'ins', txt: `Content hash: ${rightHash}` }],
    },
    globalIndex: 0,
  };
}

