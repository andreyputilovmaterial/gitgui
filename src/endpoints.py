
import re

from .frontend.endpoints import (
    render_page_home,
    render_page_version,
    render_page_about,
    render_page_help,
    render_page_test,
    renderer_assets,
    handle_git_command,
    handle_request_functionality_endpoint,
    handle_request_files_endpoint,
)




endpoints = {
    '/': render_page_home,
    '/version': render_page_version,
    '/about': render_page_about,
    '/help': render_page_help,
    '/testpage': render_page_test,

    re.compile('^/assets/.*'): renderer_assets,

    re.compile(r'/command\b(.*)'): handle_git_command,

    re.compile(r'/functionality\b(.*)'): handle_request_functionality_endpoint,

    re.compile(r'/files\b(.*)'): handle_request_files_endpoint,
}
