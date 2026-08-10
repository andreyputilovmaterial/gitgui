
# from bs4 import BeautifulSoup
import sys # for checking pinliner
import re
from pathlib import Path
import json
from datetime import datetime



def is_in_pinliner():
    for p in sys.meta_path:
        try:
            cls_str = f'{(p.__class__)}'
            if re.match(r'.*\.InlinerImporter\b.*',cls_str):
                return True
        except:
            pass
    return False

# def sanitize(input):
#     return f'{input}'.replace(r'"""',r'\"""')

# def sanitize_classname(s):
#     def err(i):
#         raise Exception(f'Not valid class name: {i}')
#     s = f'{s}'.split()
#     return ' '.join([part if re.match(r'^\s*\w[\w\-]*\w\s*$',part) else err(part) for part in s])

# def wrap_div(classname, txt) -> str:
#     soup = BeautifulSoup("<div></div>", "html.parser")
#     div = soup.div

#     fragment = BeautifulSoup(txt, "html.parser")

#     # IMPORTANT: iterate over a copy
#     for child in list(fragment.contents):
#         div.append(child)

#     div["class"] = sanitize_classname(classname).split()

#     return str(div)

class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Path):
            return f'{obj}'
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


import re



def get_matching_endpoint(path,endpoints):
    def not_found(*args,**argv):
        raise HTTP404(f'{path} was not found on the server')

    def check_if_pattern_matches(path, pattern):
        if callable(pattern):
            if pattern(f'{path}'):
                return f'{path}'
        elif isinstance(pattern, str):
            if f'{path}' == f'{pattern}':
                return f'{path} ' # let's add a space to increase returned piece length, that is the priority for exact match
        elif isinstance(pattern, re.Pattern):
            matches = re.match(pattern,f'{path}')
            if matches:
                return f'{matches[0]}'
        return None

    # longest matching
    best_match = None
    best_length = -1

    for pattern, renderer in endpoints.items():
        matching_str = check_if_pattern_matches(path,pattern)
        if matching_str is not None:
            if len(matching_str) > best_length:
                best_match = renderer
                best_length = len(matching_str)
    if best_match:
        return best_match

    return not_found
