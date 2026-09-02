
import tarfile
# import zipfile



def tar_output_processor():
    with tarfile.open(fileobj=p.stdout, mode="r:") as archive:
        archive.extractall(destination)
