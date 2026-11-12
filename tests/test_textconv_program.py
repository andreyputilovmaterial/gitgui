"""Tests for the standalone textconv program (src/main_textconv_program.py)."""

import hashlib

from src.main_textconv_program import main
from src.textconv import textconv_from_data, textconv_from_stream


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


def test_converts_text_file_to_text(tmp_path, capsys):
    input_file = tmp_path / 'hello.txt'
    input_file.write_text('hello, textconv!\nline two\n')

    main([str(input_file)])

    captured = capsys.readouterr()
    assert 'hello, textconv!\nline two\n' in captured.out
    assert '###__TEXTCONV_' in captured.out


def test_missing_file_fails_early(tmp_path):
    missing = tmp_path / 'does-not-exist.txt'
    try:
        main([str(missing)])
    except FileNotFoundError as exc:
        assert 'file not found' in str(exc)
    else:
        raise AssertionError('expected FileNotFoundError for a missing file')


def test_binary_files_with_different_bytes_have_different_hashes():
    a = textconv_from_data(b'\x00\x01\x02\x03', 'a.bin')
    b = textconv_from_data(b'\x00\x01\x02\x04', 'b.bin')
    assert _headers(a)['hash'] != _headers(b)['hash']


def test_binary_file_hash_and_bytes_consumed_cover_full_content():
    payload = b'\x00\x01\x02\x03\xff\xfe'
    out = textconv_from_data(payload, 'x.bin')
    headers = _headers(out)
    assert headers['hash'] == hashlib.sha256(payload).hexdigest()
    assert headers['bytes_consumed'] == str(len(payload))


def test_hash_header_emitted_even_when_sample_read_fails():
    class RaisingStream:
        def read(self, size=-1):
            raise IOError('boom')

    out = textconv_from_stream(RaisingStream(), 'x.bin')
    headers = _headers(out)
    assert 'hash' in headers
    assert headers.get('bytes_consumed') == '0'
