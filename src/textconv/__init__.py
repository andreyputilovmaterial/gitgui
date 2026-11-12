
from pathlib import Path
from io import BytesIO, StringIO
import re
import hashlib
import sys # to print exception to stderr

from typing import Protocol

from .detect_type import detect_type as detect_type_heuristics
from .processors import processors, matches
from .helper_functions import clean_filename_from_hash
from .config import (
    MAX_FILE_SIZE_LIMIT_BYTES,
    SAMPLE_SIZE_BYTES,
)
from .helper_log_errors import (
    make_exception_text,
)




# FileLikeObject = NewType("FileLikeObject", Any)
class FileLikeObject(Protocol):
    def read(self, size: int = -1) -> bytes:
        ...



def make_header(s,newline=False,safe=True):
    if not isinstance(s,str):
        raise ValueError(f'TEXTCONV: add headers: header must be a string with printable ascii without control characters and without newlines: {repr(s)}')
    if safe:
        if not re.match(r'^[\x20-\x7E]*$',s):
            raise ValueError(f'TEXTCONV: add headers: header must be a string with printable ascii without control characters and without newlines: {repr(s)}')
        if '\n' in s or '\r' in s:
            raise ValueError(f'TEXTCONV: add headers: header must be a string with printable ascii without control characters and without newlines: {repr(s)}')
    br = '\n' if newline else ''
    return f'###__TEXTCONV_108efe33_8af42f10_b98a_4b9b_b0b3_f66714dbf247: {s}{br}'



class TextconvDataTooBig(Exception):
    """To be raised on file too big"""


class StreamingProxy:
    def __init__(self, source: FileLikeObject, buffer_for_headers: StringIO) -> FileLikeObject:
        self.source = source
        self.buffer_for_headers = buffer_for_headers
        self.size = 0
        self.hasher = hashlib.sha256()
        self._is_in_context = False
        # The bounded sample is read lazily in __enter__ (not here) so that
        # constructing the proxy can never fail. An error reading the sample
        # still leaves a proxy object that textconv_from_stream can finalize,
        # so a `hash:` header is always emitted.
        self._sample = None
        self._sample_pos = 0
        self._headers_finalized = False

    def _ingest(self, data: bytes) -> None:
        if data:
            self.hasher.update(data)
            self.size += len(data)

    def __enter__(self):
        # Pre-read a bounded sample for file-type detection. These bytes will
        # subsequently be replayed by read(), so the logical stream still starts
        # at byte 0 for the processor. Ingest (hash+count) them once, upfront,
        # so the hash/size cover the whole stream regardless of how much the
        # processor ends up reading.
        self._sample = self.source.read(SAMPLE_SIZE_BYTES)
        self._ingest(self._sample)
        self._is_in_context = True
        return self

    def read(self, size: int = -1) -> bytes:
        if not self._is_in_context:
            raise Exception(
                'TEXTCONV: StreamingProxy: read() must be called within context'
            )

        if size>MAX_FILE_SIZE_LIMIT_BYTES or size<0:
            size = MAX_FILE_SIZE_LIMIT_BYTES+1

        data = b''

        # First replay bytes from the pre-read sample (already ingested).
        if self._sample_pos < len(self._sample):
            sample_remaining = len(self._sample) - self._sample_pos
            sample_size = min(size, sample_remaining)
            data = self._sample[
                self._sample_pos:self._sample_pos + sample_size
            ]
            self._sample_pos += sample_size

        # If the caller requested more than remains in the sample, continue
        # reading from the underlying stream.
        remaining = size - len(data)
        if remaining > 0:
            source_data = self.source.read(remaining)
            if source_data:
                data += source_data
                self._ingest(source_data)

        if self.size > MAX_FILE_SIZE_LIMIT_BYTES:
            raise TextconvDataTooBig('FILE TOO BIG TO DISPLAY')

        return data

    def _finalize_headers(self) -> None:
        if self._headers_finalized:
            return
        self._headers_finalized = True

        # Drain the remainder of the source stream so that (a) the
        # bytes_consumed/hash headers describe the whole file even when a
        # processor never read the stream, and (b) a pipe producer (e.g.
        # `git cat-file`) is never left blocked on a full pipe buffer.
        try:
            while True:
                chunk = self.source.read(64 * 1024)
                if not chunk:
                    break
                if self.size < MAX_FILE_SIZE_LIMIT_BYTES:
                    self.hasher.update(chunk)
                self.size += len(chunk)
        except Exception:
            # Best effort: a broken stream must not hide the headers or the
            # original error, so swallow drain failures.
            pass

        print( make_header(f'bytes_consumed: {int(self.size)}'), file=self.buffer_for_headers, end='\n' )
        print( make_header(f'hash: {self.hexdigest}'), file=self.buffer_for_headers, end='\n' )

    @property
    def sample(self):
        return self._sample

    @property
    def digest(self):
        return self.hasher.digest()

    @property
    def hexdigest(self):
        return self.hasher.hexdigest()
    
    # unlink document if some error happened, or if we are done processing it
    def __del__(self):
        pass

    # methods required by python so that I can use "with"
    def __exit__(self, exc_type, exc_val, exc_tb):
        self._is_in_context = False
        return None

    

def textconv_from_stream(inpFile: FileLikeObject,filename: str) -> str:

    outputs = None
    error = None
    buf = StringIO()

    # Construct the proxy outside the try so that it always exists: __init__ does
    # no I/O, so this can never fail. The finally block below therefore always
    # has an object to finalize headers on.
    file = StreamingProxy(inpFile,buf)

    try:

        with file:

            filename = clean_filename_from_hash(filename)

            file_type = None
            extension = Path(filename).suffix

            for (extensions,t) in matches:
                if extension in extensions:
                    file_type = t
            if not file_type:
                file_type = detect_type_heuristics(file._sample,filename)
            print( make_header(f'type: {file_type}'), file=buf, end='\n' )

            processor = processors.get(file_type,None)
            if not processor:
                raise Exception(f'TEXTCONV: no associated processor for type {file_type} - it should not be possible, the conversion should always fall back to "text" or "binary" but not leave something unrecognized')

            outputs = processor(file,filename)

    except Exception as e:
        error = e
        print( make_header('error'), file=buf, end='\n' )
        print( make_exception_text(e), file=sys.stderr )
    finally:
        # Always emit bytes_consumed/hash (idempotent), then the content — so the
        # header block stays at the top of the output on every path.
        file._finalize_headers()
        if error is not None:
            print( f'{error}', file=buf, end='', flush=True )
        else:
            print( outputs, file=buf, end='', flush=True )

    return buf.getvalue()



def textconv_from_data(data: bytes,filename: str) -> str:
    return textconv_from_stream( BytesIO(data), filename )
            
