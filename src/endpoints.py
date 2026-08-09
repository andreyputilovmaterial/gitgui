
import re

from .frontend.endpoints import \
    render_assets_project_specific_styles_css, \
    renderer_page_home, \
    renderer_page_version, \
    renderer_page_about, \
    renderer_page_help, \
    handle_git_command, \
    handle_request_functionality_endpoint, \
    render_assets_common_css, \
    render_assets_normalize_css, \
    render_assets_common_js, \
    render_assets_vendorlibs_vue_js, \
    render_assets_vendorlibs_marked_js, \
    render_assets_vendorlibs_dompurify_js, \
    render_assets_app_js, \
    render_assets_app_css




endpoints = {
    '/': renderer_page_home,
    '/version': renderer_page_version,
    '/about': renderer_page_about,
    '/help': renderer_page_help,
    '/assets/common.css': render_assets_common_css,
    '/assets/normalize.css': render_assets_normalize_css,
    '/assets/common.js': render_assets_common_js,
    '/assets/vendorlibs-vue.js': render_assets_vendorlibs_vue_js,
    '/assets/vendorlibs-marked.js': render_assets_vendorlibs_marked_js,
    '/assets/vendorlibs-dompurify.js': render_assets_vendorlibs_dompurify_js,
    '/assets/app.js': render_assets_app_js,
    '/assets/app.css': render_assets_app_css,
    '/assets/project-specific.css': render_assets_project_specific_styles_css,
    re.compile(r'/command\b(.*)'): handle_git_command,
    re.compile(r'/functionality\b(.*)'): handle_request_functionality_endpoint,
}
