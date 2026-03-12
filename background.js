/**
 * Background service worker for bookmark data access/mutations.
 *
 * Content scripts cannot call chrome.bookmarks directly, so all bookmark
 * reads/writes are brokered through message handlers in this worker.
 */
const TOOLBAR_FOLDER_ID = '1';

async function getToolbarBookmarks() {
  const items = await chrome.bookmarks.getChildren(TOOLBAR_FOLDER_ID);
  return items
    .filter((item) => Boolean(item.url))
    .map((item) => ({
      id: item.id,
      title: item.title || '',
      url: item.url,
    }));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'GET_TOOLBAR_BOOKMARKS': {
        const bookmarks = await getToolbarBookmarks();
        sendResponse({ ok: true, bookmarks });
        break;
      }

      case 'REMOVE_TOOLBAR_BOOKMARK': {
        if (!message?.bookmarkId) {
          throw new Error('Missing bookmarkId');
        }

        await chrome.bookmarks.remove(String(message.bookmarkId));
        sendResponse({ ok: true });
        break;
      }

      case 'ADD_TOOLBAR_BOOKMARK': {
        if (!message?.url) {
          throw new Error('Missing bookmark URL');
        }

        const created = await chrome.bookmarks.create({
          parentId: TOOLBAR_FOLDER_ID,
          title: message.title || new URL(message.url).hostname,
          url: message.url,
        });

        sendResponse({
          ok: true,
          bookmark: {
            id: created.id,
            title: created.title || '',
            url: created.url,
          },
        });
        break;
      }

      default:
        break;
    }
  })().catch((error) => {
    console.error('Bookmark worker message failed:', error);
    sendResponse({ ok: false, error: String(error) });
  });

  // Keep message channel open for async response.
  return true;
});
