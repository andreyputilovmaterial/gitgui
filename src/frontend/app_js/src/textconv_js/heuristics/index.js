

// A classic approach is to examine a sample and calculate the proportion of bytes that are printable text or common whitespace.

// Something along these lines:
//
// textish = bytes in:
//     0x20..0x7E
//     0x09 (TAB)
//     0x0A (LF)
//     0x0D (CR)
//     optionally other accepted Unicode/encoding bytes
//
//
// binaryish = control characters + suspicious patterns
//
// Then use a threshold, e.g.:
//
// > 95% textish     → very likely text
// 80–95%            → probably text
// 50–80%            → uncertain
// < 50%             → probably binary
//
// But I'd combine this with UTF-8 validation rather than treating it independently.
//
// I'd actually implement it as confidence scoring
//
// Something like:
//
// +100  known text extension
// +100  recognized BOM
// +80   valid UTF-8 over substantial content
// +30   mostly printable/whitespace
// +20   high proportion of ASCII
// -100  known binary extension
// -80   lots of NULs (after UTF-16/32 handling)
// -50   lots of non-whitespace control characters
// -30   suspicious binary signatures
//
// Then:
//
// score >= 70  => text
// score <= 0   => binary
// otherwise    => unknown




// const detectExtension = filename => {
//   const name = filename.split(/[\\/]/).pop();
//   const dot = name.lastIndexOf('.');
//   return dot > 0 ? name.slice(dot).toLowerCase() : '';
// };



function doesBufferIncludeZeroByte(bytes) {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

const textExtensions = [ '.txt', '.log', ];


const BOM_UTF8    = new Uint8Array([0xEF, 0xBB, 0xBF]);
const BOM_UTF16LE = new Uint8Array([0xFF, 0xFE]);
const BOM_UTF16BE = new Uint8Array([0xFE, 0xFF]);
const BOM_UTF32LE = new Uint8Array([0xFF, 0xFE, 0x00, 0x00]);
const BOM_UTF32BE = new Uint8Array([0x00, 0x00, 0xFE, 0xFF]);

function startsWithBytes(data, prefix) {
    if (data.length < prefix.length) return false;

    for (let i = 0; i < prefix.length; i++) {
        if (data[i] !== prefix[i]) return false;
    }
    return true;
}

function detectBom(data) {
    // Check UTF-32 before UTF-16 because UTF-32 LE starts with
    // the same two bytes as UTF-16 LE.
    const candidates = [
        ["utf-32-le", BOM_UTF32LE],
        ["utf-32-be", BOM_UTF32BE],
        ["utf-8",     BOM_UTF8],
        ["utf-16-le", BOM_UTF16LE],
        ["utf-16-be", BOM_UTF16BE],
    ];

    for (const [encoding, bom] of candidates) {
        if (startsWithBytes(data, bom)) {
            return {
                encoding,
                bom,
                bomLength: bom.length,
            };
        }
    }

    return {
        encoding: null,
        bom: null,
        bomLength: 0,
    };
}





function detect(fileData,filename) {
  const { encoding, bom, bomLength } = detectBom(fileData);
  if( bom ) {
    let decoderBom;
    switch (encoding) {
        case "utf-8":
            decoderBom = new TextDecoder("utf-8", { fatal: true });
            break;
        case "utf-16-le":
            decoderBom = new TextDecoder("utf-16le", { fatal: true });
            break;
        case "utf-16-be":
            decoderBom = new TextDecoder("utf-16be", { fatal: true });
            break;
        default:
            decoderBom = new TextDecoder("utf-8", { fatal: true });
            break;
    }
    try {
      decoderBom.decode(bytes);
      return 'text';
    } catch(e) {
      return 'binary';
    }
  };
  if( doesBufferIncludeZeroByte(fileData) )
    return 'binary';
  const decoderUtf8 = new TextDecoder("utf-8", { fatal: true });
  try {
    decoderUtf8.decode(fileData);
    return 'text';
  } catch(e) {
    return 'binary';
  }

}

export default detect;
