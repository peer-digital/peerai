// Chat app example HTML for the Documentation page

export const chatAppExample = {
  html: `<!DOCTYPE html>
<html>
<head>
    <title>PeerAI Chat App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .chat-container {
            max-width: 800px;
            margin: 20px auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .chat-header {
            background: #1976d2;
            color: white;
            padding: 16px;
            font-size: 18px;
            font-weight: 500;
        }
        .chat-content {
            padding: 20px;
        }
        .message-container {
            margin-bottom: 20px;
        }
        .message {
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            font-size: 14px;
            line-height: 1.5;
        }
        .user {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
        }
        .assistant {
            background: #f1f8e9;
            border: 1px solid #dcedc8;
        }
        .input-container {
            display: flex;
            margin-top: 20px;
            padding: 0 20px 20px;
        }
        #user-input {
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .button {
            background: #1976d2;
            color: white;
            border: none;
            padding: 12px 20px;
            margin-left: 10px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        .button:hover {
            background: #1565c0;
        }
        .response-details {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
            font-size: 13px;
            font-family: monospace;
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            PeerAI Chat Example
        </div>
        <div class="chat-content">
            <div class="message-container" id="message-container"></div>
            <div class="response-details hidden" id="response-details"></div>
        </div>
        <div class="input-container" id="input-section">
            <input type="text" id="user-input" placeholder="Type your message...">
            <button onclick="sendMessage()" id="send-button" class="button">Send</button>
        </div>
        <div class="input-container hidden" id="reset-section">
            <button onclick="resetChat()" class="button">Send Another Message</button>
        </div>
    </div>

    <script>
    const API_KEY = 'YOUR_API_KEY';  // Replace with secure key management in production
    const API_URL = 'http://localhost:8000/api/v1/llm/completions';

    function showElement(id) {
        document.getElementById(id).classList.remove('hidden');
    }

    function hideElement(id) {
        document.getElementById(id).classList.add('hidden');
    }

    function addMessageToChat(role, content) {
        const container = document.getElementById('message-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = \`message \${role}\`;
        messageDiv.textContent = content;
        container.appendChild(messageDiv);
    }

    function displayResponseDetails(data) {
        const detailsContainer = document.getElementById('response-details');
        detailsContainer.innerHTML = \`
            <strong>Response Details:</strong><br>
            Model: \${data.model}<br>
            Provider: \${data.provider}<br>
            Total Tokens: \${data.usage.total_tokens}<br>
            Prompt Tokens: \${data.usage.prompt_tokens}<br>
            Completion Tokens: \${data.usage.completion_tokens}<br>
            Latency: \${data.latency_ms}ms
        \`;
        showElement('response-details');
    }

    async function sendMessage() {
        const userInput = document.getElementById('user-input').value.trim();
        if (!userInput) return;

        // Add user message to chat
        addMessageToChat('user', userInput);
        
        // Clear input field and disable it
        document.getElementById('user-input').value = '';
        document.getElementById('user-input').disabled = true;
        document.getElementById('send-button').disabled = true;
        
        try {
            // Send request to API
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    messages: [
                        {role: 'system', content: 'You are a helpful assistant.'},
                        {role: 'user', content: userInput}
                    ],
                    model: 'mistral-small-latest',
                    temperature: 0.7
                })
            });
            
            const data = await response.json();
            
            // Add AI response to chat
            addMessageToChat('assistant', data.content);
            
            // Display response details
            displayResponseDetails(data);
            
            // Show reset button, hide input section
            hideElement('input-section');
            showElement('reset-section');
            
        } catch (error) {
            console.error('Error:', error);
            addMessageToChat('assistant', 'Sorry, there was an error processing your request.');
        }
    }

    function resetChat() {
        // Clear chat messages
        document.getElementById('message-container').innerHTML = '';
        
        // Hide response details and reset section
        hideElement('response-details');
        hideElement('reset-section');
        
        // Show input section and enable input
        showElement('input-section');
        document.getElementById('user-input').disabled = false;
        document.getElementById('send-button').disabled = false;
        document.getElementById('user-input').focus();
    }
    </script>
</body>
</html>`
};
