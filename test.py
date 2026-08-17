import datetime
from pathlib import Path, PosixPath
import yaml

response = {'status': 'done', 'created_at': datetime.datetime(2026, 8, 17, 18, 12, 12, 740886, tzinfo=datetime.timezone.utc), 'command': ['git', '--git-dir', PosixPath('/Users/andrej/work/gitgui/tests-real-sensitive-data/test-project-repo/.git'), '--work-tree', PosixPath('/Users/andrej/work/gitgui/tests-real-sensitive-data/my-test-project'), '--no-pager', 'cat-file', 'blob', 'b4c0edf2997fe2bfef7da19b25b4423635d10323:README.txt'], 'execution_started_at': datetime.datetime(2026, 8, 17, 18, 12, 12, 741108, tzinfo=datetime.timezone.utc), 'execution_finished_at': datetime.datetime(2026, 8, 17, 18, 12, 12, 841332, tzinfo=datetime.timezone.utc), 'returncode': 0, 'stdout': '/command/89ffd279-6217-429a-8d82-e1404b5756fb/rawbytes/%FILENAME%', 'stdout_rawbytes': '<raw bytes>', 'stderr': ''}

print(yaml.dump(response,sort_keys=False))
