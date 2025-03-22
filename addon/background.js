// Initialize the addon
browser.runtime.onInstalled.addListener(() => {
  // Set default values if needed
  browser.storage.local.get("urlPatterns").then((result) => {
    if (!result.urlPatterns) {
      browser.storage.local.set({ urlPatterns: [] });
    }
  });

  // Initialize tab origin tracking
  browser.storage.local.set({ tabOrigins: {} });
});

// Listen for messages from content script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "openInNewTab") {
    // Get the current active tab
    return browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (tabs.length === 0) {
          return browser.tabs.create({ url: message.url });
        }

        const currentTab = tabs[0];

        // Get tab origin tracking data
        return browser.storage.local.get("tabOrigins").then((result) => {
          const tabOrigins = result.tabOrigins || {};
          const currentTabId = currentTab.id.toString();

          // Find the index where the new tab should be inserted
          let targetIndex;

          if (tabOrigins[currentTabId]) {
            // If we've opened tabs from this source before, place after the last one
            targetIndex = tabOrigins[currentTabId].lastTabIndex + 1;
          } else {
            // First tab from this source, place right after source
            targetIndex = currentTab.index + 1;
          }

          // Create the new tab at the calculated position
          return browser.tabs
            .create({
              url: message.url,
              index: targetIndex,
              openerTabId: currentTab.id,
            })
            .then((newTab) => {
              // Update the origin tracking with this new tab info
              tabOrigins[currentTabId] = {
                lastTabIndex: newTab.index,
                lastTabId: newTab.id,
              };

              // Save the updated tracking data
              return browser.storage.local
                .set({ tabOrigins: tabOrigins })
                .then(() => newTab);
            });
        });
      })
      .then(() => {
        return { success: true };
      });
  }
});

// Listen for tab close events to clean up our tracking data
browser.tabs.onRemoved.addListener((tabId) => {
  browser.storage.local.get("tabOrigins").then((result) => {
    const tabOrigins = result.tabOrigins || {};
    const tabIdStr = tabId.toString();

    // Remove this tab if it was a source
    if (tabOrigins[tabIdStr]) {
      delete tabOrigins[tabIdStr];
      browser.storage.local.set({ tabOrigins: tabOrigins });
    }

    // Check if this tab was the last tab of any source
    Object.keys(tabOrigins).forEach((sourceId) => {
      if (tabOrigins[sourceId].lastTabId === tabId) {
        // Find the new "last tab" from this source by querying all tabs
        browser.tabs.query({}).then((allTabs) => {
          // Filter tabs that have this tab as opener
          const childTabs = allTabs.filter(
            (tab) => tab.openerTabId === parseInt(sourceId),
          );

          if (childTabs.length > 0) {
            // Sort by index to find the last one
            childTabs.sort((a, b) => b.index - a.index);
            const lastChild = childTabs[0];

            // Update the record
            tabOrigins[sourceId].lastTabIndex = lastChild.index;
            tabOrigins[sourceId].lastTabId = lastChild.id;
            browser.storage.local.set({ tabOrigins: tabOrigins });
          } else {
            // No more children, reset to just after the source
            browser.tabs
              .get(parseInt(sourceId))
              .then((sourceTab) => {
                tabOrigins[sourceId].lastTabIndex = sourceTab.index;
                browser.storage.local.set({ tabOrigins: tabOrigins });
              })
              .catch(() => {
                // Source tab no longer exists, remove record
                delete tabOrigins[sourceId];
                browser.storage.local.set({ tabOrigins: tabOrigins });
              });
          }
        });
      }
    });
  });
});
