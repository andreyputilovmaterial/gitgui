

# import uuid # for assigning new id to new binary bucket
# from datetime import datetime, timedelta, timezone
# import subprocess



def read_stdout_per_convention_newline(process):
    data = process.stdout.readline()
    return data

def read_stdout_per_convention_gitcatfile(process):
    header = process.stdout.readline()
    parts = header.split()
    obj_type = parts[1]
    if obj_type == b"missing":
        return header
    size = parts[2]
    size = int(size)
    data = process.stdout.read(size)
    process.stdout.read(1)
    return header + data + b'\n'

read_conventions = {
    'newline': read_stdout_per_convention_newline,
    'gitcatfile': read_stdout_per_convention_gitcatfile,
}

def read_stdout_per_convention(process,read_convention):
    converter = read_conventions.get(read_convention,None)
    if converter:
        return converter(process)
    else:
        raise Exception(f'read_stdout: read convention is not supported: {read_convention}')







def handler(job,context):
    raise Exception('piped commands: not implemented')
    # BinaryDataBucket = context.iface.BinaryDataBucket
    # if task.action=="terminate":

    #         with job.lock:
    #             job.last_activity_at = datetime.now(timezone.utc)
    #         process = job.pipe_process
    #         is_binary = job.is_binary
    #         if process is None:
    #             return
    #         if not process or isinstance(process,int): # storing returncode when finished - just to reset to soemthing, it is not actually used
    #             raise Exception(f'Can only call subprocess.poll() when process exists (job_id: "{job_id}")')
    #         returncode = process.poll()
    #         if returncode is None:
    #             process.terminate()
    #             try:
    #                 process.wait(timeout=10)
    #             except subprocess.TimeoutExpired:
    #                 process.kill()
    #                 process.wait()
    #         stderr = ''
    #         with job.pipe_process_lock:
    #             for line in process.stderr:
    #                 stderr += line
    #             if is_binary:
    #                 stderr = stderr.decode("utf-8", errors="replace")
    #         with job.lock:
    #             if not job.stderr:
    #                 job.stderr = ''
    #             job.stderr += stderr
    #         with job.lock:
    #             job.status = "done"
    #             job.returncode = returncode
    #             job.pipe_process = returncode
    #             job.execution_finished_at = datetime.now(timezone.utc)
    #             job.last_activity_at = job.execution_finished_at

    #
    # elif task.action=="check_stderr":

    #         with job.pipe_process_lock:
    #             process = job.pipe_process
    #             is_binary = job.is_binary
    #             stderr = ''
    #             if not process or isinstance(process,int): # storing returncode when finished - just to reset to soemthing, it is not actually used
    #                 raise Exception(f'Can only call subprocess.poll() when process exists (job_id: "{job_id}")')
    #             for line in process.stderr:
    #                 stderr += line
    #             if is_binary:
    #                 stderr = stderr.decode("utf-8", errors="replace")
    #             with job.lock:
    #                 if not job.stderr:
    #                     job.stderr = ''
    #                 job.stderr += stderr
    #             returncode = process.poll()
    #             if returncode is not None:
    #                 with job.lock:
    #                     job.status = "done"
    #                     job.returncode = returncode
    #                     job.pipe_process = returncode
    #                     job.execution_finished_at = datetime.now(timezone.utc)
    #                     job.last_activity_at = job.execution_finished_at

    #
    # elif task.action=="open":

    #         command = task.command
    #         is_binary = task.is_binary
    #         with job.lock:
    #             if job.status != "fresh":
    #                 raise Exception(f'Can only call subprocess.Popen() on context.jobs with status "fresh" (job_id: "{job.job_id}")')
    #             job.status = "running"
    #             job.stdout_pipe = {}
    #             job.command = command
    #             job.is_continuous = True
    #             job.is_binary = is_binary
    #             job.execution_started_at = datetime.now(timezone.utc)
    #             job.last_activity_at = job.execution_started_at
    #         with job.pipe_process_lock:
    #             process = subprocess.Popen(
    #                 command,
    #                 stdin = subprocess.PIPE,
    #                 stdout = subprocess.PIPE,
    #                 stderr = subprocess.PIPE,
    #                 text = not is_binary,
    #                 encoding = "utf-8" if not is_binary else None,
    #                 bufsize = 0,
    #             )
    #             with job.lock:
    #                 job.pipe_process = process
    #                 job.last_activity_at = datetime.now(timezone.utc)
    #         context.job_message_queue.put( JobMessage( job_id = job_id, task = JobTask( action = "terminate", ) ) )

    #
    # elif task.action=="message":

    #         with job.pipe_process_lock:
    #             process = job.pipe_process
    #             is_binary = job.is_binary
    #             with job.lock:
    #                 job.last_activity_at = datetime.now(timezone.utc)
    #             if job.status != "running":
    #                 raise Exception(f'Can only call process.stdin.write() on context.jobs with status "running" (job_id: "{job.job_id}")')
    #             if not process or isinstance(process,int): # storing returncode when finished - just to reset to something, it is not actually used
    #                 raise Exception(f'Can only call subprocess.stdin.write() when process exists (job_id: "{job_id}")')
    #
    #             input_request_id, inp, read_convention = task.command
    #
    #             with job.lock:
    #                 if input_request_id in job.stdout_pipe:
    #                     raise Exception(f'Can only call process.stdin.write() with new input id, input_id: "{input_request_id}" (job_id: "{job.job_id}")')
    #                 job.stdout_pipe[input_request_id] = {
    #                     'stdin': inp,
    #                 }
    #                 job.last_activity_at = datetime.now(timezone.utc)
    #
    #             if not is_binary:
    #                 process.stdin.write(inp + "\n")
    #             else:
    #                 process.stdin.write(inp.encode() + b"\n")
    #             process.stdin.flush()
    #
    #             response = read_stdout_per_convention(process,read_convention)
    #             with job.lock:
    #                 if is_binary:
    #                     binary_bucket_id = str(uuid.uuid4())
    #                     binary_bucket = BinaryDataBucket(
    #                         bucket_id = binary_bucket_id,
    #                         data = response,
    #                         job_belonging_to_id = job.job_id,
    #                     )
    #                     context.binary_responses_storage[binary_bucket_id] = binary_bucket
    #                     response = binary_bucket_id
    #                 job.last_activity_at = datetime.now(timezone.utc)
    #                 job.stdout_pipe[input_request_id]['stdout'] = response
