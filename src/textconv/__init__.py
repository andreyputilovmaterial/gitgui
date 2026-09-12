
from pathlib import Path
from io import BytesIO, StringIO
import re
import hashlib

from typing import Protocol

from .detect_type import detect_type as detect_type_heuristics
from .processors import processors, matches
from .helper_functions import clean_filename_from_hash
from .config import (
    MAX_FILE_SIZE_LIMIT_BYTES,
    SAMPLE_SIZE_BYTES,
)
from .helper_log_errors import (
    print_error,
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
        self.size = 0
        self.hasher = hashlib.sha256()
        self.buffer_for_headers = buffer_for_headers
        self._is_in_context = False
        # Pre-read a bounded sample for file-type detection.
        # These bytes will subsequently be replayed by read(), so the
        # logical stream still starts at byte 0 for the processor.
        self._sample = source.read(SAMPLE_SIZE_BYTES)
        self._sample_pos = 0

    def read(self, size: int = -1) -> bytes:
        if not self._is_in_context:
            raise Exception(
                'TEXTCONV: StreamingProxy: read() must be called within context'
            )

        if size>MAX_FILE_SIZE_LIMIT_BYTES or size<0:
            size = MAX_FILE_SIZE_LIMIT_BYTES+1 # not 100% accurate as of limit, but I believe having extra SAMPLE_SIZE_BYTES should not be an issue

        # First replay bytes from the pre-read sample.
        if self._sample_pos < len(self._sample):
            if size < 0:
                sample_data = self._sample[self._sample_pos:]
                self._sample_pos = len(self._sample)

                # Now read the rest of the underlying stream.
                data = self.source.read(MAX_FILE_SIZE_LIMIT_BYTES+1)
                if data:
                    sample_data += data

                data = sample_data
            else:
                sample_remaining = len(self._sample) - self._sample_pos
                sample_size = min(size, sample_remaining)

                data = self._sample[
                    self._sample_pos:self._sample_pos + sample_size
                ]
                self._sample_pos += sample_size

                # If the caller requested more than remains in the sample,
                # continue reading from the underlying stream.
                remaining = size - len(data)
                if remaining > 0:
                    source_data = self.source.read(remaining)
                    if source_data:
                        data += source_data

        else:
            # Sample has already been completely replayed.
            if size<0:
                data = self.source.read(MAX_FILE_SIZE_LIMIT_BYTES+1)
            else:
                data = self.source.read(size)

        if data:
            self.size += len(data)
            self.hasher.update(data)

            if self.size > MAX_FILE_SIZE_LIMIT_BYTES:
                raise TextconvDataTooBig('FILE TOO BIG TO DISPLAY')

        return data

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
    def __enter__(self):
        self._is_in_context = True
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        print( make_header(f'bytes_consumed: {int(self.size)}'), file=self.buffer_for_headers, end='\n' )
        print( make_header(f'hash: {self.hexdigest}'), file=self.buffer_for_headers, end='\n' )
        self._is_in_context = False
        return None

    

def textconv_from_stream(inpFile: FileLikeObject,filename: str) -> str:

    outputs = None
    buf = StringIO()

    try:

        with StreamingProxy(inpFile,buf) as file:

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

        print(
            '',
            file=buf,
            end='',
            flush=True,
        )
        print(
            outputs,
            file=buf,
            end='',
            flush=True,
        )
    
    except Exception as e:
        print_error(e)
        print( make_header('error'), file=buf, end='\n' )
        print( f'{e}', file=buf, end='' )
    
    return buf.getvalue()



def textconv_from_data(data: bytes,filename: str) -> str:
    return textconv_from_stream( BytesIO(data), filename )
            
