
import re



def get_matching_endpoint(path,endpoints):
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
