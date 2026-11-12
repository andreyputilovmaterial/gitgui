"""
Uniform registry of stdin "read conventions" for long-lived interactive commands.

A read convention is the contract that describes how to read ONE complete
response from a process's stdout after a single stdin write. For a command like
``git cat-file --batch`` that means: read the header line, parse the declared
payload size, then read exactly that many bytes plus the trailing newline.

Contract of a reader function::

    reader(process) -> frame

where ``process`` is the ``subprocess.Popen`` object and ``frame`` is the
complete response (header + payload) that was consumed. In binary mode
(``text=False``) the frame is ``bytes``; in text mode it is ``str``. Readers are
written to work in either mode where feasible.

This mirrors ``src/output_postprocessors/__init__.py``: the module only provides
the registry and the built-in readers; the app registers the ones it uses in
``src/main_gitgui_program.py``.
"""


_read_conventions = {}


def register_read_convention(name, reader):
    """Register a named read convention."""
    _read_conventions[name] = reader


def get_read_convention(name):
    return _read_conventions.get(name, None)


read_conventions = _read_conventions


def read_newline(process):
    """Read a single newline-terminated response (the default for simple REPLs)."""
    return process.stdout.readline()


def read_git_cat_file_batch(process):
    """Read one ``git cat-file --batch`` response.

    Layout (binary mode)::

        <sha> <type> <size>\\n
        <size bytes of payload>\\n

    or, for an object that does not exist::

        <sha> missing\\n

    Returns the full frame consumed (header + payload + trailing newline), so the
    caller can verify that exactly the declared number of bytes was read.
    """
    header = process.stdout.readline()
    if not header:
        return header

    is_bytes = isinstance(header, bytes)
    missing_token = b"missing" if is_bytes else "missing"
    newline = b"\n" if is_bytes else "\n"

    parts = header.split()
    if len(parts) >= 2 and parts[1] == missing_token:
        return header
    if len(parts) < 3:
        raise Exception(
            f"read_git_cat_file_batch: malformed cat-file header: {header!r}"
        )

    size = int(parts[2])
    data = process.stdout.read(size)
    process.stdout.read(1)  # the trailing newline after the payload
    return header + data + newline
