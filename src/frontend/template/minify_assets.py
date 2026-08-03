
import sys # for error reporting to stderr
# import warnings


csscompressor = None
_csscompressor_import_error_warning_emitted = {'emitted':False}
try:
    import csscompressor
except ImportError:
    # print(f'\033[31mCan\'t import csscompressor: please install csscompressor package; CSS are not minified!\033[0m',file=sys.stderr)
    csscompressor = None

jsmin = None
_rjsmin_import_error_warning_emitted = {'emitted':False}
try:
    from rjsmin import jsmin
except ImportError:
    # print(f'\033[31mCan\'t import rjsmin: please install rjsmin package; JS are not minified!\033[0m',file=sys.stderr)
    jsmin = None


def minify_css(txt):
    if not csscompressor:
        if not _csscompressor_import_error_warning_emitted['emitted']:
            print(f'\033[31mCan\'t import csscompressor: please install csscompressor package; CSS are not minified!\033[0m',file=sys.stderr)
            # warnings.warn(f'\033[31mCan\'t import csscompressor: please install csscompressor package; CSS are not minified!\033[0m',ImportWarning)
            _csscompressor_import_error_warning_emitted['emitted'] = True
        return txt
    return csscompressor.compress(txt)

def minify_js(txt):
    if not jsmin:
        if not _rjsmin_import_error_warning_emitted['emitted']:
            print(f'\033[31mCan\'t import rjsmin: please install rjsmin package; JS are not minified!\033[0m',file=sys.stderr)
            # warnings.warn(f'\033[31mCan\'t import rjsmin: please install rjsmin package; JS are not minified!\033[0m',ImportWarning)
            _rjsmin_import_error_warning_emitted['emitted'] = True
        return txt
    return jsmin(txt)

