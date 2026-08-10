

from urllib.parse import urlparse, parse_qs # to detect path within endpoints



from .common_functions import get_matching_endpoint



def not_implemented(*args,**argv):
    raise NotImplementedError('not implemented')




def handle_request_files_endpoint(server_instance,config={},added_data=None):
    # HTTP404 = config.get("HTTP404")
    # def not_found(*args,**argv):
    #     raise HTTP404() # hmm, maybe simply returning statuscode 404 is simpler... but webserver engine handles this exact exception
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = path_parsed.split('/')
    method = server_instance.command
    if len(path)>=3 and path[0]=='':
        path = '/'.join([]+['']+path[2:])
        renderer = get_matching_endpoint(path,endpoints) or not_found
    else:
        renderer = not_found
    try:
        return renderer(server_instance,config,added_data)
    except FileNotFoundError:
        return not_found()
    except Exception as e:
        raise e # for readability - to make it clear any exception normally passes up to webserver engine
