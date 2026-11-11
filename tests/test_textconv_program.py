"""Tests for the standalone textconv program (src/main_textconv_program.py)."""

from src.main_textconv_program import main


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
