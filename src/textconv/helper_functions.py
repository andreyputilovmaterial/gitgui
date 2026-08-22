
import re


def clean_filename_from_hash(filename):
	matches = re.match(r'^\s*?(\w+?):(.*)$',filename)
	if matches:
		return matches[2]
	else:
		return filename

