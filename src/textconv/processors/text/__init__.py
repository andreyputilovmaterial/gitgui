import codecs
import sys # for error reporting

from .helper_make_exception_text import unicode_decode_error_make_exception_msg






def consume_all_and_emit_as_chunks(buffer):
    while True:
        chunk = buffer.read()
        if not chunk:
            break
        yield chunk





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

def textconv(file, filename: str):
    """Convert text file bytes to a string, detecting encoding from a BOM.

    Checks the beginning of the byte data for a UTF-8, UTF-16, or UTF-32
    byte-order mark (BOM). If a BOM is found, its corresponding encoding
    is used to decode the data. If no BOM is present, UTF-8 is used.

    The BOM, when present, is excluded from the resulting string.

    Args:
        data: Raw file contents as bytes.
        filename: Original filename. Currently unused by this converter,
            but retained for consistency with the textconv interface.

    Returns:
        The decoded file contents as a string.

    Raises:
        UnicodeDecodeError: If the data cannot be decoded using the
            detected encoding or UTF-8 when no BOM is present.
    """
    # data = file.read()
    decoder = None
    
    txt = ''
    # return data[bom_len:].decode(encoding=encoding,errors='replace')
    for p in consume_all_and_emit_as_chunks(file):
        if not decoder:
            encoding, bom, bom_len = detect_bom(p)
            decoder = codecs.getincrementaldecoder(encoding)(errors='replace')

        try:
            txt += decoder.decode(p,final=False)
        except UnicodeDecodeError as e: # should not happen, as errors=replace; however, we might want it configurable
            try:
                detailed_err_msg = unicode_decode_error_make_exception_msg(e,p,filename,encoding,bom,bom_len)
                print(detailed_err_msg,file=sys.stderr)
            except:
                pass
            raise
    txt += decoder.decode(b'',final=True)
    return txt
