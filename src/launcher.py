
import argparse
# from pathlib import Path
import traceback, sys





# necessary adjustment for pinliner, as how I am using it
if __name__ == '__main__':
    # run as a program
    from src.GENERATED.VERSION import _VERSION as gitgui_script_version
    # from src.GENERATED.HELP import _MD as help_md
    from src.main_print_help import print_help
    from src.main_gitgui_program import main as call_gitgui_program
    from src.main_gitgui_project_selector import main as call_gitgui_project_selector_program
elif '.' in __name__:
    # package
    from .GENERATED.VERSION import _VERSION as gitgui_script_version
    # from .GENERATED.HELP import _MD as help_md
    from .main_print_help import print_help
    from .main_gitgui_program import main as call_gitgui_program
    from .main_gitgui_project_selector import main as call_gitgui_project_selector_program
else:
    # included with no parent package
    from src.GENERATED.VERSION import _VERSION as gitgui_script_version
    # from src.GENERATED.HELP import _MD as help_md
    from src.main_print_help import print_help
    from src.main_gitgui_program import main as call_gitgui_program
    from src.main_gitgui_project_selector import main as call_gitgui_project_selector_program

gitgui_script_version = gitgui_script_version.strip()




# STDOUT_COLOR_RED = "\033[91m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_GREEN = "\033[32m"




def call_test_program(*argcs,**kwargs):
    msg = '''
hello, world! From gitgui
    '''
    print(msg)
    return True

def call_done_program(*argcs,**kwargs):
    msg = f'''
{STDOUT_COLOR_GREEN}done{STDOUT_COLOR_RESET}
    '''
    print(msg)
    return True

def call_printversion_program(*argcs,**kwargs):
    msg = gitgui_script_version
    msg = msg.strip()
    print(msg)
    return True

def call_help_program(*argcs,**kwargs):
    print_help()
    return True




run_programs = {
    'gitgui': call_gitgui_program,
    'gitgui-project-selector': call_gitgui_project_selector_program,
    'test': call_test_program,
    'done': call_done_program,
    'help': call_help_program,
    'version': call_printversion_program,
}



def main():
    try:
        parser = argparse.ArgumentParser(
            description="Universal caller of mdmtoolsap-py utilities"
        )
        parser.add_argument(
            #'-1',
            '--program',
            choices=dict.keys(run_programs),
            type=str,
            required=True
        )
        args, args_rest = parser.parse_known_args()
        if args.program:
            program = f'{args.program}' # make sure it's text
            if program in run_programs:
                run_programs[program](args_rest)
            else:
                raise Exception('program to run not recognized: {program}'.format(program=args.program))
        else:
            # print(f'{STDOUT_COLOR_RED}program to run not specified{STDOUT_COLOR_RESET}')
            raise Exception('program to run not specified')
    except Exception as e:
        # the program is designed to be user-friendly
        # that's why we reformat error messages a little bit
        # stack trace is still printed (I even made it longer to 20 steps!)
        # but the error message itself is separated and printed as the last message again

        # for example, I don't write "print('File Not Found!');exit(1);", I just write "raise FileNotFoundErro()"
        print('',file=sys.stderr)
        print('Stack trace:',file=sys.stderr)
        print('',file=sys.stderr)
        traceback.print_exception(e,limit=20)
        print('',file=sys.stderr)
        print('',file=sys.stderr)
        print('',file=sys.stderr)
        print(f'{STDOUT_COLOR_RED}Error:{STDOUT_COLOR_RESET}',file=sys.stderr)
        print('',file=sys.stderr)
        print(f'{STDOUT_COLOR_RED}{e}{STDOUT_COLOR_RESET}',file=sys.stderr)
        print('',file=sys.stderr)
        exit(1)


if __name__ == '__main__':
    main()
