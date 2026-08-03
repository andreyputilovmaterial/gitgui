
import yaml

def print_config(data):
    return yaml.dump(data,sort_keys=False)
    # txt = ''
    # for key, value in data.items():
    #     txt += f'{key}: {value}\n'
