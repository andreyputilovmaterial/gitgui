

import bz2
import gzip
import hashlib
import lzma
import tempfile
from pathlib import Path
import tarfile
import zipfile


py7zr = None
SevenZipFile = None
HashIOFactory = None
py7zr_import_success = None
py7zr_import_error = None

try:
    import py7zr
    from py7zr import SevenZipFile
    from py7zr.io import HashIOFactory
    py7zr_import_success = True
except ImportError as e:
    py7zr_import_error = e
    py7zr_import_success = False


# Two spaces between a file path and its hash keep the listing readable while
# still being unambiguous enough for a human (a path can contain spaces too).
_HASH_SEPARATOR = '  '

_7Z_MAGIC = b'7z\xbc\xaf\x27\x1c'
_RAR_MAGIC = b'Rar!\x1a\x07'
_GZIP_MAGIC = b'\x1f\x8b'
_BZIP2_MAGIC = b'BZh'
_XZ_MAGIC = b'\xfd7zXZ\x00'


def consume_all_and_emit_as_chunks(buffer):
    while True:
        chunk = buffer.read()
        if not chunk:
            break
        yield chunk


def _hash_sha256_hex(readable):
    hasher = hashlib.sha256()
    while True:
        chunk = readable.read(64 * 1024)
        if not chunk:
            break
        hasher.update(chunk)
    return hasher.hexdigest()


def _line(name, digest):
    return f'{name}{_HASH_SEPARATOR}{digest}'


def _list_zip(path):
    lines = []
    with zipfile.ZipFile(path) as zf:
        names = [info.filename for info in zf.infolist() if not info.is_dir()]
        for name in sorted(names):
            with zf.open(name) as member:
                lines.append(_line(name, _hash_sha256_hex(member)))
    return lines


def _list_tar(path):
    lines = []
    with tarfile.open(path) as tf:
        members = [member for member in tf.getmembers() if member.isfile()]
        for member in sorted(members, key=lambda m: m.name):
            fileobj = tf.extractfile(member)
            if fileobj is None:
                continue
            lines.append(_line(member.name, _hash_sha256_hex(fileobj)))
    return lines


def _list_7z(path):
    if not py7zr_import_success:
        raise Exception(
            'TEXTCONV archive: 7z support requires the "py7zr" library, '
            f'which is not available ({py7zr_import_error})'
        )
    lines = []
    with SevenZipFile(path, 'r') as zf:
        targets = [info.filename for info in zf.list() if not info.is_directory]
        if not targets:
            return lines
        factory = HashIOFactory()
        zf.extract(targets=targets, factory=factory)
        for name in sorted(targets):
            digest = factory.get(name).read().hex()
            lines.append(_line(name, digest))
    return lines


def _strip_compression_suffix(filename):
    lower = filename.lower()
    for suffix in ('.tar.gz', '.tar.bz2', '.tar.xz', '.tgz', '.tbz2', '.txz',
                   '.gz', '.gzip', '.bz2', '.bzip', '.xz', '.lzma'):
        if lower.endswith(suffix):
            return filename[:-len(suffix)]
    return filename


def _single_file_opener(magic):
    if magic.startswith(_GZIP_MAGIC):
        return gzip.open
    if magic.startswith(_BZIP2_MAGIC):
        return bz2.open
    if magic.startswith(_XZ_MAGIC):
        return lzma.open
    return None


def _list_single_compressed(path, filename, opener):
    name = _strip_compression_suffix(filename) or filename
    with opener(path, 'rb') as stream:
        digest = _hash_sha256_hex(stream)
    return [_line(name, digest)]


def _list_archive(path, filename):
    with open(path, 'rb') as raw:
        magic = raw.read(8)

    if magic.startswith(_RAR_MAGIC):
        raise Exception(
            'TEXTCONV archive: RAR is a proprietary format and is not '
            'supported; only open-source archive formats are supported'
        )
    if magic.startswith(_7Z_MAGIC):
        return '\n'.join(_list_7z(path))
    if zipfile.is_zipfile(path):
        return '\n'.join(_list_zip(path))
    if tarfile.is_tarfile(path):
        return '\n'.join(_list_tar(path))

    opener = _single_file_opener(magic)
    if opener is None:
        raise Exception(
            f'TEXTCONV archive: {filename} is not a recognized archive or '
            'compressed file'
        )
    return '\n'.join(_list_single_compressed(path, filename, opener))


def textconv(file, filename):
    with tempfile.TemporaryDirectory() as tmp_dir:
        temp_path = Path(tmp_dir) / (Path(filename).name or 'archive')
        total_datasize_counter = 0
        with open(temp_path, 'wb') as f:
            for p in consume_all_and_emit_as_chunks(file):
                total_datasize_counter += len(p) if p else 0
                f.write(p)
            if not (total_datasize_counter > 0):
                return ''

        return _list_archive(temp_path, filename)
