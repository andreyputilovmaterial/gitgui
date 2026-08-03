


from importlib import resources

from .template_make_js_plugin_code import make_syntax as make_plugin_html
from .minify_assets import minify_js, minify_css





TEMPLATE_HTML_COPYBANNER = resources.files("src.templates").joinpath("copybanner.html").read_text('utf-8')

TEMPLATE_HTML_TABLE_BEGIN = resources.files("src.templates").joinpath("table_begin.html").read_text('utf-8')

TEMPLATE_HTML_TABLE_END = resources.files("src.templates").joinpath("table_end.html").read_text('utf-8')

TEMPLATE_HTML_BEGIN = resources.files("src.templates").joinpath("html_begin.html").read_text('utf-8')

TEMPLATE_HTML_END = resources.files("src.templates").joinpath("html_end.html").read_text('utf-8')



# plugins
PLUGIN_BEAUTIFYDATES_JS = resources.files("src.templates.plugins.beautifydates").joinpath("script.js").read_text('utf-8')
PLUGIN_BEAUTIFYDATES_JS = minify_js(PLUGIN_BEAUTIFYDATES_JS)
PLUGIN_BEAUTIFYDATES_CSS = resources.files("src.templates.plugins.beautifydates").joinpath("script.css").read_text('utf-8')
PLUGIN_BEAUTIFYDATES_CSS = minify_css(PLUGIN_BEAUTIFYDATES_CSS)




# plugin common code (launcher)
PLUGINS_COMMON_JS = resources.files("src.templates").joinpath("common.js").read_text('utf-8')
PLUGINS_COMMON_JS = minify_js(PLUGINS_COMMON_JS)



# plugins
plugins = [
    {
        'name': 'beaufitydates',
        'description': 'Format dates',
        'css': PLUGIN_BEAUTIFYDATES_CSS,
        'js': PLUGIN_BEAUTIFYDATES_JS,
    },

    {
        'name': 'common',
        'description': 'Common code (launcher)',
        'css': '',
        'js': PLUGINS_COMMON_JS,
    },
]


TEMPLATE_HTML_SCRIPTS = ''.join([
    make_plugin_html(plugin) for plugin in plugins
])




TEMPLATE_HTML_BEGIN = TEMPLATE_HTML_BEGIN


TEMPLATE_HTML_END = TEMPLATE_HTML_END.replace(
        '{{TEMPLATE_HTML_COPYBANNER}}', TEMPLATE_HTML_COPYBANNER
    )
