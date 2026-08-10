
from bs4 import BeautifulSoup
import sys # for checking pinliner
import re
import hashlib
from pathlib import Path

import yaml





def prettyprint_config(data):
    return yaml.dump(data,sort_keys=False)
    # txt = ''
    # for key, value in data.items():
    #     txt += f'{key}: {value}\n'





def is_in_pinliner():
    for p in sys.meta_path:
        try:
            cls_str = f'{(p.__class__)}'
            if re.match(r'.*\.InlinerImporter\b.*',cls_str):
                return True
        except:
            pass
    return False





def make_hash(working_tree_folder,git_repo_folder):
    working_tree_folder = f'{working_tree_folder}'
    git_repo_folder = f'{git_repo_folder}'
    if '\0' in working_tree_folder or '\0' in git_repo_folder:
        raise Exception('Zero char in config paths: it\'s illegal')
    working_tree_folder = Path(working_tree_folder).resolve()
    git_repo_folder = Path(git_repo_folder).resolve()
    s = '\0'.join(
        (
            str(Path(working_tree_folder).resolve()),
            str(Path(git_repo_folder).resolve()),
        )
    ).encode('utf-8')
    h = hashlib.sha1(s).hexdigest()
    return h





def sanitize(input):
    return f'{input}'.replace(r'"""',r'\"""')

def sanitize_classname(s):
    def err(i):
        raise Exception(f'Not valid class name: {i}')
    s = f'{s}'.split()
    return ' '.join([part if re.match(r'^\s*\w[\w\-]*\w\s*$',part) else err(part) for part in s])

def wrap_div(classname, txt) -> str:
    soup = BeautifulSoup("<div></div>", "html.parser")
    div = soup.div

    fragment = BeautifulSoup(txt, "html.parser")

    # IMPORTANT: iterate over a copy
    for child in list(fragment.contents):
        div.append(child)

    div["class"] = sanitize_classname(classname).split()

    return str(div)
