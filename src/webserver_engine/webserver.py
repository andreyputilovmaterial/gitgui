
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse # for finding handler for the endpoint - we need to know path
import html # for sanitizing response on errors
import re
from .logging_helper import print_console, print_console_err, print_console_err_fulltrace, print_console_green, string_err_fulltrace

# sorry very stupid
from .logging_helper import config as logging_helper_config





class HTTP404(Exception):
    """For HTTP 404"""

class HTTP403(Exception):
    """For HTTP 404"""



class WebResponse:
    def __init__(
        self,
        status_code: int,
        content_type: str,
        body: str,
        headers: list[tuple[str,str]],
        # cookies, # can be passed in headers
    ):
        self.status_code = status_code
        self.content_type = content_type
        self.body = body
        self.headers = headers



class Webserver:
    def __init__(self,config):
        self.endpoints = {}
        self._config = config
        self.bind_host = config.get("http_host")
        self.port = config.get("http_port")
        # sorry very stupid
        # from .logging_helper import config as logging_helper_config
        for key, value in config.items():
            logging_helper_config[key] = value

    def assign_handlers(self,endpoints:dict={}):
        self.endpoints = {**self.endpoints,**endpoints}

    # def setup(self,cfg):
    #     def set_bind_host(value):
    #         self.bind_host = value
    #     def set_port(value):
    #         self.port = value
    #     def set_script_name(value):
    #         config['script_name'] = value
    #     known = {
    #         'bind_host': set_bind_host,
    #         'port': set_port,
    #         'script_name': set_script_name,
    #     }
    #     for key, value in cfg.items():
    #         if key in known:
    #             handler = known.get(key,lambda v: _err(f'webserve: Can\t parse config: [{key}] = {repr(value)}'))
    #             handler(value)
    #         else:
    #             pass
    #             # raise Exception(f'Unrecognized config field: {key}')

    def run(self):
        try:
            self.port = int(self.port)
        except Exception as e:
            raise Exception(f'Webserve: Can\'t parse port param: {self.port}') from e
        server = HTTPServer((self.bind_host, self.port), self._get_handler(self.endpoints))
        print_console_green(f'starting webserver at {self.bind_host}:{self.port}')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n\033[31mStopped (keyboard interrupt)\033[32m")
        finally:
            server.server_close()

    def _get_handler(self,endpoints):
        server = self
        class Handler(BaseHTTPRequestHandler):
            def handle_request(self):
                method = self.command
                send_body = True if not (method=='HEAD') else False
                try:

                    path = urlparse(self.path).path
                    renderer = server._get_matching_endpoint(path,endpoints)
                    assert callable(renderer), 'Whoops, renderer returned from get_matching_endpoint() must be callable'

                    response = renderer(self, config=server._config)
                    if not response.content_type:
                        response.content_type = 'text/html'

                    if not response.status_code:
                        response.status_code = 200

                    self.send_response(response.status_code)
                    for header_name, header_value in response.headers:
                        self.send_header(header_name,header_value)
                    self.send_header(f"Content-type", f"{response.content_type}; charset=utf-8")
                    self.end_headers()
                    if send_body:
                        self.wfile.write(response.body.encode("utf-8"))
                except (HTTP404,HTTP403) as e:
                    statuscode = 503
                    if isinstance(e,HTTP404):
                        statuscode = 404
                    if isinstance(e,HTTP403):
                        statuscode = 403
                    content_type = 'text/html' if not (self.headers.get("Accept",None) == "application/json") else 'application/json'
                    if not content_type:
                        content_type = 'text/html'
                    content = f'Can\t find / no access: HTTP {statuscode}'
                    renderer = endpoints.get(statuscode,None)
                    if renderer and send_body:
                        response = renderer(self, config=server._config, msg = e)
                        content = response.body

                    self.send_response(statuscode)
                    self.send_header(f"Content-type", f"{content_type}; charset=utf-8")
                    self.end_headers()
                    if send_body:
                        self.wfile.write(content.encode("utf-8"))
                except Exception as e:
                    self.send_response(500)
                    self.end_headers()
                    print_console_err_fulltrace(e)
                    if send_body:
                        try:
                            err = f'{e}'
                            err_html = html.escape(err)
                            try:
                                # several more levels to capture stacktrace, format it, convert "red" colors to spans with color red... If anything fails, there is a fallback to simpler way to just show the message
                                err_full = string_err_fulltrace(e)
                                err_html = '<br />'.join(html.escape(err_full).splitlines())
                                COLOR_MARKERS = {
                                    '@STDOUT_COLOR_RED@': '<span class="err-color-red" style="color: #990000;">',
                                    '@STDOUT_COLOR_GREEN@': '<span class="err-color-green" style="color: #009900;">',
                                    '@STDOUT_COLOR_RESET@': '</span>',
                                }
                                color_markers_re = re.compile("|".join(map(re.escape, COLOR_MARKERS)))
                                err_html = color_markers_re.sub(lambda m: COLOR_MARKERS[m.group()], err_html)
                                try:
                                    wrap_div = server._config.get("renderer_functions",{}).get("wrap_div",lambda c,m: m) # retrieve the wrapper fn
                                    err_html = wrap_div('err err-stacktrace-container',err_html) # wrap results one more time to make sure all tags are closed
                                except Exception as ee:
                                    print_console_err_fulltrace(ee)
                                    pass
                            except Exception as ee:
                                print_console_err_fulltrace(ee)
                                pass
                            self.wfile.write(("<html><body>"+err_html+"</body></html>").encode())
                        except Exception as ee:
                            print_console_err_fulltrace(ee)
                            # print fallback
                            self.wfile.write(("<html><body>"+html.escape("Error processing request")+"</body></html>").encode())

            def do_GET(self):
                self.handle_request()

            def do_HEAD(self):
                self.handle_request()

            def do_POST(self):
                self.handle_request()

            def do_PUT(self):
                self.handle_request()

            def do_DELETE(self):
                self.handle_request()

        return Handler

    @staticmethod
    def _get_matching_endpoint(path,endpoints):
        def not_found(*args,**argv):
            raise HTTP404(f'{path} was not found on the server')

        def check_if_pattern_matches(path, pattern):
            if callable(pattern):
                if pattern(f'{path}'):
                    return f'{path}'
            elif isinstance(pattern, str):
                if f'{path}' == f'{pattern}':
                    return f'{path} ' # let's add a space to increase returned piece length, that is the priority for exact match
            elif isinstance(pattern, re.Pattern):
                matches = re.match(pattern,f'{path}')
                if matches:
                    return f'{matches[0]}'
            return None

        # longest matching
        best_match = None
        best_length = -1

        for pattern, renderer in endpoints.items():
            matching_str = check_if_pattern_matches(path,pattern)
            if matching_str is not None:
                if len(matching_str) > best_length:
                    best_match = renderer
                    best_length = len(matching_str)
        if best_match:
            return best_match

        return not_found
