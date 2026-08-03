
from queue import Queue
from threading import Thread
import subprocess
import uuid
from pathlib import Path


jobs = {}
job_queue = Queue()


def worker():
    while True:
        job_id, command = job_queue.get()

        jobs[job_id]["status"] = "running"

        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=False,
            )

            jobs[job_id]["status"] = "done"
            jobs[job_id]["stdout"] = result.stdout
            jobs[job_id]["stderr"] = result.stderr
            jobs[job_id]["returncode"] = result.returncode

        except Exception as ex:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(ex)

        finally:
            job_queue.task_done()


def initiate_worker_loop(config):
    return Thread(target=worker, daemon=True).start()





def initiate_git_command(command,config):

    def sanitize_command(command):
        args = [*command]
        assert args[0]=='git', f'Not a git command'
        git_dir = Path(config.get("dir_git_repo")).resolve() / '.git'
        work_tree = Path(config.get("dir_working_tree")).resolve()
        args = [args[0],'--git-dir',git_dir,'--work-tree',work_tree,'--no-pager',*args[1:]]
        return args

    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        "status": "queued"
    }

    command = sanitize_command(command)
    job_queue.put((job_id, command))

    # self.send_response(202)
    # self.send_header("Content-Type", "application/json")
    # self.end_headers()
    #
    # self.wfile.write(json.dumps({
    #     "job_id": job_id
    # }).encode())
    return {
        "job_id": job_id
    }

def get_git_command_status(job_id,config):

    HTTP404 = config.get("HTTP404")

    if job_id not in jobs:
        raise HTTP404(f'Job ID "{job_id}" not found')

    # self.send_response(200)
    # self.send_header("Content-Type", "application/json")
    # self.end_headers()
    #
    # self.wfile.write(json.dumps(jobs[job_id]).encode())
    return jobs[job_id]
