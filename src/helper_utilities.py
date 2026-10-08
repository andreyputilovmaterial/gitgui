
import sys # for checking pinliner, and for verifying python ver
import re
import hashlib
from pathlib import Path
from datetime import date
import yaml
from dataclasses import dataclass





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






def assess_python_ver():

    @dataclass
    class PythonVerNotes:
        branch: tuple[int,int]
        spec: str
        status_str: str
        first_release: date
        eol: date
        release_manager: str
    
    PYTHON_EOL = {
        (3, 16): PythonVerNotes( branch = ( 3, 16 ), spec = 'PEP 826', status_str = 'feature', first_release = date(2027,10,6), eol = date(2032,10,31), release_manager = 'Savannah Ostrowski', ),
        (3, 15): PythonVerNotes( branch = ( 3, 15 ), spec = 'PEP 790', status_str = 'prerelease', first_release = date(2026,10,1), eol = date(2031,10,31), release_manager = 'Hugo van Kemenade', ),
        (3, 14): PythonVerNotes( branch = ( 3, 14 ), spec = 'PEP 745', status_str = 'bugfix', first_release = date(2025,10,7), eol = date(2030,10,31), release_manager = 'Hugo van Kemenade', ),
        (3, 13): PythonVerNotes( branch = ( 3, 13 ), spec = 'PEP 719', status_str = 'security', first_release = date(2024,10,7), eol = date(2029,10,31), release_manager = 'Thomas Wouters', ),
        (3, 12): PythonVerNotes( branch = ( 3, 12 ), spec = 'PEP 693', status_str = 'security', first_release = date(2023,10,2), eol = date(2028,10,31), release_manager = 'Thomas Wouters', ),
        (3, 11): PythonVerNotes( branch = ( 3, 11 ), spec = 'PEP 664', status_str = 'security', first_release = date(2022,10,24), eol = date(2027,10,31), release_manager = 'Pablo Galindo Salgado', ),
        (3, 10): PythonVerNotes( branch = ( 3, 10 ), spec = 'PEP 619', status_str = 'end-of-life', first_release = date(2021,10,4), eol = date(2026,10,1), release_manager = 'Pablo Galindo Salgado', ),
        (3, 9): PythonVerNotes( branch = ( 3, 9 ), spec = 'PEP 596', status_str = 'end-of-life', first_release = date(2020,10,5), eol = date(2025,10,31), release_manager = 'Łukasz Langa', ),
        (3, 8): PythonVerNotes( branch = ( 3, 8 ), spec = 'PEP 569', status_str = 'end-of-life', first_release = date(2019,10,14), eol = date(2024,10,7), release_manager = 'Łukasz Langa', ),
        (3, 7): PythonVerNotes( branch = ( 3, 7 ), spec = 'PEP 537', status_str = 'end-of-life', first_release = date(2018,6,27), eol = date(2023,6,27), release_manager = 'Ned Deily', ),
        (3, 6): PythonVerNotes( branch = ( 3, 6 ), spec = 'PEP 494', status_str = 'end-of-life', first_release = date(2016,12,23), eol = date(2021,12,23), release_manager = 'Ned Deily', ),
        (3, 5): PythonVerNotes( branch = ( 3, 5 ), spec = 'PEP 478', status_str = 'end-of-life', first_release = date(2015,9,13), eol = date(2020,9,30), release_manager = 'Larry Hastings', ),
        (3, 4): PythonVerNotes( branch = ( 3, 4 ), spec = 'PEP 429', status_str = 'end-of-life', first_release = date(2014,3,16), eol = date(2019,3,18), release_manager = 'Larry Hastings', ),
        (3, 3): PythonVerNotes( branch = ( 3, 3 ), spec = 'PEP 398', status_str = 'end-of-life', first_release = date(2012,9,29), eol = date(2017,9,29), release_manager = 'Georg Brandl & Ned Deily (3.3.7)', ),
        (3, 2): PythonVerNotes( branch = ( 3, 2 ), spec = 'PEP 392', status_str = 'end-of-life', first_release = date(2011,2,20), eol = date(2016,2,20), release_manager = 'Georg Brandl', ),
        (3, 1): PythonVerNotes( branch = ( 3, 1 ), spec = 'PEP 375', status_str = 'end-of-life', first_release = date(2009,6,27), eol = date(2012,4,9), release_manager = 'Benjamin Peterson', ),
        (3, 0): PythonVerNotes( branch = ( 3, 0 ), spec = 'PEP 361', status_str = 'end-of-life', first_release = date(2008,12,3), eol = date(2009,6,27), release_manager = 'Barry Warsaw', ),
        (2, 7): PythonVerNotes( branch = ( 2, 7 ), spec = 'PEP 373', status_str = 'end-of-life', first_release = date(2010,7,3), eol = date(2020,1,1), release_manager = 'Benjamin Peterson', ),
        (2, 6): PythonVerNotes( branch = ( 2, 6 ), spec = 'PEP 361', status_str = 'end-of-life', first_release = date(2008,10,1), eol = date(2013,10,29), release_manager = 'Barry Warsaw', ),
    }
    version = sys.version_info[:2]
    result = {
        'python_version': f'{version[0]}.{version[1]}',
    }
    eol = PYTHON_EOL.get(version)
    if eol:
        eol = eol.eol
    if not eol:
        if version[0]<3:
            eol = date(1970,1,1)
        elif version[0]==3 and version[1]<3.11:
            eol = date(1970,1,1)
    if eol is not None:
        if date.today() >= eol:
            result['is_not_supported'] = True
    return result
