
import html
from bs4 import BeautifulSoup
from .common_functions import sanitize_classname, wrap_div, is_in_pinliner
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
STATIC_PATH = os.getenv("ASSET_BASE_URL", "/assets/")





def make_banner(txt) -> str:
    return wrap_div('mdmreport-banner',txt)


def make_tag(tagname,attrs,children):
    soup = BeautifulSoup("", "html.parser")
    tag = soup.new_tag(tagname)
    for attr_name, attr_value in attrs.items():
        tag[attr_name] = attr_value
    if children:
        fragment = BeautifulSoup(children, "html.parser")
        # IMPORTANT: iterate over a copy
        for child in list(fragment.contents):
            tag.append(child)
    return str(tag)

def make_meta(prop_name, prop_value):
    return make_tag('meta',{'name':prop_name,'content':prop_value},None)

def make_icon(txt):
    return make_tag('link',{'rel':'icon','href':txt},None)

def make_asset_jsembed(txt):
    soup = BeautifulSoup("", "html.parser")
    tag = soup.new_tag("script")
    tag.append(minify_js(txt))
    return str(tag)

def make_asset_cssembed(txt):
    soup = BeautifulSoup("", "html.parser")
    tag = soup.new_tag("style")
    tag.append(minify_css(txt))
    return str(tag)

def make_asset_jslink(txt,attrs={}):
    return make_tag('script',{**attrs,'src':txt},None)

def make_asset_jslinkmodule(txt,attrs={}):
    return make_asset_jslink(txt,attrs={**attrs,'type':'module'})

def make_asset_csslink(txt):
    return make_tag('link',{'rel':'stylesheet','href':txt},None)

def make_asset(type,payload) -> str:
    renderers = {
        'js-embed': make_asset_jsembed,
        'js-link': make_asset_jslink,
        'js-link-module': make_asset_jslinkmodule,
        'css-embed': make_asset_cssembed,
        'css-link': make_asset_csslink,
        'meta': make_meta,
        'icon': make_icon,
        'tag-any': make_tag,
    }
    renderer = renderers.get(type,None)
    if not renderer:
        raise Exception(f'Can\'t make asset of type {type}')
    return renderer(*payload)

def make_section(html_scripts):
    result = wrap_div('section',html_scripts)
    return result


def make_html(
    title: str,
    header_block: str,
    footer_block: str,
    h1: str,
    assets: list[tuple[str,Any]] = [],
    cssclasses: list = [],
    banners: list = [],
    sections: list = [],
) -> str:
    TEMPLATE_JS_PLUGINS = ''
    result = ''
    result += template.TEMPLATE_HTML_BEGIN.replace(
        '{{INS_TITLE}}', html.escape(title)
    ).replace(
        '{{INS_HEADER_BLOCK}}', header_block # html.escape(header_block)
    ).replace(
        '{{INS_HEADING}}', html.escape(h1)
    ).replace(
        '{{INS_BANNER}}', ''.join([make_banner(m) for m in banners])
    ).replace(
        '{{ADD_ASSETS}}', ''.join([
            make_asset(*m) \
            for m \
            in \
            [] \
            + [
                ('css-link',(f'{STATIC_PATH}normalize.css',),),
                ('css-link',(f'{STATIC_PATH}common.css',),),
                ('js-link',(f'{STATIC_PATH}common.js',),),
                ('js-embed',(TEMPLATE_JS_PLUGINS,),),
            ] \
            + assets
        ])
    ).replace(
        '{{INS_ADDEDCLASSES}}', f' {" ".join([sanitize_classname(m) for m in cssclasses])}'
    )
    result += ''.join([make_section(m) for m in sections])
    result += template.TEMPLATE_HTML_END.replace(
        '{{INS_FOOTER_BLOCK}}', footer_block # html.escape(footer_block)
    )
    return result
