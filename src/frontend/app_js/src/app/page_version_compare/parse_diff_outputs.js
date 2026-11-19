
// Parses the combined output of
//   git diff --raw -z --stat --no-abbrev -M <args>
// into:
//   - `records`: the --raw entries (same shape the version-compare page uses)
//   - `statLines`: the trailing --stat section, split into lines.
//
// `git diff` emits the --raw section first (NUL-separated) and then the
// --stat section (newline-separated, no NULs), so we can parse the raw
// entries from the front and treat everything after them as the stat text.

const HEADER_COLON = 0x3a; // ':'

function splitBytes(bytes, separator) {
  const result = [];
  let start = 0;

  for (let i = 0; i <= bytes.length; i++) {
    if (i === bytes.length || bytes[i] === separator) {
      result.push(bytes.subarray(start, i));
      start = i + 1;
    }
  }

  return result;
}

function splitWhitespace(bytes) {
  const decoder = new TextDecoder();
  return decoder.decode(bytes).trim().split(/\s+/);
}

export function parseDiffOutputs(data) {
  const decoder = new TextDecoder();

  const parts = splitBytes(data, 0);
  const records = [];

  let i = 0;

  // Parse the --raw entries. A raw header always starts with ':'; the first
  // non-header part marks the start of the --stat section (which uses newlines
  // and therefore lands here as a single trailing part).
  while (i < parts.length) {
    const headerBytes = parts[i];

    if (headerBytes.length === 0 || headerBytes[0] !== HEADER_COLON) {
      break;
    }

    i++;

    const fields = splitWhitespace(headerBytes);

    const old_mode = fields[0].substring(1);
    const new_mode = fields[1];
    const old_oid = fields[2];
    const new_oid = fields[3];
    const status = fields[4];

    // R = rename, C = copy; both have two paths.
    const isRenameOrCopy =
      status.startsWith('R') || status.startsWith('C');

    if (isRenameOrCopy) {
      const old_path = decoder.decode(parts[i++]);
      const new_path = decoder.decode(parts[i++]);

      records.push({
        old_mode,
        new_mode,
        old_oid,
        new_oid,
        status,
        old_path,
        new_path,
        path: new_path,
      });
    } else {
      const path = decoder.decode(parts[i++]);

      records.push({
        old_mode,
        new_mode,
        old_oid,
        new_oid,
        status,
        path,
      });
    }
  }

  // Everything after the raw entries is the --stat section. It contains no
  // NUL bytes, so normally it is exactly one part; concatenate to be safe.
  let statLength = 0;
  for (let k = i; k < parts.length; k++) {
    statLength += parts[k].length;
  }
  const statBytes = new Uint8Array(statLength);
  let offset = 0;
  for (let k = i; k < parts.length; k++) {
    statBytes.set(parts[k], offset);
    offset += parts[k].length;
  }

  const statLines = decoder
    .decode(statBytes)
    .split('\n')
    .filter(line => line.length > 0);

  return { records, statLines };
}

// Splits a single --stat line into segments suitable for rendering with
// per-character coloring: '+' characters become green "add" segments and '-'
// characters become red "del" segments. The `-` inside a binary line's
// `->` ("Bin 0 -> 12 bytes") is left uncolored, and only the count/bar part
// (after the last " | ") is colored, so a '+'/'-' inside a file name is not
// touched. The summary line has no " | " and is colored in full.
export function splitStatLineForColoring(line) {
  const segments = [];

  const separatorIndex = line.lastIndexOf(' | ');
  const pathPart = separatorIndex === -1 ? null : line.slice(0, separatorIndex);
  const countPart = separatorIndex === -1 ? line : line.slice(separatorIndex);

  if (pathPart !== null) {
    segments.push({ txt: pathPart, cls: null });
  }

  pushColorizedSegments(countPart, segments);

  return segments;
}

function pushColorizedSegments(text, segments) {
  let current = '';

  const flush = () => {
    if (current.length > 0) {
      segments.push({ txt: current, cls: null });
      current = '';
    }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '+') {
      flush();
      segments.push({ txt: '+', cls: 'mdm-git-gui-historydiff-stat-add' });
    } else if (ch === '-' && next === '>') {
      // "->" arrow in a "Bin 0 -> 12 bytes" binary line.
      current += ch;
    } else if (ch === '-') {
      flush();
      segments.push({ txt: '-', cls: 'mdm-git-gui-historydiff-stat-del' });
    } else {
      current += ch;
    }
  }

  flush();
}
