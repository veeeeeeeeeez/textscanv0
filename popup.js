// Popup script for handling definitions and AI explanations
document.addEventListener('DOMContentLoaded', async () => {
    const resultContainer = document.getElementById('result');
    const loadingContainer = document.getElementById('loading');
    const errorContainer = document.getElementById('error');

    function showLoading() {
        loadingContainer.style.display = 'flex';
        resultContainer.style.display = 'none';
        errorContainer.style.display = 'none';
    }

    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        loadingContainer.style.display = 'none';
        resultContainer.style.display = 'none';
    }

    function showResult(content) {
        resultContainer.innerHTML = content;
        resultContainer.style.display = 'block';
        loadingContainer.style.display = 'none';
        errorContainer.style.display = 'none';
    }

    // Function to check if text is a single word
    function isSingleWord(text) {
        return text.trim().split(/\s+/).length === 1;
    }

    // Function to get definition from dictionary API
    async function getDefinition(word) {
        try {
            const response = await fetch(`${config.DICTIONARY_API}/${encodeURIComponent(word)}`);
            if (!response.ok) {
                throw new Error('Word not found');
            }
            const data = await response.json();
            if (data && data[0] && data[0].meanings && data[0].meanings[0]) {
                return {
                    definition: data[0].meanings[0].definitions[0].definition,
                    type: data[0].meanings[0].partOfSpeech
                };
            }
            throw new Error('No definition found');
        } catch (error) {
            throw new Error(error.message === 'Word not found' ? 'Word not found in dictionary' : 'Failed to fetch definition');
        }
    }

    // Function to get AI explanation
    async function getAIExplanation(text) {
        try {
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

            if (!response.ok) {
                throw new Error('Failed to get AI explanation');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            throw new Error('Failed to get AI explanation');
        }
    }

    // Function to lookup definition or get AI explanation
    async function lookupDefinition(text) {
        showLoading();
        
        try {
            if (isSingleWord(text)) {
                // Try dictionary first
                try {
                    const { definition, type } = await getDefinition(text);
                    showResult(`
                        <div class="word">
                            ${text}
                            <span class="type">${type}</span>
                        </div>
                        <p class="definition">${definition}</p>
                        <div class="source">Source: Dictionary</div>
                    `);
                } catch (error) {
                    // If dictionary fails, use AI
                    const aiExplanation = await getAIExplanation(text);
                    showResult(`
                        <div class="word">${text}</div>
                        <p class="ai-explanation">${aiExplanation}</p>
                        <div class="source">Source: AI Assistant</div>
                    `);
                }
            } else {
                // For phrases/sentences, use AI directly
                const aiExplanation = await getAIExplanation(text);
                showResult(`
                    <div class="word">Phrase Analysis</div>
                    <p class="ai-explanation">${aiExplanation}</p>
                    <div class="source">Source: AI Assistant</div>
                `);
            }
        } catch (error) {
            showError(error.message);
        }
    }

    // Check if we can access the current tab
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            showError('Could not access the current tab.');
            return;
        }

        if (tab.url.startsWith('chrome://')) {
            showError('Extension cannot access Chrome system pages.');
            return;
        }

        // Try to get selected text from storage first
        const { lastSelectedText } = await chrome.storage.local.get('lastSelectedText');
        
        if (lastSelectedText) {
            lookupDefinition(lastSelectedText);
        } else {
            // If no stored text, try to get current selection
            try {
                const [{ result }] = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => window.getSelection().toString().trim()
                });

                if (result) {
                    lookupDefinition(result);
                } else {
                    showError('No text selected. Select some text and try again.');
                }
            } catch (error) {
                showError('Could not access the page. Try selecting text again.');
            }
        }
    } catch (error) {
        showError('Could not access the current tab.');
    }
}); 