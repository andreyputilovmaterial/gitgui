
import re

from .frontend.endpoints import \
    renderer_page_home, \
    renderer_page_version, \
    renderer_page_about, \
    renderer_page_help, \
    renderer_assets, \
    handle_git_command, \
    handle_request_functionality_endpoint, \
    handle_request_files_endpoint




endpoints = {
    '/': renderer_page_home,
    '/version': renderer_page_version,
    '/about': renderer_page_about,
    '/help': renderer_page_help,

    re.compile('^/assets/.*'): renderer_assets,

    re.compile(r'/command\b(.*)'): handle_git_command,

    re.compile(r'/functionality\b(.*)'): handle_request_functionality_endpoint,

    re.compile(r'/files\b(.*)'): handle_request_files_endpoint,
}
