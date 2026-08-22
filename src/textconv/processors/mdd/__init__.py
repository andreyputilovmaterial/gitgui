# import sys
from pathlib import Path
import tempfile
from threading import Thread, Lock

global_mdd_lock = Lock()

win32com_import_success = None
win32com_import_error = None

try:
	import win32com.client
	win32com_import_success = True
except ImportError as e:
	win32com_import_success = False
	win32com_import_error = e


class MDMDocument:

    def __init__(self,mdd_path,method='open',config={}):

        self.document = None
        mdd_path = f'{Path(mdd_path).resolve()}'

        if method=='open':
            mDocument = win32com.client.Dispatch("MDM.Document")
            # openConstants_oNOSAVE = 3
            openConstants_oREAD = 1
            # openConstants_oREADWRITE = 2
            if not(Path(mdd_path).is_file()):
                raise FileNotFoundError(f'file not found: {mdd_path}')
            print(f'MDD TEXTCONV: Opening file with method Open(): "{mdd_path}"') # TODO: DEBUG:
            mDocument.Open( mdd_path, "", openConstants_oREAD )
            print(f'MDD TEXTCONV: Done') # TODO: DEBUG:
            self.document = mDocument
        elif method=='join':
            mDocument = win32com.client.Dispatch("MDM.Document")
            if not(Path(mdd_path).is_file()):
                raise FileNotFoundError(f'file not found: {mdd_path}')
            print(f'MDD TEXTCONV: Opening file with method Join(): "{mdd_path}"') # TODO: DEBUG:
            if 'Question'.lower() in [f'{ctx}'.lower() for ctx in mDocument.Contexts]:
                mDocument.Contexts.Current = 'Question'
            mDocument.Join(mdd_path, "{..}", 1, 32|16|512)
            print(f'MDD TEXTCONV: Done') # TODO: DEBUG:
            self.document = mDocument
        else:
            raise ValueError(f'MDM Open: Unknown open method, {method}')

        # self.__mdd_path = mdd_path
        # self.__read_datetime = datetime.now()



    # unlink document if some error happened, or if we are done processing it
    def __del__(self):
        if self.document is not None:
            self.document.Close()

    # strange methods required by python so that I can use "with"
    # I still don't understand why this is needed as we already have __init__ and __del__ and allll should work, why on Earth __enter__ and __exit__ are necessary????
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass



def textconv(data,filename):
    text = None
    if not win32com_import_success:
        return f'TEXTCONV MDD: win32com not available - will not be able to show MDD files ({win32com_import_error})'
    with tempfile.TemporaryDirectory() as tmp_dir:
        temp_filename = Path(tmp_dir) / Path(filename).name
        print(f'MDD TEXTCONV: Preparing local MDD at "{temp_filename}"') # TODO: DEBUG:
        with open(temp_filename,'wb') as f:
            f.write(data)
        try:
            with global_mdd_lock:
                try:
                    print(f'MDD TEXTCONV: Calling for method Open()') # TODO: DEBUG:
                    with MDMDocument(temp_filename,'open') as MDD:
                        text = MDD.document.Script
                except Exception as e:
                    print(f'MDD TEXTCONV: Failed with message "{e}"') # TODO: DEBUG:
                    print(f'MDD TEXTCONV: Calling fallback for method Join()') # TODO: DEBUG:
                    with MDMDocument(temp_filename,'join') as MDD:
                        text = MDD.document.Script
        except Exception as e:
            return f'{e}'

    return text
