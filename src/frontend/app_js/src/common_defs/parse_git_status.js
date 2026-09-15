const utf8Decoder = new TextDecoder("utf-8");

/**
 * Parse:
 *
 *     git status --porcelain=v2 -z
 *
 * directly from a Uint8Array.
 *
 * Returns normalized objects:
 *
 *   {
 *     type: "ordinary",
 *     index: "M",
 *     worktree: ".",
 *     submodule: "N...",
 *     path: "foo/bar.js",
 *     ...
 *   }
 *
 *   {
 *     type: "untracked",
 *     path: "foo/bar.js"
 *   }
 *
 *   {
 *     type: "renamed" | "copied",
 *     ...
 *   }
 *
 *   {
 *     type: "unmerged",
 *     ...
 *   }
 */
export default  function parseGitStatus(data) {
    const result = [];

    let pos = 0;

    while (pos < data.length) {
        // Empty record (e.g. trailing NUL).
        if (data[pos] === 0) {
            pos++;
            continue;
        }

        const recordStart = pos;

        // Find the first NUL.
        while (pos < data.length && data[pos] !== 0) {
            pos++;
        }

        const record = data.subarray(recordStart, pos);

        if (record.length === 0) {
            pos++;
            continue;
        }

        const type = record[0];

        // For rename/copy records, -z adds the original path
        // as another NUL-terminated field.
        if (type === CHAR_2) {
            pos++; // skip NUL

            const originalStart = pos;

            while (pos < data.length && data[pos] !== 0) {
                pos++;
            }

            const originalPath = data.subarray(originalStart, pos);

            result.push(parseRenamedRecord(record, originalPath));
        } else {
            result.push(parseRecord(record));
        }

        // Skip NUL.
        if (pos < data.length) {
            pos++;
        }
    }

    return result;
}


/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const CHAR_1 = 0x31; // '1'
const CHAR_2 = 0x32; // '2'
const CHAR_U = 0x75; // 'u'
const CHAR_Q = 0x3f; // '?'
const CHAR_BANG = 0x21; // '!'


/* -------------------------------------------------------------------------- */
/* Individual record parsing                                                  */
/* -------------------------------------------------------------------------- */

function parseRecord(record) {
    switch (record[0]) {
        case CHAR_1:
            return parseOrdinaryRecord(record);

        case CHAR_U:
            return parseUnmergedRecord(record);

        case CHAR_Q:
            return {
                type: "untracked",
                path: decodeFrom(record, 2),
            };

        case CHAR_BANG:
            return {
                type: "ignored",
                path: decodeFrom(record, 2),
            };

        default:
            throw new Error(
                `Unknown git status record type: ${record[0]}`
            );
    }
}




function takeField(bytes, pos) {
    const start = pos;

    while (pos < bytes.length && bytes[pos] !== 0x20) {
        pos++;
    }

    return {
        value: bytes.subarray(start, pos),
        next: pos < bytes.length ? pos + 1 : pos,
    };
}

// function takeRemaining(bytes, pos) {
//     return bytes.subarray(pos);
// }




/**
 * Ordinary changed entry:
 *
 * 1 XY sub mH mI mW hH hI path
 */
function parseOrdinaryRecord(record) {

    let pos = 0;
    let field;

    /*
     * fields:
     *
     * 0 = "1"
     * 1 = XY
     * 2 = sub
     * 3 = mH
     * 4 = mI
     * 5 = mW
     * 6 = hH
     * 7 = hI
     * 8 = path
     */

    field = takeField(record, pos);
    const type = decodeUtf8(field.value);
    pos = field.next;

    // if (fields.length < 9) {
    //     throw new Error(
    //         `Malformed ordinary git status record: ${decodeUtf8(record)}`
    //     );
    // }

    field = takeField(record, pos);
    const xy = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const submodule = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const headMode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const indexMode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const worktreeMode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const headObject = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const indexObject = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const path = decodeUtf8(field.value);
    pos = field.next;

    return {
        type: "ordinary",

        index: xy[0],
        worktree: xy[1],

        xy,

        submodule: parseSubmoduleInfo(submodule),

        headMode,
        indexMode,
        worktreeMode,

        headObject,
        indexObject,

        path,
    };
}


/**
 * Rename/copy entry:
 *
 * 2 XY sub mH mI mW hH hI Xscore path
 *
 * In -z mode:
 *
 * 2 ... path\0originalPath\0
 */
function parseRenamedRecord(record, originalPath) {

    let pos = 0;
    let field;

    /*
     * fields:
     *
     * 0 = "2"
     * 1 = XY
     * 2 = sub
     * 3 = mH
     * 4 = mI
     * 5 = mW
     * 6 = hH
     * 7 = hI
     * 8 = Xscore
     * 9 = path
     */

    field = takeField(record, pos);
    const type = decodeUtf8(field.value);
    pos = field.next;

    // if (fields.length < 10) {
    //     throw new Error(
    //         `Malformed rename/copy git status record: ${decodeUtf8(record)}`
    //     );
    // }

    field = takeField(record, pos);
    const xy = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const submodule = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const headMode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const indexMode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const worktreeMode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const headObject = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const indexObject = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const score = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const path = decodeUtf8(field.value);
    pos = field.next;

    return {
        type:
            type === "R"
                ? "renamed"
                : type === "C"
                    ? "copied"
                    : "rename-or-copy",

        index: xy[0],
        worktree: xy[1],

        xy,

        submodule: parseSubmoduleInfo(submodule),

        headMode,
        indexMode,
        worktreeMode,

        headObject,
        indexObject,

        score,

        path,
        originalPath: decodeUtf8(originalPath),
    };
}


/**
 * Unmerged entry:
 *
 * u XY sub m1 m2 m3 mW h1 h2 h3 path
 */
function parseUnmergedRecord(record) {

    let pos = 0;
    let field;

    /*
     * fields:
     *
     * 0  = "u"
     * 1  = XY
     * 2  = sub
     * 3  = m1
     * 4  = m2
     * 5  = m3
     * 6  = mW
     * 7  = h1
     * 8  = h2
     * 9  = h3
     * 10 = path
     */

    field = takeField(record, pos);
    const type = decodeUtf8(field.value);
    pos = field.next;

    // if (fields.length < 11) {
    //     throw new Error(
    //         `Malformed unmerged git status record: ${decodeUtf8(record)}`
    //     );
    // }

    field = takeField(record, pos);
    const xy = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const submodule = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const stage1Mode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const stage2Mode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const stage3Mode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const worktreeMode = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const stage1Object = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const stage2Object = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const stage3Object = decodeUtf8(field.value);
    pos = field.next;

    field = takeField(record, pos);
    const path = decodeUtf8(field.value);
    pos = field.next;

    return {
        type: "unmerged",

        index: xy[0],
        worktree: xy[1],

        xy,

        submodule: parseSubmoduleInfo(submodule),

        stage1Mode,
        stage2Mode,
        stage3Mode,
        worktreeMode,

        stage1Object,
        stage2Object,
        stage3Object,

        path,
    };
}


/**
 * Decode one byte slice.
 */
function decodeUtf8(bytes) {
    return utf8Decoder.decode(bytes);
}


/**
 * Decode bytes starting at a specific byte offset.
 */
function decodeFrom(bytes, offset) {
    return decodeUtf8(bytes.subarray(offset));
}




function parseSubmoduleInfo(fourCharField) {
    if( fourCharField.length!==4 )
        throw new Error(
            `Malformed git status record: reading "submodule" field: "${fourCharField}"`
        );
    const type = fourCharField[0];
    const c = fourCharField[1];
    const m = fourCharField[2];
    const u = fourCharField[3];
    let kind;
    if( type==='N' )
        kind = 'normal';
    else if( type==='S' )
        kind = 'submodule'
    else
        throw new Error(
            `Malformed git status record: reading "submodule" field: "${fourCharField}"`
        );
    return {
        kind,
        isSubmodule: kind==='submodule',
        c,
        m,
        u,
    };
}