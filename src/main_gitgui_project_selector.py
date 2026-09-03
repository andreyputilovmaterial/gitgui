

from datetime import datetime, timezone
import argparse
from pathlib import Path
import yaml

from .main_gitgui_program import main as call_gitgui_program






# STDOUT_COLOR_RED = "\033[91m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_GREEN = "\033[32m"



def make_schema(choices):
    return choices

def show_modal_form_window(schema):
    return schema[0]



def main(*argcs,**kwargs):
    time_start = datetime.now(timezone.utc)
    script_name = 'gitgui script'

    parser = argparse.ArgumentParser(
        description="gitgui"
    )
    parser.add_argument(
        #'-1',
        '--projects-file',
        type = Path,
        required = True
    )
    args = parser.parse_args(*argcs,**kwargs)

    projects_db_filename = None
    if args.projects_file:
        projects_db_filename = Path(args.projects_file).resolve()
    else:
        raise FileNotFoundError(f'--projects-file argument not provided')
    if not projects_db_filename.is_file():
        raise FileNotFoundError(f'{projects_db_filename}: not found')
    with open(projects_db_filename, "r") as file:
        projects_db = yaml.safe_load(file)
        choices = projects_db["projects"]
        schema = make_schema(choices)
        choice = show_modal_form_window(schema)
        return call_gitgui_program(['--work-tree-folder',choice.get('work_tree_folder'),'--git-repo-folder',choice.get('git_repo_folder')],)
