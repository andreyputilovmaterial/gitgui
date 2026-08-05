
import re

from .frontend.endpoints import \
    render_assets_project_specific_styles_css, \
    renderer_page_home, \
    renderer_page_version, \
    renderer_page_about, \
    handle_git_command, \
    handle_request_functionality_endpoint, \
    render_assets_common_css, \
    render_assets_normalize_css, \
    render_assets_common_js, \
    render_assets_vue_js, \
    render_assets_app_js




endpoints = {
    '/': renderer_page_home,
    '/version': renderer_page_version,
    '/about': renderer_page_about,
    '/assets/common.css': render_assets_common_css,
    '/assets/normalize.css': render_assets_normalize_css,
    '/assets/common.js': render_assets_common_js,
    '/assets/vue.js': render_assets_vue_js,
    '/assets/app.js': render_assets_app_js,
    '/assets/project-specific.css': render_assets_project_specific_styles_css,
    re.compile(r'/command\b(.*)'): handle_git_command,
    re.compile(r'/functionality\b(.*)'): handle_request_functionality_endpoint,
}
