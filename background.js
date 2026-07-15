// Tab Auto-Grouper: groups tabs by domain, only once 2+ tabs share that domain.

const COLORS = ["blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];

const IGNORED_PROTOCOLS = ["chrome:", "chrome-extension:", "about:", "edge:"];

function getDomain(url) {
  try {
    const u = new URL(url);
    if (IGNORED_PROTOCOLS.includes(u.protocol)) return null;
    // Strip "www." for cleaner grouping
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function colorForDomain(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

async function isEnabled() {
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  return enabled;
}

async function regroupWindow(windowId) {
  if (!(await isEnabled())) return;

  const tabs = await chrome.tabs.query({ windowId });

  // Bucket tabs by domain
  const byDomain = new Map();
  for (const tab of tabs) {
    const domain = getDomain(tab.url || tab.pendingUrl);
    if (!domain) continue;
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(tab);
  }

  // Get existing groups in this window, mapped by title
  const existingGroups = await chrome.tabGroups.query({ windowId });
  const groupByTitle = new Map(existingGroups.map((g) => [g.title, g]));

  for (const [domain, domainTabs] of byDomain.entries()) {
    if (domainTabs.length < 2) continue; // don't group lone tabs

    const tabIds = domainTabs.map((t) => t.id);
    const existing = groupByTitle.get(domain);

    if (existing) {
      // Add any ungrouped tabs of this domain into the existing group
      const toAdd = domainTabs.filter((t) => t.groupId !== existing.id).map((t) => t.id);
      if (toAdd.length) {
        await chrome.tabs.group({ tabIds: toAdd, groupId: existing.id });
      }
    } else {
      // Only create a new group if these tabs aren't already grouped together
      const alreadyGrouped = domainTabs.every(
        (t) => t.groupId === domainTabs[0].groupId && t.groupId !== -1
      );
      if (alreadyGrouped) continue;

      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: domain,
        color: colorForDomain(domain),
      });
    }
  }
}

// Debounce so rapid tab events don't trigger repeated regroups
const pending = new Map();
function scheduleRegroup(windowId) {
  clearTimeout(pending.get(windowId));
  pending.set(
    windowId,
    setTimeout(() => regroupWindow(windowId), 800)
  );
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.windowId !== undefined) {
    scheduleRegroup(tab.windowId);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.windowId !== undefined) scheduleRegroup(tab.windowId);
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  scheduleRegroup(attachInfo.newWindowId);
});