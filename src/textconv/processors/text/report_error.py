

LINE_MARKER = 'TEXTCONF UNICODE ERROR: '

def report_unicode_decode_error(e,data,filename,encoding,bom,bom_len):
    try:
        pos = e.start
        context = data[bom_len + pos - 32:bom_len + pos + 32]

        err_msg = ''
        err_msg += LINE_MARKER + f"Filepath: {filename}" + '\n'
        err_msg += LINE_MARKER + f"Encoding: {encoding!r}" + '\n'
        err_msg += LINE_MARKER + f"BOM length: {bom_len}" + '\n'
        err_msg += LINE_MARKER + f"Error position: {pos}" + '\n'
        err_msg += LINE_MARKER + f"Bytes around error: {context.hex(' ')}" + '\n'
        err_msg += LINE_MARKER + f"Problematic bytes: {data[bom_len + e.start:bom_len + e.end].hex(' ')}" + '\n'
        return err_msg
    except Exception as e:
        return f'Exception while getting UnicodeDecodeError details: {e}'
