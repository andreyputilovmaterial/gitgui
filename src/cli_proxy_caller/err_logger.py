import traceback, sys



# STDOUT_COLOR_RED = "\033[91m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_GREEN = "\033[32m"



def print_error(e,associated_info=None):
    print(f'{STDOUT_COLOR_RED}Error within cli proxy worker loop:{STDOUT_COLOR_RESET}',file=sys.stderr)
    if associated_info:
        print(f'{repr(associated_info)}',file=sys.stderr)
    print('',file=sys.stderr)
    print('Stack trace:',file=sys.stderr)
    print('',file=sys.stderr)
    traceback.print_exception(e,limit=20)
    print('',file=sys.stderr)
