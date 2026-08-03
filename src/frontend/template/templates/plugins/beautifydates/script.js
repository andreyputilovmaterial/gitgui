    /* === beautify dates js === */
function beautifyDates() {
    const elements = document.querySelectorAll('[data-role="date"]');
    Array.prototype.forEach.call(elements,function(el) {
        const content = el.innerText||el.textContent;
        const dt = /[1-9]/.test(content) ? new Date(content) : undefined;
        // const result = dt ? `original: ${content}, converted: ${dt}` : content; // for debugging
        const result = dt ? `${dt}` : content;
        el.innerText = result;
    });
}
window.addEventListener('mdmdocument',wrapErrors(beautifyDates));
window.addEventListener('mdmtable',wrapErrors(beautifyDates));
