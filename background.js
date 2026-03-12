/**
 * Background service worker for bookmark data access.
 *
 * Content scripts do not have access to chrome.bookmarks directly,
 * so we fetch toolbar bookmarks here and return them via messaging.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_TOOLBAR_BOOKMARKS') {
    return;
  }

  chrome.bookmarks.getChildren('1')
    .then((items) => {
      const bookmarks = items
        .filter((item) => Boolean(item.url))
        .map((item) => ({
          id: item.id,
          title: item.title || '',
          url: item.url,
        }));

      sendResponse({ ok: true, bookmarks });
    })
    .catch((error) => {
      console.error('Failed to load toolbar bookmarks:', error);
      sendResponse({ ok: false, error: String(error) });
    });

  // Keep message channel open for async response.
  return true;
});
