


const isNotEmpty = value =>
  (typeof value === 'number') || (!!value && !(/^\s*$/.test(value)));

/*
 * The regex-text input emits `{ text, regex }`. Older code paths (e.g. the
 * initial empty value) may still pass a plain string, so treat that as
 * non-regex text.
 */
function parseMatchValue(matchValue) {
  if (matchValue && typeof matchValue === 'object') {
    return {
      text: matchValue.text ?? '',
      regex: !!matchValue.regex,
    };
  }
  return {
    text: matchValue ?? '',
    regex: false,
  };
}

function match(fieldValue, matchValue) {
  const { text, regex } = parseMatchValue(matchValue);

  if (!isNotEmpty(text))
    return true;

  const fieldStr = `${fieldValue ?? ''}`;

  if (regex) {
    try {
      return new RegExp(text).test(fieldStr);
    } catch (e) {
      // An invalid regex (e.g. while it is still being typed) matches nothing.
      return false;
    }
  }

  return fieldStr.toLowerCase().includes(`${text}`.toLowerCase());
}

export default match;
