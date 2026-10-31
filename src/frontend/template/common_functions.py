"""Small shared helpers for the HTML template layer."""


from bs4 import BeautifulSoup
import sys # for checking pinliner
import re



def is_in_pinliner() -> bool:
    """Return True when running inside the pinliner bundle importer."""
    for p in sys.meta_path:
        try:
            cls_str = f'{(p.__class__)}'
            if re.match(r'.*\.InlinerImporter\b.*',cls_str):
                return True
        except:
            pass
    return False

def sanitize(input: str) -> str:
    """Escape triple quotes so text can be embedded in a Python literal."""
    return f'{input}'.replace(r'"""',r'\"""')

def sanitize_classname(s: str) -> str:
    """Validate and join whitespace-separated CSS class names."""
    def err(i):
        raise Exception(f'Not valid class name: {i}')
    s = f'{s}'.split()
    return ' '.join([part if re.match(r'^\s*\w[\w\-]*\w\s*$',part) else err(part) for part in s])

def wrap_div(classname: str, txt: str) -> str:
    """Wrap ``txt`` in a ``<div>`` with the given class names."""
    soup = BeautifulSoup("<div></div>", "html.parser")
    div = soup.div
    assert div is not None

    fragment = BeautifulSoup(txt, "html.parser")

    for child in list(fragment.contents):
        div.append(child)

    div["class"] = sanitize_classname(classname).split()

    return str(div)