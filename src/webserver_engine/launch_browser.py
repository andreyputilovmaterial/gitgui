
import threading
import webbrowser


def launch_browser(url):
    # Open browser after the server starts
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
