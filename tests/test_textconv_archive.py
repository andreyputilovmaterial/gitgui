"""Tests for the archive textconv processor (src/textconv/processors/archive/)."""

import bz2
import gzip
import hashlib
import io
import tarfile
import zipfile

import pytest

from src.textconv import textconv_from_data


MARKER = '###__TEXTCONV_108efe33_8af42f10_b98a_4b9b_b0b3_f66714dbf247: '


def _headers(output):
    headers = {}
    for line in output.split('\n'):
        if line.startswith(MARKER):
            value = line[len(MARKER):]
            if ': ' in value:
                key, val = value.split(': ', 1)
                headers[key] = val
            else:
                headers[value] = True
    return headers


def _body(output):
    lines = output.split('\n')
    return '\n'.join(line for line in lines if not line.startswith(MARKER))


def _sha256(data):
    return hashlib.sha256(data).hexdigest()


def _make_zip_bytes():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as zf:
        zf.writestr('dir/', '')  # explicit directory entry, must be skipped
        zf.writestr('a.txt', b'hello a')
        zf.writestr('sub/b.bin', b'\x00\x01\x02b')
        zf.writestr('empty.txt', b'')
    return buf.getvalue()


def _make_tar_bytes(compression=''):
    buf = io.BytesIO()
    mode = 'w' if not compression else f'w:{compression}'
    with tarfile.open(fileobj=buf, mode=mode) as tf:
        for name, data in (('a.txt', b'hello a'), ('sub/b.bin', b'\x00\x01\x02b')):
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tf.addfile(info, io.BytesIO(data))
    return buf.getvalue()


def test_zip_lists_files_with_sha256_hashes():
    out = textconv_from_data(_make_zip_bytes(), 'x.zip')
    headers = _headers(out)
    body = _body(out)

    assert headers['type'] == 'archive'
    assert 'error' not in headers
    assert 'dir/' not in body
    assert 'a.txt  ' + _sha256(b'hello a') in body
    assert 'sub/b.bin  ' + _sha256(b'\x00\x01\x02b') in body
    assert 'empty.txt  ' + _sha256(b'') in body


def test_tar_lists_files_with_sha256_hashes():
    out = textconv_from_data(_make_tar_bytes(), 'x.tar')
    body = _body(out)

    assert _headers(out)['type'] == 'archive'
    assert 'a.txt  ' + _sha256(b'hello a') in body
    assert 'sub/b.bin  ' + _sha256(b'\x00\x01\x02b') in body


def test_tar_gz_is_treated_as_tar_archive():
    out = textconv_from_data(_make_tar_bytes('gz'), 'x.tar.gz')
    body = _body(out)

    assert _headers(out)['type'] == 'archive'
    assert 'a.txt  ' + _sha256(b'hello a') in body
    assert 'sub/b.bin  ' + _sha256(b'\x00\x01\x02b') in body


def test_single_file_gzip_lists_one_entry():
    out = textconv_from_data(gzip.compress(b'just one file'), 'report.gz')
    body = _body(out)

    assert _headers(out)['type'] == 'archive'
    assert body == 'report  ' + _sha256(b'just one file')


def test_single_file_bzip2_lists_one_entry():
    out = textconv_from_data(bz2.compress(b'just bz2'), 'data.bz2')
    body = _body(out)

    assert _headers(out)['type'] == 'archive'
    assert body == 'data  ' + _sha256(b'just bz2')


def test_rar_is_rejected_with_a_readable_error():
    payload = b'Rar!\x1a\x07\x00' + b'\x00' * 16
    out = textconv_from_data(payload, 'x.rar')

    assert _headers(out)['type'] == 'archive'
    assert 'error' in _headers(out)
    assert 'RAR' in _body(out)


def test_unrecognized_bytes_fail_with_a_readable_error():
    out = textconv_from_data(b'\x00\x01\x02\x03\x04\x05\x06\x07', 'x.zip')

    assert _headers(out)['type'] == 'archive'
    assert 'error' in _headers(out)
    assert 'not a recognized archive' in _body(out)


def test_empty_input_produces_empty_listing():
    out = textconv_from_data(b'', 'x.zip')

    assert _headers(out)['type'] == 'archive'
    assert 'error' not in _headers(out)
    assert _body(out) == ''


def test_7z_lists_files_with_sha256_hashes():
    py7zr = pytest.importorskip('py7zr')

    buf = io.BytesIO()
    with py7zr.SevenZipFile(buf, 'w') as zf:
        zf.writestr(b'hello 7z', 'x.txt')
        zf.writestr(b'\x00\x01', 'sub/y.bin')

    out = textconv_from_data(buf.getvalue(), 'x.7z')
    body = _body(out)

    assert _headers(out)['type'] == 'archive'
    assert 'x.txt  ' + _sha256(b'hello 7z') in body
    assert 'sub/y.bin  ' + _sha256(b'\x00\x01') in body
