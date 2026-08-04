
import re

from .frontend.endpoints import renderer_home, renderer_version, handle_git_command, handle_request_functionality_endpoint, render_assets_common_css, render_assets_normalize_css, render_assets_common_js, render_assets_vue_js, render_assets_app_js




endpoints = {
    '/': renderer_home,
    '/assets/common.css': render_assets_common_css,
    '/assets/normalize.css': render_assets_normalize_css,
    '/assets/common.js': render_assets_common_js,
    '/assets/vue.js': render_assets_vue_js,
    '/assets/app.js': render_assets_app_js,
    re.compile(r'/command\b(.*)'): handle_git_command,
    re.compile(r'/functionality\b(.*)'): handle_request_functionality_endpoint,
    '/version': renderer_version,
}
