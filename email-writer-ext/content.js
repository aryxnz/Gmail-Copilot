console.log("Email writer ext - content script loaded");

// ===== Function to Create AI Reply Button + Tone Dropdown =====
function createToolbarUI() {
    const container = document.createElement('div');
    container.className = 'ai-reply-container';

    // Main AI Reply Button
    const button = document.createElement('button');
    button.innerText = 'AI-Reply';
    button.className = 'ai-reply-button';
    
    // Tone Dropdown (split button style)
    const toneSelect = document.createElement('select');
    toneSelect.className = 'ai-tone-dropdown';
    ['Casual', 'Professional', 'Friendly'].forEach(tone => {
        const option = document.createElement('option');
        option.value = tone.toLowerCase();
        option.text = tone;
        toneSelect.appendChild(option);
    });

    // When AI-Reply is clicked
    button.addEventListener('click', async () => {
        const tone = toneSelect.value;
        await generateReply(tone, button);
    });

    container.appendChild(button);
    container.appendChild(toneSelect);

    return container;
}

// ===== Function to Find Gmail Compose Toolbar =====
function findComposeToolbar() {
    const selectors = ['.btC', '.aDh', '[role="toolbar"]', '.gU.Up'];
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar) return toolbar;
    }
    return null;
}

// ===== Function to Get Email Content =====
function getEmailContent() {
    const selectors = ['.h7', '.a3s.aiL', '.gmail_quote', '[role="presentation"]'];
    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content) return content.innerText.trim();
    }
    return '';
}

// ===== Function to Generate AI Reply =====
async function generateReply(tone, button) {
    try {
        button.innerText = 'Generating...';
        button.disabled = true;

        const emailContent = getEmailContent();
        const response = await fetch('http://localhost:8080/api/email/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                emailContent: emailContent,
                tone: tone
            })
        });

        if (!response.ok) throw new Error('API Request Failed!');

        const generatedReply = await response.text();
        const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');
        if (composeBox) {
            composeBox.focus();
            document.execCommand('insertText', false, generatedReply);
        } else {
            console.error('Compose Box was NOT Found');
        }
    } catch (error) {
        console.error(error);
        alert('Failed To Generate The Reply');
    } finally {
        button.innerText = 'AI-Reply';
        button.disabled = false;
    }
}

// ===== Function to Inject AI Button in Gmail Toolbar =====
function injectButton() {
    const existingContainer = document.querySelector('.ai-reply-container');
    if (existingContainer) existingContainer.remove();

    const toolbar = findComposeToolbar();
    if (!toolbar) {
        console.log("Toolbar not Found");
        return;
    }

    console.log("Toolbar Found, Creating AI Button");
    toolbar.insertBefore(createToolbarUI(), toolbar.firstChild);
}

// ===== Mutation Observer to Detect Compose Window =====
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (
                    node.matches?.('.aDh, .btC, [role="dialog"]') ||
                    node.querySelector?.('.aDh, .btC, [role="dialog"]')
                ) {
                    console.log("Compose Window Detected");
                    setTimeout(injectButton, 500);
                }
            }
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });
