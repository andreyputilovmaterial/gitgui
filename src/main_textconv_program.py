

import sys
from pathlib import Path

from .textconv import (
    textconv_from_stream,
)


def main(*argcs, **kwargs):
    # Resolve the argument list the same way argparse.parse_args() did:
    # an explicit list (positional or `args=` keyword) wins, otherwise the
    # real process argv. This keeps main() callable from launcher.py and
    # tests while avoiding the argparse import + parser build/parse cost on
    # every process start (the textconv driver is spawned once per file).
    if argcs:
        args = argcs[0]
    elif 'args' in kwargs:
        args = kwargs['args']
    else:
        args = sys.argv[1:]

    if len(args) != 1:
        raise ValueError(
            'textconv expects exactly one argument: the path to the input file'
        )

    input_file = args[0]

    # is_file() already stats the path and follows symlinks, so the extra
    # .resolve() (realpath) round-trip is pure overhead here.
    if not Path(input_file).is_file():
        raise FileNotFoundError(f'{input_file}: file not found')

    with open(input_file, 'rb') as file:
        output = textconv_from_stream(file, f'{input_file}')

    print(output, end='', flush=True)


if __name__ == '__main__':
    main()
