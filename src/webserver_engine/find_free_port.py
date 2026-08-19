import socket

def find_free_port(host="127.0.0.1", start=5180):
    port = start

    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, port))
                return port
            except OSError:
                port += 1
