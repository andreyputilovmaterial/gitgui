
from .minify_assets import minify_js, minify_css



def sanitize_comment(s):
    return f'{s}'.replace('*/','*-/')

def sanitize_identifier(s):
    return s.replace("'","\\'")

def sanitize_commen_csst(s):
    return sanitize_comment(s)

def sanitize_comment_js(s):
    return sanitize_comment(s)

def make_syntax(plugin):
    name = plugin['name']
    description = plugin['description']
    js = plugin['js']
    css = plugin['css']
    def process_pipeins(scripts):
        return scripts.replace(
            '{{NAME}}', sanitize_comment(sanitize_identifier(name))
        ).replace(
            '{{DESCRIPTION}}', sanitize_comment(description)
        ).replace(
            '{{JS}}', js
        ).replace(
            '{{CSS}}', css
        )
    css_scripts = r'''
    /* {{NAME}} - css */
    /* {{DESCRIPTION}} */
{{CSS}}
'''
    js_scripts = r'''
    /* {{NAME}} - js */
    /* {{DESCRIPTION}} */
(function(){
    errorBannerReadyPromise = new Promise((resolve,reject)=>{
        function detect() {
            try {
                const _errorBannerEl = document.querySelector('#error_banner');
                if( !_errorBannerEl ) throw new Error('no error banner, stop execution of js scripts');
                resolve(_errorBannerEl);
            } catch(e) {
                throw e;
                return reject(e);
            }
        }
        document.addEventListener('DOMContentLoaded',detect)
    });
    const pluginName = '{{NAME}}';
    function printErrors(e) {
        try {
            function escapeHtml(s) {
                const dummy = document.createElement('div');
                dummy.innerText = s.replace(/\n/ig,'\\n');
                return dummy.innerHTML;
            }
            errorBannerReadyPromise.then(errorBannerEl=>{errorBannerEl.innerHTML += escapeHtml(`Error: ${pluginName}: ${e}`)+'<br />';})
        } catch(ee) {};
    }
    function wrapErrors(fn) {
        return (...a) => {
            try {
                return fn(...a);
            } catch(e) {
                printErrors(e);
                throw e;
            }
        }
    }
    try {
        {{JS}}
    } catch(e) {
        printErrors(e);
        throw e;
    }
})();
'''
    desc_comment = process_pipeins(r'''
    <!-- {{NAME}} - css & js -->
    <!-- {{DESCRIPTION}} -->
''')
    scripts = f'''
{desc_comment}
<style>
{minify_css(process_pipeins(css_scripts))}
</style>
<script>
{minify_js(process_pipeins(js_scripts))}
</script>
'''
    return scripts