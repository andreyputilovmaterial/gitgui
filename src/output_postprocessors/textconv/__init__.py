
import argparse
from typing import BinaryIO


class TextconvUsageError(ValueError):
    pass


class TextconvArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise TextconvUsageError(message)


def make_textconv_output_processor(config):

    textconv_from_stream = config.get('iface').get('textconv_from_stream')

    def fn(stdin_stream: BinaryIO, stdout_stream: BinaryIO, stderr_stream: BinaryIO, *argcs,**_kwargs):
        parser = TextconvArgumentParser(
                description="textconv"
            )
        parser.add_argument(
                #'-1',
                '--filename',
                # type=str,
                # required=True
            )
        args = parser.parse_args(argcs)
        if not args.filename:
            raise TextconvUsageError(f'textconv: filename is required, got {repr(args.filename)}')
        result = textconv_from_stream(stdin_stream,filename=args.filename)
        print(result,file=stdout_stream)
        return 0

    return fn
