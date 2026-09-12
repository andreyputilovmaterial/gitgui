

from urllib.parse import urlparse, parse_qs # to detect path within endpoints
import re
import json

from .common_functions import JSONEncoder





def sanitize_filename_remove_hash(filename):
	matches = re.match(r'^\s*?(\w+?):(.*)$',filename)
	if matches:
		return matches[2]
	else:
		return filename



class HTTPBodyReader:
    def __init__(self, rfile, content_length):
        self.rfile = rfile
        self.remaining = content_length

    def read(self, size=-1):
        if self.remaining == 0:
            return b""

        if size < 0 or size > self.remaining:
            size = self.remaining

        data = self.rfile.read(size)
        self.remaining -= len(data)
        return data


class ChunkedReader:
    def __init__(self, rfile):
        self.rfile = rfile
        self.remaining = 0
        self.finished = False

    def _readline(self):
        line = self.rfile.readline()
        if not line:
            raise ConnectionError("Unexpected EOF while reading chunk header")
        return line

    def _next_chunk(self):
        line = self._readline()

        # Ignore chunk extensions for now:
        # "5;foo=bar" -> "5"
        size_text = line.split(b";", 1)[0].strip()

        try:
            size = int(size_text, 16)
        except ValueError:
            raise ValueError(f"Invalid chunk size: {size_text!r}")

        if size == 0:
            self.finished = True

            # Consume trailers until the empty line.
            while True:
                line = self._readline()
                if line in (b"\r\n", b"\n"):
                    break

            return

        self.remaining = size

    def read(self, size=-1):
        if self.finished:
            return b""

        result = bytearray()

        while size < 0 or len(result) < size:
            if self.remaining == 0:
                self._next_chunk()

                if self.finished:
                    break

            to_read = self.remaining

            if size >= 0:
                to_read = min(to_read, size - len(result))

            data = self.rfile.read(to_read)

            if len(data) != to_read:
                raise ConnectionError("Unexpected EOF inside chunk")

            result.extend(data)
            self.remaining -= len(data)

            if self.remaining == 0:
                # Every chunk is followed by CRLF.
                ending = self.rfile.read(2)
                if ending != b"\r\n":
                    raise ValueError("Invalid chunk ending")

        return bytes(result)



def handle_textconv_request(net_request_handler, config: dict,added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    call_textconv_from_stream = config.get('iface').get('textconv_from_stream')

    parsed = urlparse(net_request_handler.path)
    method = net_request_handler.command
    params = parse_qs(parsed.query)
    filename = params.get("filepath", [""])[0]
    filename = sanitize_filename_remove_hash(filename)
    if method=='POST':
        # # Read Content-Length header
        # length = int(net_request_handler.headers["Content-Length"])
        # # Read exactly that many bytes
        # file_data = net_request_handler.rfile.read(length)
        # # try:
        # txt = call_textconv_from_data(file_data,filename)
        txt = call_textconv_from_stream(net_request_handler.request_body,filename)
        return WebResponse(
            status_code = 200,
            content_type = 'text/plain',
            body = txt,
            headers = [],
            is_binary = False,
        )
        # except Exception as e:
        #     return WebResponse(
        #         status_code = 503,
        #         content_type = 'application/json',
        #         body = json.dumps({'status':'error','error':f'Textconv: failed with message: "{e}" when handling request for {filename}'}, cls=JSONEncoder),
        #         headers = [],
        #         is_binary = False,
        #     ) 
    else:
        return WebResponse(
            status_code = 405,
            content_type = 'text/plain',
            body = '',
            headers = [],
            is_binary = False,
        )
