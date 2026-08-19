
from pathlib import Path
import codecs

# // A classic approach is to examine a sample and calculate the proportion of bytes that are printable text or common whitespace.
#
# // Something along these lines:
# //
# // textish = bytes in:
# //     0x20..0x7E
# //     0x09 (TAB)
# //     0x0A (LF)
# //     0x0D (CR)
# //     optionally other accepted Unicode/encoding bytes
# //
# //
# // binaryish = control characters + suspicious patterns
# //
# // Then use a threshold, e.g.:
# //
# // > 95% textish     → very likely text
# // 80–95%            → probably text
# // 50–80%            → uncertain
# // < 50%             → probably binary
# //
# // But I'd combine this with UTF-8 validation rather than treating it independently.
# //
# // I'd actually implement it as confidence scoring
# //
# // Something like:
# //
# // +100  known text extension
# // +100  recognized BOM
# // +80   valid UTF-8 over substantial content
# // +30   mostly printable/whitespace
# // +20   high proportion of ASCII
# // -100  known binary extension
# // -80   lots of NULs (after UTF-16/32 handling)
# // -50   lots of non-whitespace control characters
# // -30   suspicious binary signatures
# //
# // Then:
# //
# // score >= 70  => text
# // score <= 0   => binary
# // otherwise    => unknown




# def detect_extension(filename):
#   return Path(filename).suffix
# };



def does_buffer_include_zero_byte(bytes):
  return b'0' in bytes


def detect_bom(data):
    bom = None
    bom_len = 0

    starting_bytes = data[:4]

    for candidate in (
        codecs.BOM_UTF32_LE,
        codecs.BOM_UTF32_BE,
        codecs.BOM_UTF8,
        codecs.BOM_UTF16_LE,
        codecs.BOM_UTF16_BE,
    ):
        if starting_bytes.startswith(candidate):
            bom = candidate
            bom_len = len(bom)
            break

    encoding = None
    if bom == codecs.BOM_UTF8:
        encoding = 'utf-8'
    elif bom == codecs.BOM_UTF16_LE:
        encoding = 'utf-16-le'
    elif bom == codecs.BOM_UTF16_BE:
        encoding = 'utf-16-be'
    elif bom == codecs.BOM_UTF32_LE:
        encoding = 'utf-32-le'
    elif bom == codecs.BOM_UTF32_BE:
        encoding = 'utf-32-be'
    else:
        encoding = 'utf-8'
    return encoding, bom, bom_len




def detect_type(data, filename):
    encoding, bom, bom_len = detect_bom(data)

    if bom:
        try:
            data[bom_len:].decode(encoding=encoding, errors='strict')
            return 'text'
        except UnicodeDecodeError:
            return 'binary'

    if does_buffer_include_zero_byte(data):
        return 'binary'

    try:
        data.decode(encoding='utf-8', errors='strict')
        return 'text'
    except UnicodeDecodeError:
        return 'binary'
