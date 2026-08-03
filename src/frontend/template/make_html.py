
import html
from bs4 import BeautifulSoup
from .common_functions import sanitize, sanitize_classname, wrap_div, is_in_pinliner
from typing import Any
from dotenv import load_dotenv
import os


should_prefer_src_template_import = not is_in_pinliner()
did_import_template = False



if should_prefer_src_template_import:
    try:
        if __name__ == '__main__':
            # run as a program
            import template
            did_import_template = True
        elif '.' in __name__:
            # package
            from . import template
            did_import_template = True
        else:
            # included with no parent package
            import template
            did_import_template = True
    except ImportError:
        did_import_template = False
        pass


if not did_import_template:
    if __name__ == '__main__':
        # run as a program
        from GENERATED.TEMPLATE_COMPILED import TEMPLATE as template
        did_import_template = True
    elif '.' in __name__:
        # package
        from .GENERATED.TEMPLATE_COMPILED import TEMPLATE as template
        did_import_template = True
    else:
        # included with no parent package
        from GENERATED.TEMPLATE_COMPILED import TEMPLATE as template
        did_import_template = True

from .minify_assets import minify_js, minify_css




load_dotenv()
STATIC_PATH = os.getenv("ASSET_BASE_URL", "")






def make_banner(txt) -> str:
    return wrap_div('mdmreport-banner',txt)


def make_meta(prop_name, prop_value):
    soup = BeautifulSoup("", "html.parser")
    tag = soup.new_tag("meta")
    tag["name"] = prop_name
    tag["content"] = prop_value
    return str(tag)

def make_asset_jsembed(txt):
    return f'<script>{minify_js(txt)}</script>'

def make_asset_cssembed(txt):
    return f'<style>{minify_css(txt)}</style>'

def make_asset_jslink(txt):
    def esc_quotes(t):
        return f'{t}'.replace('"',r'\"')
    return f'<script src="{esc_quotes(txt)}"></script>'

def make_asset_csslink(txt):
    def esc_quotes(t):
        return f'{t}'.replace('"',r'\"')
    return f'<link rel="stylesheet" href="{esc_quotes(txt)}"></link>'

def make_asset(type,payload) -> str:
    renderers = {
        'js-embed': make_asset_jsembed,
        'js-link': make_asset_jslink,
        'css-embed': make_asset_cssembed,
        'css-link': make_asset_csslink,
    }
    renderer = renderers.get(type,None)
    if not renderer:
        raise Exception(f'Can\'t make asset of type {type}')
    return renderer(payload)

def make_section(html_scripts):
    result = wrap_div('section',html_scripts)
    return result


def make_html(
    title: str,
    page: str,
    h1: str,
    meta: dict = {},
    assets: list[tuple[str,Any]] = [],
    cssclasses: list = [],
    banners: list = [],
    sections: list = [],
) -> str:
    TEMPLATE_JS_PLUGINS = 'window.hello = \'hello\';' # TODO: implement
    result = ''
    result += template.TEMPLATE_HTML_BEGIN.replace(
        '{{INS_TITLE}}', html.escape(title)
    ).replace(
        '{{INS_PAGEHEADER}}', html.escape(page)
    ).replace(
        '{{INS_HEADING}}', html.escape(h1)
    ).replace(
        '{{INS_BANNER}}', ''.join([make_banner(m) for m in banners])
    ).replace(
        '{{ADD_META}}', ''.join([make_meta(prop,val) for prop,val in meta.items()])
    ).replace(
        '{{ADD_ASSETS}}', ''.join([
            make_asset(*m) \
            for m \
            in \
            [] \
            + [
                ('css-link',f'{STATIC_PATH}normalize.css'),
                ('css-link',f'{STATIC_PATH}common.css',),
                ('js-link',f'{STATIC_PATH}common.js',),
                ('js-embed',TEMPLATE_JS_PLUGINS,),
            ] \
            + assets
        ])
    ).replace(
        '{{INS_ADDEDCLASSES}}', f' {" ".join([sanitize_classname(m) for m in cssclasses])}'
    )
    result += ''.join([make_section(m) for m in sections])
    result += template.TEMPLATE_HTML_END
    return result
