

import argparse
from pathlib import Path

from .textconv import (
    textconv_from_stream,
)


def main(*argcs, **kwargs):
    parser = argparse.ArgumentParser(
        description='textconv - convert a file to text'
    )
    parser.add_argument(
        'input_file',
        type=str,
        help='Path to the input file to convert',
    )
    args = parser.parse_args(*argcs, **kwargs)

    input_file = Path(args.input_file).resolve()

    if not input_file.is_file():
        raise FileNotFoundError(f'{input_file}: file not found')

    with open(input_file, 'rb') as file:
        output = textconv_from_stream(file, f'{input_file}')

    print(output, end='', flush=True)


if __name__ == '__main__':
    main()
