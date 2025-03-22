// Load saved patterns when popup opens
document.addEventListener("DOMContentLoaded", function() {
    browser.storage.local.get("urlPatterns").then((result) => {
        if (result.urlPatterns) {
            document.getElementById("urlPatterns").value =
                result.urlPatterns.join("\n");
        }
    });

    // Save button handler
    document.getElementById("saveBtn").addEventListener("click", function() {
        const textareaContent = document.getElementById("urlPatterns").value;
        const patterns = textareaContent
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        browser.storage.local.set({ urlPatterns: patterns }).then(() => {
            const status = document.getElementById("status");
            status.textContent = "Saved!";
            status.classList.add("visible");

            setTimeout(() => {
                status.classList.remove("visible");
            }, 2000);
        });
    });
});
