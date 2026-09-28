
from bs4 import BeautifulSoup
from io import BytesIO



def consume_all_and_emit_as_chunks(buffer):
    while True:
        chunk = buffer.read()
        if not chunk:
            break
        yield chunk





def textconv(file,filename):
  # txt = data.decode()
  # txt = file.read()
  data = BytesIO()
  for p in consume_all_and_emit_as_chunks(file):
    data.write(p)
  data.seek(0)
  return BeautifulSoup(data,"html.parser").prettify()
