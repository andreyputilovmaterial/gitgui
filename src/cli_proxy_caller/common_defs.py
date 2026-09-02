

from datetime import datetime, timezone
from threading import Lock
# import subprocess # for type annotations
from typing import Any
from dataclasses import dataclass, field
# from collections.abc import Iterable, Iterator, Mapping, Sequence, Callable
# from collections.abc import Callable
from typing import Callable
# import copy



@dataclass
class JobTask:
    action: str
    command: Any | None = None
    is_binary: bool | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass
class JobMessage:
    job_id: Any
    task: JobTask
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass
class Job:
    job_id: str
    status: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    lock: Lock = field(default_factory=Lock, repr=False)
    error: Any = None
    command: Any = None
    options: dict | None = None
    is_interactive: bool | None = None
    is_binary: bool | None = None
    execution_started_at: datetime | None = None
    execution_finished_at: datetime | None = None
    last_activity_at: datetime | None = None
    flag_for_deletion: bool | None = None
    returncode: int | None = None
    stdout: str | None = None
    stderr: str | None = None
    stdout_reader: Callable | None = None
    job_data: Any | None = None
    def as_dict(self):
        with self.lock:
            if not self.job_id:
                raise Exception(f'/command cli: job.as_dict(): Can\'t return a job without job_id')
            result = {
                'job_id': self.job_id,
                'status': self.status,
                'created_at': self.created_at,

                'error': self.error,

                'exit_code': self.returncode,
                'stdout': self.stdout,
                'stderr': f'{self.stderr}' if self.stderr is not None else '',
            }
            # I'll not print fields that were not set yet
            # this is for better understanding what I receive, if something
            # is null, I have clearer view that processing here simplly did not
            # reach that point where the field is set
            # This is probably very unnecessary "sugar", those fields can come
            # normally as None/null
            if self.command is not None:
                result['command'] = self.command
            if self.is_interactive is not None:
                result['is_interactive'] = self.is_interactive
            if self.is_binary is not None:
                result['is_binary'] = self.is_binary
            if self.execution_started_at is not None:
                result['execution_started_at'] = self.execution_started_at
            if self.execution_finished_at is not None:
                result['execution_finished_at'] = self.execution_finished_at
            if self.last_activity_at is not None:
                result['last_activity_at'] = self.last_activity_at
            return result
