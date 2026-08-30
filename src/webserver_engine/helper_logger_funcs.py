from io import StringIO
# import logging
import re
import sys, traceback
from dataclasses import dataclass
from queue import Queue
from typing import Any

from threading import Thread


# logger = logging.getLogger(__name__)


# STDOUT_COLOR_RED = "\033[91m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_GREEN = "\033[32m"


@dataclass
class Record:
    message: Any
    file: Any


# TODO: use logging module
# def configure_logging(script_name: str = "webserve") -> logging.LoggerAdapter:
#     """
#     Configure application-wide logging and return a logger carrying
#     the script name as contextual information.
#     """
#     logging.basicConfig(
#         level=logging.INFO,
#         format="%(asctime)s %(levelname)s [%(script_name)s] %(message)s",
#     )
#
#     return logging.LoggerAdapter(
#         logger,
#         {"script_name": script_name},
#     )



def worker_printer_loop(queue,_config):
    while True:
        record = queue.get()
        print(
            record.message,
            file = record.file,
            flush = True,
        )


def _err(*args):
    raise Exception(*args)

class Logger:
    def __init__(self, config: dict ):
        self.config = {**config}
        self.message_queue = Queue()
        self.initiate_worker_loop(self.message_queue,self.config,)

    def initiate_worker_loop(self, config, queue):
        thread = Thread(
            target = worker_printer_loop,
            args   = ( config, queue, ),
            daemon = True,
        )
        thread.start()
        return thread

    def log_network_request(self,message):
        self.message_queue.put(Record(message=message,file=sys.stdout))

    def print_console(self,msg):
        self.message_queue.put(Record(message=f'{self.config.get("script_name","webserve")}: {msg}',file=sys.stdout))

    def print_console_green(self,msg):
        self.message_queue.put(Record(message=f'{self.config.get("script_name","webserve")}: {STDOUT_COLOR_GREEN}{msg}{STDOUT_COLOR_RESET}',file=sys.stdout))

    def print_console_err(self,msg):
        self.message_queue.put(Record(message=f'{self.config.get("script_name","webserve")}: {STDOUT_COLOR_RED}{msg}{STDOUT_COLOR_RESET}',file=sys.stderr))

    def print_console_err_fulltrace(self,e):
        buf = StringIO()
        traceback.print_exception(e,limit=20, file=buf)
        err_stacktrace = buf.getvalue()
        txt = ''
        txt += f'{STDOUT_COLOR_RED}Error:{STDOUT_COLOR_RESET}\n{STDOUT_COLOR_RED}Stack trace:'+f'{STDOUT_COLOR_RESET}\n'
        txt += f'{STDOUT_COLOR_RED}'+''+f'{STDOUT_COLOR_RESET}\n'
        txt += f'{STDOUT_COLOR_RED}'+'Error:'+f'{STDOUT_COLOR_RESET}\n'
        txt += f'{STDOUT_COLOR_RED}{e}{STDOUT_COLOR_RESET}\n'
        txt += f'\n'
        txt += f'{STDOUT_COLOR_RED}'+err_stacktrace+f'{STDOUT_COLOR_RESET}\n\n'
        self.message_queue.put(Record(message=txt,file=sys.stderr))

    @staticmethod
    def make_err_fulltrace_message(e):
        buf = StringIO()
        print('Error:\n',file=buf)
        print(f'{STDOUT_COLOR_RED}{e}{STDOUT_COLOR_RESET}',file=buf)
        print('',file=buf)
        print(f'\n{STDOUT_COLOR_RED}{STDOUT_COLOR_RESET}Stack trace:\n',file=buf)
        traceback.print_exception(e,limit=20,file=buf)
        print('\n\n',file=buf)
        txt = buf.getvalue()
        ANSI_COLORS = {
            STDOUT_COLOR_RED: '@STDOUT_COLOR_RED@',
            STDOUT_COLOR_RESET: '@STDOUT_COLOR_RESET@',
            STDOUT_COLOR_GREEN: '@STDOUT_COLOR_GREEN@',
        }
        ansi_re = re.compile("|".join(map(re.escape, ANSI_COLORS)))
        return ansi_re.sub(lambda m: ANSI_COLORS[m.group()], txt)
