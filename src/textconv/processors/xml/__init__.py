
from bs4 import BeautifulSoup

def textconv(data,filename):
  # txt = data.decode()
  txt = data
  return BeautifulSoup(txt,"html.parser").prettify()
