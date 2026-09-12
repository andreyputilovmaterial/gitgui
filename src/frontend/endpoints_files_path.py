

from urllib.parse import urlparse, parse_qs # to detect path within endpoints



from .common_functions import get_matching_endpoint



def not_implemented(*args,**argv):
    raise NotImplementedError('not implemented')




def handle_request_files_endpoint(net_request_handler, config: dict,added_data=None):
    path_with_query = net_request_handler.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = path_parsed.split('/')
    method = net_request_handler.command
    if len(path)>=3 and path[0]=='':
        path = '/'.join([]+['']+path[2:])
        renderer = get_matching_endpoint(path,endpoints) or not_found
    else:
        renderer = not_found
    try:
        return renderer(net_request_handler,config,added_data)
    except FileNotFoundError:
        return not_found()
    except Exception as e:
        raise e # for readability - to make it clear any exception normally passes up to webserver engine
