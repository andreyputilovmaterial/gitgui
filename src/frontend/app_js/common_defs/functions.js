

export function formatDate(val) {
  const fmt = dt => {
    const formatter = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",      // omit if not wanted
        timeZoneName: "short",
    });
    const result = formatter.format(dt)
    return result
  }
  // const content = el.innerText||el.textContent;
  const content = `${val}`
  const dt = /[1-9]/.test(content) ? new Date(content) : undefined;
  // const result = dt ? `original: ${content}, converted: ${dt}` : content; // for debugging
  const result = dt ? `${fmt(dt)}` : content;
  return result
}

export const delay = function(ms) {
  return new Promise((resolve,reject)=> {setTimeout(resolve,ms)})
}
