
from http.server import BaseHTTPRequestHandler, HTTPServer, ThreadingHTTPServer
from urllib.parse import urlparse # for finding handler for the endpoint - we need to know path
import html # for sanitizing response on errors
import re
from dataclasses import dataclass
from .helper_logger_funcs import print_console, print_console_err, print_console_err_fulltrace, print_console_green, string_err_fulltrace
from .helper_utility_funcs import sanitize_dom
from .match_endpoints import get_matching_endpoint

# sorry very stupid
from .helper_logger_funcs import config as logging_helper_config





class HTTP404(Exception):
    """For HTTP 404"""

class HTTP403(Exception):
    """For HTTP 404"""

def raise_err_404_not_found(*args,**argv):
    raise HTTP404('404 not found')

@dataclass
class WebResponse:
    status_code: int
    content_type: str
    body: str
    headers: list[tuple[str,str]]
    # cookies # can be passed in headers
    is_binary: bool = False



class Webserver:
    def __init__(self,config,is_threading=True):
        self.endpoints = {}
        self._config = config
        self.bind_host = config.get("http_host")
        self.port = config.get("http_port")
        self._is_threading_server = is_threading
        # sorry very stupid
        # from .logging_helper import config as logging_helper_config
        for key, value in config.items():
            logging_helper_config[key] = value

    def assign_handlers(self,endpoints:dict={}):
        self.endpoints = {**self.endpoints,**endpoints}

    def run(self):
        try:
            self.port = int(self.port)
        except Exception as e:
            raise Exception(f'Webserve: Can\'t parse port param: {self.port}') from e
        cls = HTTPServer
        if self._is_threading_server:
            cls = ThreadingHTTPServer
        server = cls((self.bind_host, self.port), self._get_handler(self.endpoints))
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
                    renderer = get_matching_endpoint(path,endpoints) or raise_err_404_not_found
                    assert callable(renderer), 'Whoops, renderer returned from get_matching_endpoint() must be callable'

                    response = renderer(self, config=server._config)
                    if not response.content_type:
                        response.content_type = 'text/html'

                    if not response.status_code:
                        response.status_code = 200

                    self.send_response(response.status_code)
                    for header_name, header_value in response.headers:
                        self.send_header(header_name,header_value)
                    if response.is_binary:
                        self.send_header(f"Content-type", f"{response.content_type}")
                    else:
                        self.send_header(f"Content-type", f"{response.content_type}; charset=utf-8")
                    self.end_headers()
                    if send_body:
                        if response.is_binary:
                            self.wfile.write(response.body)
                        else:
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
                    content = f'Can\'t find / no access: HTTP {statuscode}'.encode("utf-8")
                    renderer = endpoints.get(statuscode,None)
                    if renderer and send_body:
                        response = renderer(self, config=server._config, msg = e)
                        content = response.body
                        if not response.is_binary:
                            content = content.encode("utf-8")
                            self.send_header(f"Content-type", f"{content_type}; charset=utf-8")
                    self.send_response(statuscode)
                    self.end_headers()
                    if send_body:
                        self.wfile.write(content)
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
                                    err_html = sanitize_dom('err err-stacktrace-container',err_html) # wrap results one more time to make sure all tags are closed
                                except Exception as ee:
                                    print_console_err_fulltrace(ee)
                                    pass
                            except Exception as ee:
                                print_console_err_fulltrace(ee)
                                pass
                            self.wfile.write(("<html><body>"+err_html+"</body></html>").encode("utf-8"))
                        except Exception as ee:
                            print_console_err_fulltrace(ee)
                            # print fallback
                            self.wfile.write(("<html><body>"+html.escape("Error processing request")+"</body></html>").encode("utf-8"))

            def __getattr__(self, name):
                if name.startswith("do_"):
                    return self.handle_request
                raise AttributeError(name)

        return Handler
