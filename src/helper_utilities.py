
from bs4 import BeautifulSoup
import sys # for checking pinliner, and for verifying python ver
import re
import hashlib
from pathlib import Path
from datetime import date
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





def make_hash(working_tree,git_directory):
    working_tree = f'{working_tree}'
    git_directory = f'{git_directory}'
    if '\0' in working_tree or '\0' in git_directory:
        raise Exception('Zero char in config paths: it\'s illegal')
    working_tree = Path(working_tree).resolve()
    git_directory = Path(git_directory).resolve()
    s = '\0'.join(
        (
            str(Path(working_tree).resolve()),
            str(Path(git_directory).resolve()),
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




def assess_python_ver():
    PYTHON_EOL = {
        (3, 9):  date(2025, 10, 31),
        (3, 10): date(2026, 10, 31),
        (3, 11): date(2027, 10, 31),
        (3, 12): date(2028, 10, 31),
        (3, 13): date(2029, 10, 31),
        (3, 14): date(2030, 10, 31),
    }
    version = sys.version_info[:2]
    result = {
        'python_version': f'{version[0]}.{version[1]}',
    }
    eol = PYTHON_EOL.get(version)
    if eol is not None:
        if date.today() >= eol:
            result['is_not_supported'] = True
    return result
