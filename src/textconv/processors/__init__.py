

from .text import textconv as process_text
from .mdd import textconv as textconv_mdd
from .markitdown import textconv as textconv_md
from .xml import textconv as textconv_xml

matches = [
    ( ['.mdd'], 'mdd' ),
    ( ['.zip','.7z','.tar','.gz','.bzip','.gzip','.rar'], 'archive' ),
    ( ['.xlsx','.xls','.xlsm','.doc','.docs','pptx','.ppt',], 'office' ),
    ( ['.md','.pdf',], 'md' ),
    ( ['.ddf',], 'binary' ),
    ( ['.raw',], 'binary' ),
    ( ['.mqd','.mqd',], 'xml' ),
    ( ['.jpg','.jpeg','.png','.dng','.gif','.svg','.webp','heic'], 'image' ),
]

processors = {
    'spss': lambda d,f: 'TEXTCONV: spss textconv: not implemented',
    'csv': lambda d,f: 'TEXTCONV: csv textconv: not implemented',
    'archive': lambda d,f: 'TEXTCONV: archive textconv: not implemented',
    'office': textconv_md,
    'md': textconv_md,
    'mdd': textconv_mdd,
    'xml': textconv_xml,
    'image': lambda d,f: 'TEXTCONV: image textconv: not implemented',
    'text': process_text,
    'binary': lambda d,f: 'TEXTCONV: binary file, can\'t be shown as text',
}
