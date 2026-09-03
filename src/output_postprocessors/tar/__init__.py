import tarfile
from typing import BinaryIO


class TarUsageError(ValueError):
    pass


def tar_output_processor(input_stream: BinaryIO, *args: str) -> None:
    """
    Small pipe-oriented wrapper around Python's tarfile module.

    Examples:

        tar_output_processor(stdin, "-x", "-C", "/tmp/output")
        tar_output_processor(stdin, "-t")
        tar_output_processor(stdin, "-tv")
        tar_output_processor(stdin, "-xz", "-C", "/tmp/output")

    The input_stream is always the tar archive (stdin).

    File names passed with -f are rejected because this wrapper
    never opens the archive itself.
    """

    mode = None
    destination = None
    verbose = False

    i = 0

    while i < len(args):
        arg = args[i]

        if arg == "--":
            # Remaining arguments are member names.
            # Not implemented in this minimal wrapper.
            raise TarUsageError("member-name arguments are not supported")

        # Long options
        if arg == "--extract":
            mode = "x"

        elif arg == "--create":
            mode = "c"

        elif arg == "--list":
            mode = "t"

        elif arg == "--verbose":
            verbose = True

        elif arg == "--directory":
            i += 1
            if i >= len(args):
                raise TarUsageError("--directory requires a path")
            destination = args[i]

        elif arg.startswith("--directory="):
            destination = arg.split("=", 1)[1]

        elif arg == "--file" or arg.startswith("--file="):
            raise TarUsageError(
                "archive file names are not allowed; archive is the input stream"
            )

        # Short options
        elif arg.startswith("-") and arg != "-":
            # Handle things like -xvf, -xz, -tv
            options = arg[1:]

            j = 0
            while j < len(options):
                opt = options[j]

                if opt == "x":
                    mode = "x"

                elif opt == "c":
                    mode = "c"

                elif opt == "t":
                    mode = "t"

                elif opt == "v":
                    verbose = True

                elif opt == "f":
                    # -f can theoretically be "-f file.tar"
                    # or "-ffile.tar". Either way, reject it.
                    raise TarUsageError(
                        "-f is not allowed; archive is provided as input stream"
                    )

                elif opt == "C":
                    # Support `-C /some/path`
                    if j + 1 < len(options):
                        # `-C/tmp/foo`
                        destination = options[j + 1:]
                        break

                    i += 1
                    if i >= len(args):
                        raise TarUsageError("-C requires a path")
                    destination = args[i]

                elif opt == "z":
                    # gzip
                    # We record this below when opening the stream.
                    pass

                elif opt == "j":
                    # bzip2
                    pass

                elif opt == "J":
                    # xz
                    pass

                else:
                    raise TarUsageError(f"unsupported tar option: -{opt}")

                j += 1

        else:
            # A bare argument would normally be a file/member name.
            # We don't allow filesystem input or member selection yet.
            raise TarUsageError(
                f"file/member argument not supported: {arg!r}"
            )

        i += 1

    if mode is None:
        raise TarUsageError("one of -x, -c, or -t is required")

    if mode == "x":
        if destination is None:
            raise TarUsageError(
                "-C is required; this wrapper never uses the current directory"
            )

        # r|* means:
        #   read from file-like object
        #   streaming mode
        #   automatically detect compression
        with tarfile.open(fileobj=input_stream, mode="r|*") as archive:
            if verbose:
                for member in archive:
                    print(member.name)
                    archive.extract(member, destination)
            else:
                archive.extractall(destination)

    elif mode == "t":
        with tarfile.open(fileobj=input_stream, mode="r|*") as archive:
            for member in archive:
                print(member.name)

    elif mode == "c":
        raise TarUsageError(
            "create mode is not implemented in this minimal pipe wrapper"
        )
