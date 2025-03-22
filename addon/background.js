// Initialize the addon
browser.runtime.onInstalled.addListener(() => {
    // Set default values if needed
    browser.storage.local.get("urlPatterns").then((result) => {
        if (!result.urlPatterns) {
            browser.storage.local.set({ urlPatterns: [] });
        }
    });
});

// Listen for messages from content script
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "openInNewTab") {
        browser.tabs.create({ url: message.url });
        return Promise.resolve({ success: true });
    }
});
