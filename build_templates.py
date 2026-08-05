


import argparse
# from pathlib import Path
import traceback, sys
from datetime import datetime
from importlib import resources
from dataclasses import dataclass
from pathlib import Path






if __name__ == '__main__':
    # run as a program
    from src.helper_utilities import sanitize
    from src.frontend.template.minify_assets import minify_js, minify_css
elif '.' in __name__:
    # package
    from .src.helper_utilities import sanitize
    from .src.frontend.template.minify_assets import minify_js, minify_css
else:
    # included with no parent package
    from src.helper_utilities import sanitize
    from src.frontend.template.minify_assets import minify_js, minify_css



# STDOUT_COLOR_RED = "\033[91m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_GREEN = "\033[32m"


# def wrap_argparse_coloroutputs(Classname):
#     class Arg(Classname):
#


@dataclass
class Resource:
    filename: str
    payload: str



def build_normalize_css() -> Resource:
    txt = resources.files("src.frontend.template.templates").joinpath("normalize.css").read_text('utf-8')
    txt = minify_css(txt)
    return [
            Resource(
            filename = "normalize.css",
            payload = txt
        ),
    ]

def build_common_css() -> Resource:
    txt = ''
    txt += resources.files("src.frontend.template.templates").joinpath("common.css").read_text('utf-8')
    txt += resources.files("src.frontend.template.templates").joinpath("common_tables.css").read_text('utf-8')
    # txt += resources.files("src.frontend.template.templates").joinpath("project_specific.css").read_text('utf-8')
    txt = minify_css(txt)
    return [
        Resource(
            filename = "common.css",
            payload = txt
        ),
    ]

def build_projectspecific_css() -> Resource:
    txt = ''
    txt += resources.files("src.frontend.app_js").joinpath("project_specific.css").read_text('utf-8')
    txt = minify_css(txt)
    return [
        Resource(
            filename = "project-specific.css",
            payload = txt
        ),
    ]

def build_common_js() -> Resource:
    txt = ''
    txt += resources.files("src.frontend.template.templates").joinpath("common.js").read_text('utf-8')
    # txt += resources.files("src.frontend.template.templates").joinpath("app.js").read_text('utf-8')
    txt = minify_js(txt)
    return [
        Resource(
            filename = "common.js",
            payload = txt
        ),
    ]

def build_vue() -> Resource:
    txt = ''
    # uncomment for dev build
    txt += resources.files("src.frontend.template.templates").joinpath("vue.global.js").read_text('utf-8')
    # # uncomment for prod build
    # txt += resources.files("src.frontend.template.templates").joinpath("vue.runtime.global.prod.js").read_text('utf-8')
    txt = minify_js(txt)
    return [
        Resource(
            filename = "vue.js",
            payload = txt
        ),
    ]

def build_app_js() -> Resource:
    txt = ''
    txt += resources.files("src.frontend.app_js").joinpath("app.js").read_text('utf-8')
    txt = minify_js(txt)
    return [
        Resource(
            filename = "app.js",
            payload = txt
        ),
    ]


def build_py_dist() -> Resource:
    raise Exception(f'Producing make_html.py: this should not be handled by build.py, call pinliner instead')
    # return [
    #     Resource(
    #         filename = "make_html.py",
    #         payload = sanitize(txt)
    #     ),
    # ]

def build_html_template() -> Resource:
    # TEMPLATE_HTML_COPYBANNER = resources.files("src.frontend.template.templates").joinpath("copybanner.html").read_text('utf-8')
    TEMPLATE_HTML_TABLE_BEGIN = resources.files("src.frontend.template.templates").joinpath("table_begin.html").read_text('utf-8')
    TEMPLATE_HTML_TABLE_END = resources.files("src.frontend.template.templates").joinpath("table_end.html").read_text('utf-8')
    TEMPLATE_HTML_BEGIN = resources.files("src.frontend.template.templates").joinpath("html_begin.html").read_text('utf-8')
    TEMPLATE_HTML_END = resources.files("src.frontend.template.templates").joinpath("html_end.html").read_text('utf-8')
    f = ''
    f += '\n\n'
    f += 'TEMPLATE_HTML_BEGIN = r"""\n'+sanitize(TEMPLATE_HTML_BEGIN)+'\n"""\n\n'
    # f += 'TEMPLATE_HTML_END = r"""\n'+sanitize(TEMPLATE_HTML_END.replace(
    #         '{{TEMPLATE_HTML_COPYBANNER}}', TEMPLATE_HTML_COPYBANNER
    #     ))+'\n"""\n\n'
    f += 'TEMPLATE_HTML_END = r"""\n'+sanitize(TEMPLATE_HTML_END)+'\n"""\n\n'
    f += 'TEMPLATE_HTML_TABLE_BEGIN = r"""\n'+sanitize(TEMPLATE_HTML_TABLE_BEGIN)+'\n"""\n\n'
    f += 'TEMPLATE_HTML_TABLE_END = r"""\n'+sanitize(TEMPLATE_HTML_TABLE_END)+'\n"""\n\n'
    return [
        Resource(
            filename = "TEMPLATE.py",
            payload = f
        ),
        Resource(
            filename = "__init__.py",
            payload = ''
        ),
    ]

def build_blank() -> Resource:
    return [
        Resource(
            filename = "__init__.py",
            payload = ''
        ),
    ]

renderers = {
    'blank': build_blank,
    'normalize.css': build_normalize_css,
    'common_css': build_common_css,
    'projectspecific_css': build_projectspecific_css,
    'common_js': build_common_js,
    'app_js': build_app_js,
    'vue': build_vue,
    # 'project_specific.css': build_project_specific_css,
    'make_html.py': build_py_dist,
    'src_template': build_html_template,
}





def call_build_program(*argcs,**kwargs):
    time_start = datetime.now()
    script_name = 'html-template build'

    parser = argparse.ArgumentParser(
        description="Produce html template",
        prog='htmltemplate --program build'
    )
    parser.add_argument(
        '--resource',
        help='resource',
        type=str,
        choices = dict.keys(renderers),
        required=True
    )
    parser.add_argument(
        '--dest',
        help='Set dest location',
        type=str,
        required=False
    )
    # args = None
    # args_rest = None
    # if( ('arglist_strict' in config) and (not config['arglist_strict']) ):
    #     args, args_rest = parser.parse_known_args()
    # else:
    args = None
    try:
        args = parser.parse_args(*argcs,**kwargs)
    except SystemExit as e:
        print(f'{STDOUT_COLOR_RED}Error: Invalid command-line arguments{STDOUT_COLOR_RESET}',file=sys.stderr)
        raise e

    res_processed = None
    if args.resource:
        res_processed = f'{args.resource}'

    out_path = None
    if args.dest:
        out_path = Path(args.dest).resolve()

    print(f'{script_name}: script started at {time_start}')

    renderer = renderers.get(res_processed,None)
    results = None
    if not renderer:
        raise Exception(f'Can\'t build given resource and find handler: {res_processed}')
    try:
        print(f'{script_name}: building {res_processed}...')
        results = renderer()
    except Exception as e:
        print(f'{STDOUT_COLOR_RED}Failed when building {res_processed}: {e}{STDOUT_COLOR_RESET}',file=sys.stderr)
        raise e

    for result in results:
        result_fname = Path(out_path) / result.filename
        print('{script_name}: saving as "{fname}"'.format(fname=result_fname,script_name=script_name))
        with open(result_fname, "w",encoding='utf-8') as outfile:
            outfile.write(result.payload)

    time_finish = datetime.now()
    print('{script_name}: finished at {dt} (elapsed {duration})'.format(dt=time_finish,duration=time_finish-time_start,script_name=script_name))



run_programs = {
    'build': call_build_program,
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
        args = None
        args_rest = None
        try:
            args, args_rest = parser.parse_known_args()
        except SystemExit as e:
            print(f'{STDOUT_COLOR_RED}Error: Invalid command-line arguments{STDOUT_COLOR_RESET}',file=sys.stderr)
            raise e
        if args.program:
            program = f'{args.program}'
            if program in run_programs:
                run_programs[program](args_rest)
            else:
                raise AttributeError(f'program to run not recognized: {args.program}')
        else:
            print('program to run not specified')
            raise AttributeError('program to run not specified')
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
        print('Error:',file=sys.stderr)
        print('',file=sys.stderr)
        print(f'{STDOUT_COLOR_RED}{e}{STDOUT_COLOR_RESET}',file=sys.stderr)
        print('',file=sys.stderr)
        exit(1)


if __name__ == '__main__':
    main()
