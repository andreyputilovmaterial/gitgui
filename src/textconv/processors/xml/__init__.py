
from bs4 import BeautifulSoup

def textconv(file,filename):
  # txt = data.decode()
  txt = file.read()
  return BeautifulSoup(txt,"html.parser").prettify()
