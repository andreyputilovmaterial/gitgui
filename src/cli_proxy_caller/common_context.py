
from queue import Queue
# from typing import Any
# from dataclasses import dataclass, field
from types import SimpleNamespace


from .common_defs import (
    JobTask,
    JobMessage,
    Job,
)



context = SimpleNamespace(
    jobs = {},
    job_message_queue = Queue(),
    iface = SimpleNamespace(
        JobTask = JobTask,
        JobMessage = JobMessage,
        Job = Job,
    )
)
