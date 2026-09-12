
# import re
import sys, traceback
from io import StringIO


# STDOUT_COLOR_RED = "\033[91m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_GREEN = "\033[32m"



def print_error(e):
    def make_message():
        buf = StringIO()
        print('Error:\n',file=buf)
        print(f'{STDOUT_COLOR_RED}{e}{STDOUT_COLOR_RESET}',file=buf)
        print('',file=buf)
        print(f'\n{STDOUT_COLOR_RED}{STDOUT_COLOR_RESET}Stack trace:\n',file=buf)
        traceback.print_exception(e,limit=20,file=buf)
        print('\n\n',file=buf)
        txt = buf.getvalue()
        # # ANSI_COLORS = {
        # #     STDOUT_COLOR_RED: '@STDOUT_COLOR_RED@', # to be converted to <span style="color: #f00;">
        # #     STDOUT_COLOR_RESET: '@STDOUT_COLOR_RESET@',
        # #     STDOUT_COLOR_GREEN: '@STDOUT_COLOR_GREEN@',
        # # }
        # ANSI_COLORS = {
        #     STDOUT_COLOR_RED: '',
        #     STDOUT_COLOR_RESET: '',
        #     STDOUT_COLOR_GREEN: '',
        # }
        # ansi_re = re.compile("|".join(map(re.escape, ANSI_COLORS)))
        # return ansi_re.sub(lambda m: ANSI_COLORS[m.group()], txt)
        return txt
    print(make_message(),file=sys.stderr)
