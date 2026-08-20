

import tempfile
from pathlib import Path

MarkItDown = None
markitdown_import_success = None
markitdown_import_error = None

try:
	from markitdown import MarkItDown
	markitdown_import_success = True
except ImportError as e:
	markitdown_import_error = e
	markitdown_import_success = False


def textconv(data,filename):
    if not markitdown_import_success:
        return f'TEXTCONV MarkItDown: Markitdown module is not available - will not be able to wide range of files ({markitdown_import_error})'
    with tempfile.TemporaryDirectory() as tmp_dir:
        temp_filename = Path(tmp_dir) / Path(filename).name
        with open(temp_filename,'wb') as f:
            f.write(data)
        try:
            md = MarkItDown()
            result = md.convert(temp_filename)
            return result.text_content
        except Exception as e:
            return f'TEXTCONV MarkItDown: failed when converting to text: "{e}"'