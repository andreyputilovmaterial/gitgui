
# aaahhh stupid


import sys, traceback, io
import re

# from .globals import config
config = {}

# STDOUT_COLOR_RED = "\033[91m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_GREEN = "\033[32m"


def _err(*ars):
    raise Exception(*args)

def print_console(msg):
    return print(f'{config.get("script_name","webserve")}: {msg}')

def print_console_green(msg):
    return print(f'{config.get("script_name","webserve")}: {STDOUT_COLOR_GREEN}{msg}{STDOUT_COLOR_RESET}', flush=True)

def print_console_err(msg):
    return print(f'{config.get("script_name","webserve")}: {STDOUT_COLOR_RED}{msg}{STDOUT_COLOR_RESET}',file=sys.stderr)

def print_console_err_fulltrace(e):
    print_console_err(f'\n{STDOUT_COLOR_RED}Error:\n{STDOUT_COLOR_RESET}Stack trace:\n')
    traceback.print_exception(e,limit=20)
    print_console_err('\n\n')
    print_console_err('Error:\n')
    print_console_err(f'{STDOUT_COLOR_RED}{e}{STDOUT_COLOR_RESET}')
    print_console_err('')

def string_err_fulltrace(e):
    buf = io.StringIO()
    print('Error:\n',file=buf)
    print(f'{STDOUT_COLOR_RED}{e}{STDOUT_COLOR_RESET}',file=buf)
    print('',file=buf)
    print(f'\n{STDOUT_COLOR_RED}{STDOUT_COLOR_RESET}Stack trace:\n',file=buf)
    traceback.print_exception(e,limit=20,file=buf)
    print('\n\n',file=buf)
    txt = buf.getvalue()
    ANSI_COLORS = {
        STDOUT_COLOR_RED: '@STDOUT_COLOR_RED@',
        STDOUT_COLOR_RESET: '@STDOUT_COLOR_RESET@',
        STDOUT_COLOR_GREEN: '@STDOUT_COLOR_GREEN@',
    }
    ansi_re = re.compile("|".join(map(re.escape, ANSI_COLORS)))
    return ansi_re.sub(lambda m: ANSI_COLORS[m.group()], txt)
