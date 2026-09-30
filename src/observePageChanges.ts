export function observePageChanges(
  doc: Document,
  onChange: () => void,
): () => void {
  let debounceTimer: number | undefined;
  let maxWaitTimer: number | undefined;
  let lastUrl = doc.URL;

  function clearTimers() {
    window.clearTimeout(debounceTimer);
    window.clearTimeout(maxWaitTimer);

    debounceTimer = undefined;
    maxWaitTimer = undefined;
  }

  function notifyChange() {
    lastUrl = doc.URL;
    clearTimers();
    onChange();
  }

  function scheduleChange() {
    window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(notifyChange, 300);

    if (maxWaitTimer === undefined) {
      maxWaitTimer = window.setTimeout(notifyChange, 1500);
    }
  }

  const observer = new MutationObserver(scheduleChange);

  observer.observe(doc, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      "src",
      "srcset",
      "alt",
      "content",
      "href",
      "data-price",
      "aria-selected",
      "aria-checked",
    ],
  });

  const urlTimer = window.setInterval(() => {
    if (doc.URL !== lastUrl) {
      lastUrl = doc.URL;
      scheduleChange();
    }
  }, 500);

  return () => {
    observer.disconnect();
    window.clearInterval(urlTimer);
    clearTimers();
  };
}
