function isJuiceVaultUrl(urlStr) {
  if (!urlStr) return false;
  try {
    const u = new URL(urlStr);
    return u.protocol === 'https:' && (u.hostname === 'juicevault.xyz' || u.hostname.endsWith('.juicevault.xyz'));
  } catch (e) {
    return false;
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-lyrics') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !isJuiceVaultUrl(tab.url)) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'open-lyrics' });
  } catch (e) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        let titleEl = document.querySelector('h1[class*="SongPlayer_trackTitle"]') ||
                      document.querySelector('[class*="SongPlayer_trackTitle"]') ||
                      document.querySelector('span[class*="MiniPlayer_scrollInner"]') ||
                      document.querySelector('[class*="MiniPlayer"] span.font-semibold') ||
                      document.querySelector('[class*="trackTitle"]');

        if (!titleEl || !titleEl.textContent.trim()) {
          alert('Could not find the current track title.');
          return;
        }

        let title = titleEl.textContent.trim()
          .replace(/\(Unreleased\)/gi, '')
          .replace(/\[Unreleased\]/gi, '')
          .replace(/Unreleased/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        window.open(`https://genius.com/search?q=${encodeURIComponent('Juice WRLD ' + title)}`, '_blank', 'noopener,noreferrer');
      }
    });
  }
});

// When user clicks the extension icon, open the help panel on the page
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !isJuiceVaultUrl(tab.url)) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-help' });
  } catch (e) {}
});
