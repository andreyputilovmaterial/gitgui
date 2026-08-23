
from queue import Queue
# from typing import Any
# from dataclasses import dataclass, field
from types import SimpleNamespace


from .common_defs import (
    JobTask,
    JobMessage,
    BinaryDataBucket,
    Job,
)



context = SimpleNamespace(
    jobs = {},
    job_message_queue = Queue(),
    binary_responses_storage = {},
    iface = SimpleNamespace(
        JobTask = JobTask,
        JobMessage = JobMessage,
        BinaryDataBucket = BinaryDataBucket,
        Job = Job,
    )
)
