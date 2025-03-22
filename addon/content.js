// Flag to prevent duplicate opens
let isProcessingClick = false;

// Function to check if current URL matches any pattern
function checkUrlPatterns(patterns, currentUrl) {
    return patterns.some((pattern) => {
        try {
            const regex = new RegExp(pattern);
            return regex.test(currentUrl);
        } catch (e) {
            // If pattern is invalid regex, treat it as plain text
            return currentUrl.includes(pattern);
        }
    });
}

// Function to handle link clicks
function handleLinkClick(e) {
    // Find closest anchor element
    const linkElement = e.target.closest("a");

    if (linkElement && linkElement.href && !isProcessingClick) {
        // Set flag to prevent duplicates
        isProcessingClick = true;

        // Prevent default action
        e.preventDefault();

        // Send message to open in new tab
        browser.runtime
            .sendMessage({
                action: "openInNewTab",
                url: linkElement.href,
            })
            .then(() => {
                // Reset flag after a short delay
                setTimeout(() => {
                    isProcessingClick = false;
                }, 100);
            })
            .catch(() => {
                // Reset flag even if there's an error
                isProcessingClick = false;
            });
    }
}

// Clean up any existing event listeners
function setupLinkHandler(shouldSetup) {
    // Remove existing listener if any
    document.removeEventListener("click", handleLinkClick, true);

    // Add new listener if needed
    if (shouldSetup) {
        document.addEventListener("click", handleLinkClick, true);
    }
}

// Initialize on load
function initialize() {
    browser.storage.local.get("urlPatterns").then((result) => {
        const patterns = result.urlPatterns || [];
        const currentUrl = window.location.href;

        // Check if current page matches any pattern
        const shouldIntercept = checkUrlPatterns(patterns, currentUrl);
        setupLinkHandler(shouldIntercept);
    });
}

// Run initialization
initialize();

// Listen for storage changes to update patterns without page reload
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.urlPatterns) {
        const currentUrl = window.location.href;
        const newPatterns = changes.urlPatterns.newValue || [];

        // Check if current page matches any pattern with the updated list
        const shouldIntercept = checkUrlPatterns(newPatterns, currentUrl);
        setupLinkHandler(shouldIntercept);
    }
});
