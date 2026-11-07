"""Live performance statistics for the job subsystem.

The jobs are kept in a plain dict (``context.jobs``, see ``common_context.py``).
This module measures how much memory that dict currently holds, per job and in
total, without keeping any of the measured objects alive afterwards.

Two distinct things are deliberately kept apart:

* **Footprint** (what this module measures): the Python heap reachable from the
  jobs dict right now — strings/bytes, containers, dataclass fields, locks,
  timestamps, file-object wrappers and, crucially, anything captured by a
  ``stdout_reader`` closure (e.g. the bytes buffered by a ``subprocess.run``).
* **Throughput** (what this module does *not* measure): the total number of
  bytes that have flowed through a stream. That is not a memory quantity and
  cannot be recovered from an object afterwards; it would require an
  instrumented byte counter at the read/write sites.

``deep_size`` is an *estimate*, not an exact RSS figure:

* ``str``/``bytes``/``bytearray`` payloads are exact (their data is part of the
  object and ``sys.getsizeof`` counts it).
* ``io.BytesIO``/``memoryview`` wrap a separate buffer: ``BytesIO`` already
  reports its buffer through ``getsizeof``, while ``memoryview`` needs its
  ``nbytes`` added explicitly.
* OS-level resources are measured only as their small Python wrappers: a
  ``subprocess.Popen`` child has its own address space, and data in an
  ``os.pipe`` lives in kernel buffers, not in this process's Python heap.

The "does not prevent release" guarantee is structural: ``deep_size`` holds a
reference to an object only for the duration of that one call (plus a transient
``id()`` set to break cycles), and ``get_jobs_perf_stats`` returns only JSON-safe
numbers/strings — never the job objects or their fields. Nothing measured is ever
stored, so measuring can never extend a job's lifetime.
"""

import io
import sys
import types

from .common_context import context


# Atomic leaves: ``sys.getsizeof`` already includes their full payload and they
# cannot reference other Python objects that would need walking.
_ATOMIC_TYPES = (
    str,
    bytes,
    int,
    float,
    complex,
    bool,
    range,
    type(None),
)


# A field holding more than this many bytes is "unexpected" and gets flagged.
# stdout/stderr should normally be ~0 (text-only commands), and a streamed
# stdout reader should hold a pipe wrapper, not megabytes of buffered output —
# so anything above ~1 MiB in those slots is worth a human look.
DEFAULT_FIELD_THRESHOLDS_BYTES = {
    "stdout": 1024 * 1024,
    "stderr": 1024 * 1024,
    "stdout_reader": 1024 * 1024,
    "job_data": 1024 * 1024,
}


def deep_size(obj, exclude=None):
    """Approximate the deep memory footprint of ``obj`` in bytes.

    Walks the object graph reachable from ``obj`` — containers, instance
    ``__dict__``/``__slots__``, and function closure captures — and sums the
    ``sys.getsizeof`` of each node. Cycles and shared references are counted
    once, so the result is a meaningful footprint, not a double-counted sum.

    ``exclude`` is an optional iterable of ``id()`` values treated as already
    visited (measured as 0 bytes). Callers use it to measure one field of a
    larger object while ignoring the parts that field merely points back at
    (e.g. a stdout reader closure that captures its parent job).

    Never stores the object, so it never prevents the object from being freed
    afterwards.
    """
    seen = set()
    if exclude is not None:
        seen.update(exclude)
    return _deep_size(obj, seen)


def _deep_size(obj, seen):
    # Leaves: getsizeof already includes their payload. They cannot be walked
    # further, but an id in ``seen`` still means "excluded" (see deep_size's
    # exclude param), so honor it here as well before returning.
    if obj is None or isinstance(obj, _ATOMIC_TYPES):
        if id(obj) in seen:
            return 0
        return sys.getsizeof(obj)

    # Buffer wrappers whose getsizeof does not include their content.
    if isinstance(obj, io.BytesIO):
        # BytesIO.__sizeof__ already includes its internal buffer, so there is
        # nothing extra to add — just return it.
        return sys.getsizeof(obj)

    if isinstance(obj, memoryview):
        size = sys.getsizeof(obj)
        try:
            size += obj.nbytes
        except Exception:
            pass
        return size

    # Cycle / shared-reference guard. Only non-atomic objects reach this point,
    # so tracking their ids is cheap.
    obj_id = id(obj)
    if obj_id in seen:
        return 0
    seen.add(obj_id)

    size = sys.getsizeof(obj)

    if isinstance(obj, dict):
        for key, value in obj.items():
            size += _deep_size(key, seen)
            size += _deep_size(value, seen)
        return size

    if isinstance(obj, (list, tuple, set, frozenset)):
        for item in obj:
            size += _deep_size(item, seen)
        return size

    if isinstance(obj, types.FunctionType):
        # Closure captures are the interesting part: they are where a job's
        # stdout_reader pins buffered output (e.g. a subprocess.run result).
        # We deliberately walk __closure__/__defaults__/__kwdefaults__ but NOT
        # __globals__, which would measure the entire module.
        if obj.__closure__:
            for cell in obj.__closure__:
                try:
                    size += _deep_size(cell.cell_contents, seen)
                except (ValueError, AttributeError):
                    # an empty (unbound) closure cell raises ValueError
                    pass
        if obj.__defaults__:
            size += _deep_size(obj.__defaults__, seen)
        if obj.__kwdefaults__:
            size += _deep_size(obj.__kwdefaults__, seen)
        d = getattr(obj, "__dict__", None)
        if d:
            size += _deep_size(d, seen)
        return size

    # Generic object: instance __dict__ plus __slots__ across the MRO.
    d = getattr(obj, "__dict__", None)
    if isinstance(d, dict):
        size += _deep_size(d, seen)

    for cls in type(obj).__mro__:
        for slot in getattr(cls, "__slots__", ()):
            if slot in ("__dict__", "__weakref__"):
                continue
            try:
                size += _deep_size(getattr(obj, slot), seen)
            except Exception:
                pass

    return size


def _measure_job(job):
    """Return a JSON-safe size breakdown for a single job.

    Attributes are read without holding ``job.lock``: a perf snapshot is
    best-effort and should never block the worker while a huge buffer is being
    walked. Reference reassignment in CPython is atomic, so each read yields a
    consistent (old or new) object, which is good enough for observability.
    """
    job_id = getattr(job, "job_id", None)
    status = getattr(job, "status", None)

    # stdout/stderr are str/bytes, so their deep size *is* their payload size.
    stdout_bytes = deep_size(getattr(job, "stdout", None))
    stderr_bytes = deep_size(getattr(job, "stderr", None))

    # Measure the reader closure with the job itself excluded: a reader that
    # captures its parent job (a cycle) must not report the whole job's size.
    reader_bytes = deep_size(getattr(job, "stdout_reader", None), exclude=(id(job),))
    job_data_bytes = deep_size(getattr(job, "job_data", None))

    total_bytes = deep_size(job)

    return {
        "job_id": job_id,
        "status": status,
        "bytes": total_bytes,
        "fields": {
            "stdout": stdout_bytes,
            "stderr": stderr_bytes,
            "stdout_reader": reader_bytes,
            "job_data": job_data_bytes,
        },
    }


def get_jobs_perf_stats(jobs=None, thresholds=None):
    """Return a JSON-safe snapshot of the jobs subsystem's memory footprint.

    :param jobs: the jobs dict to inspect; defaults to the live ``context.jobs``.
    :param thresholds: optional per-field byte limits (see
        ``DEFAULT_FIELD_THRESHOLDS_BYTES``). Any field over its limit marks the
        job ``flagged``.

    The returned structure contains only ints/strings/None — never the job
    objects — so calling this can never keep a job alive after it is garbage
    collected from the dict.
    """
    if jobs is None:
        jobs = context.jobs
    if thresholds is None:
        thresholds = DEFAULT_FIELD_THRESHOLDS_BYTES

    # Snapshot the key→job pairs first so a concurrent gc() (which mutates the
    # dict from the worker thread) cannot raise "dict changed size during
    # iteration". The snapshot list is local and released on return.
    snapshot = list(jobs.items())

    per_job = []
    total_bytes = 0
    for job_id, job in snapshot:
        try:
            entry = _measure_job(job)
        except Exception as e:  # a broken/foreign object must not break stats
            entry = {
                "job_id": job_id,
                "status": None,
                "bytes": -1,
                "fields": {},
                "error": repr(e),
            }

        entry["flagged"] = False
        for field, value in (entry.get("fields") or {}).items():
            limit = thresholds.get(field)
            if limit is not None and isinstance(value, int) and value > limit:
                entry["flagged"] = True

        per_job.append(entry)
        if isinstance(entry.get("bytes"), int) and entry["bytes"] > 0:
            total_bytes += entry["bytes"]

    return {
        "jobs_count": len(per_job),
        "total_bytes": total_bytes,
        "jobs": per_job,
    }
