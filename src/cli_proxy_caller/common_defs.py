

from datetime import datetime, timezone
from threading import Lock
import subprocess # for type annotations
from typing import Any
from dataclasses import dataclass, field
# import copy



@dataclass
class JobTask:
    action: str
    command: Any | None = None
    is_binary: bool | None = None

@dataclass
class JobMessage:
    job_id: Any
    task: JobTask
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass
class BinaryDataBucket:
    bucket_id: Any
    data: bytes
    job_belonging_to_id: Any
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    accessed: bool = False
    lock: Lock = field(default_factory=Lock, repr=False)

@dataclass
class Job:
    job_id: str
    status: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    lock: Lock = field(default_factory=Lock, repr=False)
    error: Any = None
    command: Any = None
    is_continuous: bool | None = None
    is_binary: bool | None = None
    execution_started_at: datetime | None = None
    execution_finished_at: datetime | None = None
    last_activity_at: datetime | None = None
    returncode: int | None = None
    stdout: str | None = None
    stdout_pipe: dict | None = None
    stderr: str | None = None
    pipe_process: subprocess.Popen | None = field(default=None, repr=False)
    pipe_process_lock: Lock = field(default_factory = Lock, repr=False)
    def as_dict(self):
        with self.lock:
            return {
                'job_id': self.job_id,
                'status': self.status,
                'created_at': self.created_at,
                'error': self.error,
                'command': self.command,
                'is_continuous': self.is_continuous,
                'is_binary': self.is_binary,
                'execution_started_at': self.execution_started_at,
                'execution_finished_at': self.execution_finished_at,
                'last_activity_at': self.last_activity_at,
                'returncode': self.returncode,
                'stdout': self.stdout,
                'stdout_pipe': self.stdout_pipe,
                'stderr': f'{self.stderr}',
            }
