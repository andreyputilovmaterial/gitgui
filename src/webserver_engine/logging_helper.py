
# aaahhh stupid


import sys, traceback

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
    print_console_err(f'\nError:\n{STDOUT_COLOR_RESET}Stack trace:\n')
    traceback.print_exception(e,limit=20)
    print_console_err('\n\n')
    print_console_err('Error:\n')
    print_console_err(e)
    print_console_err('')
