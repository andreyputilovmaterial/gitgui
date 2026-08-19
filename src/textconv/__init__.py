
from pathlib import Path

from .detect_type import detect_type as detect_type_heuristics
from .processors import processors, matches


MAX_FILE_SIZE_LIMIT_BYTES = 64*1000*1000


def textconv(data: bytes,filename: str):
    fsize = len(data)
    if fsize==0:
        return ''
    if fsize > MAX_FILE_SIZE_LIMIT_BYTES:
        return 'TEXTCONV: file too big to display'

    type = None
    extension = Path(filename).suffix
    for (extensions,t) in matches:
        if extension in extensions:
            type = t
    if not type:
        type = detect_type_heuristics(data[:5000],filename)
    processor = processors.get(type,None)
    if not processor:
        raise Exception(f'textconv: fatal: no associated processor for type {ftype} - it should not be possible, the conversion should always fall back to "text" or "binary" but not leave something unrecognized')
    return processor(data,filename)
