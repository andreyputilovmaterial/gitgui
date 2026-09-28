

# import tempfile
from pathlib import Path
from io import BytesIO

MarkItDown = None
markitdown_import_success = None
markitdown_import_error = None

try:
	from markitdown import MarkItDown, StreamInfo
	markitdown_import_success = True
except ImportError as e:
	markitdown_import_error = e
	markitdown_import_success = False






def consume_all_and_emit_as_chunks(buffer):
    while True:
        chunk = buffer.read()
        if not chunk:
            break
        yield chunk




# def textconv(data,filename):
#     if not markitdown_import_success:
#         return f'TEXTCONV MarkItDown: Markitdown module is not available - will not be able to wide range of files ({markitdown_import_error})'
#     with tempfile.TemporaryDirectory() as tmp_dir:
#         temp_filename = Path(tmp_dir) / Path(filename).name
#         with open(temp_filename,'wb') as f:
#             f.write(data)
#         try:
#             md = MarkItDown()
#             result = md.convert(temp_filename)
#             return result.text_content
#         except Exception as e:
#             return f'TEXTCONV MarkItDown: failed when converting to text: "{e}"'

def textconv(inpFile,filename):
    if not markitdown_import_success:
        raise Exception( f'TEXTCONV MarkItDown: Markitdown module is not available - will not be able to wide range of files ({markitdown_import_error})' )
    md = MarkItDown()
    # file = BytesIO(inpFile.read())
    file = BytesIO()
    for p in consume_all_and_emit_as_chunks(inpFile):
        file.write(p)
    file.seek(0)
    result = md.convert_stream(
        file,
        stream_info=StreamInfo(
            # mimetype="application/something",
            extension=Path(filename).suffix,
        ),
    )
    return result.text_content


