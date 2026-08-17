



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



const textconv = bytes => {

  const { encoding } = detectBom(bytes);

  let decoder;

  switch (encoding) {
      case "utf-8":
          decoder = new TextDecoder("utf-8");
          break;

      case "utf-16-le":
          decoder = new TextDecoder("utf-16le");
          break;

      case "utf-16-be":
          decoder = new TextDecoder("utf-16be");
          break;

      default:
          decoder = new TextDecoder("utf-8");
          break;
  }

  const text = decoder.decode(bytes);

  return  text;

}

export default textconv;
