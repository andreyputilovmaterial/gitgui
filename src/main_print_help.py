

from rich.console import Console
from rich.markdown import Markdown


from .GENERATED.HELP import _MD as help_md


def print_help():
    console = Console()
    renderable_markup = Markdown(help_md)
    console.print(renderable_markup)
    print("\n\n\n")
