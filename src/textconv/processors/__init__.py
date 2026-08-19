

from .text import textconv as process_text

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
    'office': lambda d,f: 'TEXTCONV: markitdown textconv: not implemented',
    'md': lambda d,f: 'TEXTCONV: markitdown textconv: not implemented',
    'mdd': lambda d,f: 'TEXTCONV: mdd textconv: not implemented',
    'xml': lambda d,f: 'TEXTCONV: xml textconv: not implemented',
    'text': process_text,
    'binary': lambda d,f: 'TEXTCONV: binary file, can\'t be shown as text',
}
