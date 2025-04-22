// Content script to handle text selection and communicate with popup
console.log('Text Scanner content script loaded and running');

let isHighlightMode = false;
let selectedText = '';
let lastSelectedText = '';
let definitionPopup = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getSelectedText':
            sendResponse({ text: window.getSelection().toString().trim() });
            break;
        case 'toggleHighlight':
            isHighlightMode = request.enable;
            if (isHighlightMode) {
                document.body.style.cursor = 'text';
                document.addEventListener('mouseup', handleTextSelection);
            } else {
                document.body.style.cursor = 'default';
                document.removeEventListener('mouseup', handleTextSelection);
            }
            break;
    }
    return true;
});

function handleTextSelection(event) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text !== selectedText) {
        selectedText = text;
        chrome.runtime.sendMessage({
            action: 'textSelected',
            text: text
        });
    }
}

// Add custom styles for highlighted text
const style = document.createElement('style');
style.textContent = `
    .text-scanner-highlight {
        background-color: #ffd700;
        transition: background-color 0.3s ease;
    }
    .text-scanner-highlight:hover {
        background-color: #ffed4a;
    }
`;
document.head.appendChild(style);

// Function to highlight text
function highlightSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'text-scanner-highlight';
    
    try {
        range.surroundContents(span);
        selection.removeAllRanges();
    } catch (e) {
        console.error('Could not highlight selection:', e);
    }
}

// Add click event listener for highlighting
document.addEventListener('click', (e) => {
    if (!isHighlightMode) return;
    
    const selection = window.getSelection();
    if (selection.toString().trim()) {
        highlightSelection();
    }
});

// Create and add the popup styles
const popupStyles = document.createElement('style');
popupStyles.textContent = `
    .text-scanner-highlight {
        background-color: #ffd700;
        transition: background-color 0.3s ease;
    }
    .text-scanner-highlight:hover {
        background-color: #ffed4a;
    }
    .definition-popup {
        position: absolute;
        max-width: 400px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 999999;
        animation: fadeIn 0.2s ease-out;
    }
    .definition-popup::before {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid white;
        filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1));
    }
    .definition-popup.above::before {
        top: -8px;
        bottom: auto;
        border-top: none;
        border-bottom: 8px solid white;
    }
    .definition-popup .word {
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .definition-popup .word .type {
        font-size: 12px;
        color: #7f8c8d;
        font-weight: normal;
    }
    .definition-popup .definition {
        color: #34495e;
        line-height: 1.5;
        margin: 0;
    }
    .definition-popup .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        color: #666;
    }
    .definition-popup .error {
        color: #e74c3c;
        margin: 8px 0;
        padding: 8px;
        background: #fde8e8;
        border-radius: 4px;
        font-size: 13px;
    }
    .definition-popup .debug-info {
        margin-top: 8px;
        font-size: 11px;
        color: #666;
        font-family: monospace;
        white-space: pre-wrap;
        background: #f8f9fa;
        padding: 4px;
        border-radius: 4px;
    }
    .definition-popup .suggestions {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #eee;
    }
    .definition-popup .suggestions-title {
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 8px;
        font-size: 13px;
    }
    .definition-popup .ai-explanation {
        color: #34495e;
        line-height: 1.5;
        margin: 8px 0;
        font-style: italic;
    }
    .definition-popup .source {
        font-size: 11px;
        color: #95a5a6;
        margin-top: 8px;
        text-align: right;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
    }
`;
document.head.appendChild(popupStyles);

// Function to check if text is a single word
function isSingleWord(text) {
    return text.trim().split(/\s+/).length === 1;
}

// Function to get definition from dictionary API
async function getDefinition(word) {
    try {
        const response = await fetch(`${config.DICTIONARY_API}/${encodeURIComponent(word)}`);
        const data = await response.json();
        if (!response.ok || !data || !data[0]?.meanings?.[0]) {
            return null;
        }
        return {
            definition: data[0].meanings[0].definitions[0].definition,
            type: data[0].meanings[0].partOfSpeech
        };
    } catch (error) {
        return null;
    }
}

// Function to get AI explanation
async function getAIExplanation(text) {
    if (!config.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(config.OPENAI_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: config.AI_MODEL,
            messages: [{
                role: 'system',
                content: isSingleWord(text) ? 
                    'You are a helpful dictionary assistant. Provide a brief, clear definition and possible meanings for words that might not be in standard dictionaries.' :
                    'You are a helpful language assistant. Provide a clear, concise explanation of the meaning and context of phrases or sentences.'
            }, {
                role: 'user',
                content: isSingleWord(text) ?
                    `Define this word that wasn't found in the dictionary: "${text}"` :
                    `Explain the meaning of this text: "${text}"`
            }],
            max_tokens: config.MAX_TOKENS,
            temperature: 0.7
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get AI explanation');
    }

    return data.choices[0].message.content;
}

// Function to create and show popup
async function showDefinitionPopup(text, range) {
    // Remove existing popup
    if (definitionPopup) {
        definitionPopup.remove();
    }

    // Create new popup
    definitionPopup = document.createElement('div');
    definitionPopup.className = 'definition-popup';
    
    // Show initial loading state
    definitionPopup.innerHTML = `
        <div class="loading">Looking up meaning...</div>
    `;

    // Position popup
    const rect = range.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    definitionPopup.style.left = `${scrollX + rect.left + (rect.width / 2)}px`;
    definitionPopup.style.top = `${scrollY + rect.top - 10}px`;
    definitionPopup.style.transform = 'translate(-50%, -100%)';
    
    document.body.appendChild(definitionPopup);
    
    // Adjust position if too close to top
    const popupRect = definitionPopup.getBoundingClientRect();
    if (popupRect.top < 10) {
        definitionPopup.style.top = `${scrollY + rect.bottom + 10}px`;
        definitionPopup.style.transform = 'translate(-50%, 0)';
        definitionPopup.classList.add('above');
    }

    async function updatePopupContent(content) {
        if (definitionPopup) {
            definitionPopup.innerHTML = content;
        }
    }

    try {
        if (isSingleWord(text)) {
            // Try dictionary first
            const dictResult = await getDefinition(text);
            
            if (dictResult) {
                await updatePopupContent(`
                    <div class="word">
                        ${text}
                        <span class="type">${dictResult.type}</span>
                    </div>
                    <p class="definition">${dictResult.definition}</p>
                    <div class="source">Source: Dictionary</div>
                `);
            } else {
                // Dictionary failed, show AI loading state
                await updatePopupContent(`
                    <div class="word">${text}</div>
                    <div class="loading">Getting AI explanation...</div>
                `);
                
                try {
                    const aiExplanation = await getAIExplanation(text);
                    await updatePopupContent(`
                        <div class="word">${text}</div>
                        <p class="ai-explanation">${aiExplanation}</p>
                        <div class="source">Source: AI Assistant</div>
                    `);
                } catch (aiError) {
                    await updatePopupContent(`
                        <div class="word">${text}</div>
                        <p class="error">${aiError.message}</p>
                        <div class="debug-info">
                            API Key Set: ${config.OPENAI_API_KEY ? 'Yes' : 'No'}
                            Model: ${config.AI_MODEL}
                        </div>
                    `);
                }
            }
        } else {
            // For phrases, go straight to AI
            await updatePopupContent(`
                <div class="word">Getting AI explanation...</div>
                <div class="loading"></div>
            `);
            
            try {
                const aiExplanation = await getAIExplanation(text);
                await updatePopupContent(`
                    <div class="word">Phrase Analysis</div>
                    <p class="ai-explanation">${aiExplanation}</p>
                    <div class="source">Source: AI Assistant</div>
                `);
            } catch (error) {
                await updatePopupContent(`
                    <div class="word">Phrase Analysis</div>
                    <p class="error">${error.message}</p>
                    <div class="debug-info">
                        API Key Set: ${config.OPENAI_API_KEY ? 'Yes' : 'No'}
                        Model: ${config.AI_MODEL}
                    </div>
                `);
            }
        }
    } catch (error) {
        await updatePopupContent(`
            <div class="word">${text}</div>
            <p class="error">Unexpected error: ${error.message}</p>
            <div class="debug-info">
                API Key Set: ${config.OPENAI_API_KEY ? 'Yes' : 'No'}
                Model: ${config.AI_MODEL}
            </div>
        `);
    }
}

async function getExplanation(text) {
    try {
        const response = await fetch(`${config.apiUrl}/explain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            throw new Error('Failed to get explanation');
        }

        const data = await response.json();
        if (!data.explanation) {
            throw new Error('No explanation received');
        }

        return data.explanation;
    } catch (error) {
        console.error('Error getting explanation:', error);
        throw new Error('Unable to get explanation. Please try again.');
    }
} 