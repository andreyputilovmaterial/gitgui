
import html # for escaping
from urllib.parse import urlparse, parse_qs # to detect ?embed=1
import re # to detect ?embed=1 flag
import random # to print #help to container with random id - should not be needed because of proper design and isolation via iframe, but we have it for now



from .template.make_html import make_html
from .icon import make_icon



def render_block_banner_config_git_folders(config):
    return f'''
<div class="banner-global-folder-props">
    <p class="mdmreport-prop-row">Git work tree folder: <code>{html.escape(""+config.get("dir_work_tree"))}</code></p>
    <p class="mdmreport-prop-row">Git repo folder: <code>{html.escape(""+config.get("dir_git_repo"))}</code></p>
</div>
'''


def render_block_header_nav():
    return '''
<div class="gitgui-html-page-navigation">
    <ul>
        <li navigation-role="home"><a href="/" target="_blank">Home</a></li>
        <li navigation-role="about"><a href="/about" target="_blank">About</a></li>
        <li navigation-role="version"><a href="/version" target="_blank">Version</a></li>
        <li navigation-role="help"><a href="/help" target="_blank">Help</a></li>
        <li navigation-role="help"><a href="/testpage" target="_blank">Test page</a></li>
    </ul>
</div>
'''


def render_block_html_page_navigatation_block(pagename,config):
    banner_gitguiapp_folders_config = render_block_banner_config_git_folders(config)
    nav = render_block_header_nav()
    return f'''
<div class="gitgui-html-page-header-outer">
    <div class="gitgui-html-page-header">
        <div class="gitgui-html-pagename">{pagename}</div>
        {nav}
    </div>
    {banner_gitguiapp_folders_config}
</div>
'''


def check_query_string_flag(server_instance,param_name):
    parsed = urlparse(server_instance.path)
    params = parse_qs(parsed.query)
    flag = params.get(param_name, ["0"])[0]
    flag = flag.strip()
    if re.match(r'^\s*\d+\s*$',flag):
        return not not int(flag)
    elif re.match(r'^\s*(?:yes|true)\s*$',flag,flags=re.I):
        return True
    elif re.match(r'^\s*(?:no|false)\s*$',flag,flags=re.I):
        return False
    else:
        return not not flag


def make_default_assets_list(config):
    return [
        ('icon',(make_icon(),),),
        ('meta',('git-gui:datetime-process-started',config.get("time_start"),)),
        ('meta',('git-gui:script-name',config.get("script_name"),)),
        ('meta',('git-gui:script-version',config.get("credentials:version"),)),
        ('meta',('git-gui:git-work-tree-folder',config.get("dir_work_tree"),)),
        ('meta',('git-gui:git-repo-folder',config.get("dir_git_repo"),)),
        ('meta',('app:author',config.get("credentials:name"),)),
        ('meta',('app:version',config.get("credentials:version"),)),
        ('meta',('keywords','git gui',)),
        ('css-link',('/assets/vendorlibs/fonts/ibm-plex-sans/css/ibm-plex-sans-all.css',),),
        ('css-link',('/assets/vendorlibs/fonts/ibm-plex-mono/css/ibm-plex-mono-all.css',),),
        ('css-link',('/assets/project-specific.css',),),
    ]


def render_page_home(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    year = config.get("credentials:year")

    title = f'git - {html.escape(config.get("dir_work_tree"))}'
    page_h1 = f'git - {html.escape(config.get("dir_work_tree"))}'

    page_body = make_html(
        title = title,
        header_block = render_block_html_page_navigatation_block(pagename='git-gui app', config=config),
        footer_block = f'@AP 2026-{html.escape(year)}',
        h1 = page_h1,
        assets = [] + \
            make_default_assets_list(config) + \
            [
                ('tag-any',('script',{'type':'importmap'},'{ "imports": { "vue": "./assets/vendorlibs/vue.js" } }',),),
                # ('js-link',('/assets/vendorlibs/vue.js',),),
                ('js-link-module',('/assets/app.js',),),
            ],
        body_css_classes= ['gitgui','gitgui-page-home','gitui-embed' if check_query_string_flag(server_instance,'embed') else '',],
        banners = [
            # render_block_banner_config_git_folders(config),
        ],
        sections = ['<div class="container"><div id="gitui_app"></div></div>'],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )



def render_page_version(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    version = config.get("credentials:version")
    version = f'{version}'.strip()
    year = config.get("credentials:year")

    title = f'git ui - version'
    page_h1 = f'Version'

    page_body = make_html(
        title = title,
        header_block = render_block_html_page_navigatation_block(pagename='Version', config=config),
        footer_block = f'@AP 2026-{html.escape(year)}',
        h1 = page_h1,
        assets = [] + \
            make_default_assets_list(config) + \
            [
            ],
        body_css_classes= ['gitgui','gitgui-page-version','gitui-embed' if check_query_string_flag(server_instance,'embed') else '',],
        banners = [
            # render_block_banner_config_git_folders(config),
        ],
        sections = [f'<div class="container"><span>Version: <span class="version-string">{version}</span></span></div>'],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )



def render_page_about(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    version = config.get("credentials:version")
    version = f'{version}'.strip()
    year = config.get("credentials:year")
    myname = config.get("credentials:name")

    title = f'git ui - about'
    page_h1 = f'About'

    page_body = make_html(
        title = title,
        header_block = render_block_html_page_navigatation_block(pagename='About', config=config),
        footer_block = f'@AP 2026-{html.escape(year)}',
        h1 = page_h1,
        assets = [] + \
            make_default_assets_list(config) + \
            [
            ],
        body_css_classes= ['gitgui','gitgui-page-about','gitui-embed' if check_query_string_flag(server_instance,'embed') else '',],
        banners = [
            # render_block_banner_config_git_folders(config),
        ],
        sections = [
            f'''
<div class="container">
    <div>
        <p>{html.escape(myname)}</p>
    </div>
    <div>
        <p>Version: <span class="version-string">{html.escape(version)}</span></p>
    </div>
    <div>
        <p>@ 2026-{html.escape(year)}</p>
    </div>
</div>
'''
        ],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )



def render_page_help(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    version = config.get("credentials:version")
    version = f'{version}'.strip()
    year = config.get("credentials:year")
    myname = 'Andrey.Putilov@materialplus.io'

    title = f'git ui - help'
    page_h1 = f'Help'

    block_main_section = f'''
<div class="container">
<div>
<div id="id_help_placeholder_7256347265" class="helppage-fetch-content gitgui-fetched-content">Loading, please wait...</div>
''' + '''
<script>
(async function() {
try {
    async function embedStyles(document) {
        const txt = '.helppage-fetch-content { /* margin: 56px 0 56px; */ }';
        const style = document.createElement('style');
        style.textContent = txt;
        target = document.head || document;
        target.append(style);
    }
    async function fetchHelpPage() {
        const response = await fetch('/functionality/config');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const config = await response.json();
        return config.help_pages;
    };
    const promisePageReady = new Promise((resolve,reject) => {
        document.addEventListener("DOMContentLoaded", () => {
            try{
                resolve(document);
            } catch(e) {
                reject(e);
            }
        });
    });
    const promiseTargetReady = new Promise((resolve,reject) => {
        promisePageReady.then(
            document => {
                try{
                    const targetEl = document.querySelector('#id_help_placeholder_7256347265');
                    if(!!targetEl)
                        resolve(targetEl);
                    else
                        reject('Fetching page contents: placeholder id not found');
                } catch(e) {
                    reject(e);
                }
            },
            e => reject(e),
        );
    });
    promisePageReady.then(embedStyles);
    const help_text_md = await fetchHelpPage();
    const helpFormatted = DOMPurify.sanitize(marked.parse(help_text_md));
    targetEl = await promiseTargetReady;
    targetEl.innerHTML = helpFormatted;
} catch(e) {
    console.error(e);
    const targetEl = document.querySelector('#id_help_placeholder_7256347265');
    targetEl.innerHTML = '<div class="error"></div>';
    targetEl.querySelector('.error').textContent = `${e}`;
}
})();
</script>
''' + f'''
</div>
</div>
'''
    def id_char():
        chardict = 'abcdefghigklmnopqrstuvwxwz_0123456789'
        return random.choice(chardict)
    id = 'id_help_placeholder_ran_'+''.join([id_char() for _ in range(0,10)])
    block_main_section = block_main_section.replace('id_help_placeholder_7256347265',id)

    page_body = make_html(
        title = title,
        header_block = render_block_html_page_navigatation_block(pagename='Help', config=config),
        footer_block = f'@AP 2026-{html.escape(year)}',
        h1 = page_h1,
        assets = [] + \
            make_default_assets_list(config) + \
            [
        ('js-link',('/assets/vendorlibs/marked.js',),),
        ('js-link',('/assets/vendorlibs/dompurify.js',),),
            ],
        body_css_classes= ['gitgui','gitgui-page-help','gitui-embed' if check_query_string_flag(server_instance,'embed') else '',],
        banners = [
            # render_block_banner_config_git_folders(config),
        ],
        sections = [
            block_main_section,
        ],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )

def render_page_test(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    page_body = '''
<!doctype html>
<html>
<head>
  <style>
    body { font-family: sans-serif; }
  </style>
</head>
<body>
  <h1>Test</h1>
  <p>Hello.</p>
</body>
</html>
'''
    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )
