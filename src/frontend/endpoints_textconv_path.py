

from urllib.parse import urlparse, parse_qs # to detect path within endpoints
import re




def clean_filename_from_hash(filename):
	matches = re.match(r'^\s*?(\w+?):(.*)$',filename)
	if matches:
		return matches[2]
	else:
		return filename





def handle_textconv_request(server_instance, config: dict,added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    call_textconv = config.get('iface').get('textconv')
    try:
        parsed = urlparse(server_instance.path)
        method = server_instance.command
        params = parse_qs(parsed.query)
        filename = params.get("filepath", [""])[0]
        filename = clean_filename_from_hash(filename)
        if method=='POST':
            # Read Content-Length header
            length = int(server_instance.headers["Content-Length"])
            # Read exactly that many bytes
            file_data = server_instance.rfile.read(length)
            txt = call_textconv(file_data,filename)
            return WebResponse(
                status_code = 200,
                content_type = 'text/plain',
                body = txt,
                headers = [],
                is_binary = False,
            )
        else:
            # return WebResponse(
            #     status_code = 405,
            #     content_type = 'application/octet-stream',
            #     body = b'',
            #     headers = [],
            #     is_binary = True,
            # )
            return WebResponse(
                status_code = 405,
                content_type = 'text/plain',
                body = '',
                headers = [],
                is_binary = False,
            )
    except Exception as e:
        raise e #to increase call stack and reduce readability (joke) (but truth) - just wanted to make it explicit that errors are propagated
