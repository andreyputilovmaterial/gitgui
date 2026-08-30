
from bs4 import BeautifulSoup
import sys # for checking pinliner
import re



def is_in_pinliner():
    for p in sys.meta_path:
        try:
            cls_str = f'{(p.__class__)}'
            if re.match(r'.*\.InlinerImporter\b.*',cls_str):
                return True
        except:
            pass
    return False

def sanitize(input):
    return f'{input}'.replace(r'"""',r'\"""')

def sanitize_classname(s) -> str:
    def err(i):
        raise Exception(f'Not valid class name: {i}')
    s = f'{s}'.split()
    return ' '.join([part if re.match(r'^\s*\w[\w\-]*\w\s*$',part) else err(part) for part in s])

def wrap_div(classname, txt) -> str:
    soup = BeautifulSoup("<div></div>", "html.parser")
    div = soup.div
    assert div is not None

    fragment = BeautifulSoup(txt, "html.parser")

    for child in list(fragment.contents):
        div.append(child)

    div["class"] = sanitize_classname(classname).split()

    return str(div)