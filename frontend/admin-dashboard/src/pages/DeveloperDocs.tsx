import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  useTheme,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { API_BASE_URL } from '../config';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { toast } from 'react-toastify';

const DeveloperDocs: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = React.useState(0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const completionsExample = {
    curl: `# Note: In production, store your API key in environment variables or secrets management
# export PEERAI_API_KEY=your-api-key
# curl ... -H "X-API-Key: $PEERAI_API_KEY"

curl -X POST https://peerai-be.onrender.com/api/v1/llm/completions \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Explain quantum computing",
    "max_tokens": 100,
    "temperature": 0.7,
    "model": "mistral-small-latest"
  }'`,
    response: `{
  "content": "Quantum computing is a form of computing that harnesses quantum mechanics...",
  "model": "mistral-small-latest",
  "provider": "mistral",
  "usage": {
    "total_tokens": 150,
    "prompt_tokens": 50,
    "completion_tokens": 100
  },
  "latency_ms": 1234
}`
  };

  const chatExample = {
    curl: `# Note: In production, store your API key in environment variables or secrets management
# export PEERAI_API_KEY=your-api-key
# curl ... -H "X-API-Key: $PEERAI_API_KEY"

curl -X POST https://peerai-be.onrender.com/api/v1/llm/completions \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "What is the capital of France?"}
    ],
    "model": "mistral-small-latest",
    "temperature": 0.7
  }'`,
    response: `{
  "content": "The capital of France is Paris.",
  "model": "mistral-small-latest",
  "provider": "mistral",
  "usage": {
    "total_tokens": 120,
    "prompt_tokens": 40,
    "completion_tokens": 80
  },
  "latency_ms": 890
}`
  };

  const visionExample = {
    curl: `# Note: In production, store your API key in environment variables or secrets management
# export PEERAI_API_KEY=your-api-key
# curl ... -H "X-API-Key: $PEERAI_API_KEY"

curl -X POST https://peerai-be.onrender.com/api/v1/llm/vision \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_url": "https://example.com/image.jpg",
    "prompt": "Describe this image",
    "model": "mistral-small-latest"
  }'`,
    response: `{
  "content": "The image shows a scenic mountain landscape...",
  "model": "mistral-small-latest",
  "provider": "mistral",
  "usage": {
    "total_tokens": 100
  },
  "latency_ms": 2345
}`
  };

  const audioExample = {
    curl: `# Note: In production, store your API key in environment variables or secrets management
# export PEERAI_API_KEY=your-api-key
# curl ... -H "X-API-Key: $PEERAI_API_KEY"

curl -X POST https://peerai-be.onrender.com/api/v1/llm/audio \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "audio_url": "https://example.com/audio.mp3",
    "task": "transcribe",
    "model": "mistral-small-latest"
  }'`,
    response: `{
  "content": "This is the transcribed text from the audio file...",
  "model": "mistral-small-latest",
  "provider": "mistral",
  "usage": {
    "total_tokens": 75
  },
  "latency_ms": 3456
}`
  };

  const chatAppExample = {
    html: `<!DOCTYPE html>
<html>
<head>
    <title>PeerAI Chat App</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .chat-container { 
            max-width: 600px; 
            margin: 20px auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }
        #chat-messages { 
            height: 400px; 
            overflow-y: auto;
            padding: 20px;
            background: #f9f9f9;
        }
        .message { 
            margin: 10px 0; 
            padding: 10px 15px; 
            border-radius: 15px; 
            max-width: 80%;
            word-wrap: break-word;
        }
        .user { 
            background: #e3f2fd; 
            margin-left: auto;
        }
        .assistant { 
            background: #f5f5f5; 
            margin-right: auto;
        }
        .input-container {
            display: flex;
            padding: 20px;
            background: white;
            border-top: 1px solid #ddd;
        }
        #user-input {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-right: 10px;
        }
        button {
            padding: 10px 20px;
            background: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:disabled {
            background: #ccc;
        }
        .loading {
            text-align: center;
            padding: 10px;
            color: #666;
        }
        .error {
            color: #f44336;
            text-align: center;
            padding: 10px;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div id="chat-messages"></div>
        <div class="input-container">
            <input type="text" id="user-input" placeholder="Type your message...">
            <button onclick="sendMessage()" id="send-button">Send</button>
        </div>
    </div>

    <script>
    // SECURITY NOTE: In a production environment, never hardcode API keys in frontend code.
    // Instead, implement proper backend authentication and proxy the API calls through your server,
    // or use secure environment variables and build-time configuration.
    const API_KEY = 'YOUR_API_KEY';  // Replace with secure key management in production
    const API_URL = 'https://peerai-be.onrender.com/api/v1/llm/completions';

    let conversationHistory = [
        { role: 'system', content: 'You are a helpful assistant.' }
    ];

    // Handle Enter key
    document.getElementById('user-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    async function sendMessage() {
        const input = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const message = input.value.trim();
        if (!message) return;

        // Disable input and button while processing
        input.disabled = true;
        sendButton.disabled = true;

        // Add user message to chat
        addMessageToChat('user', message);
        input.value = '';

        // Add to conversation history
        conversationHistory.push({ role: 'user', content: message });

        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'AI is typing...';
        document.getElementById('chat-messages').appendChild(loadingDiv);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    messages: conversationHistory,
                    model: 'mistral-small-latest',
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(\`API request failed: \${response.status}\`);
            }

            const data = await response.json();
            
            // Remove loading indicator
            loadingDiv.remove();

            if (data.content) {
                // Add assistant's response to chat
                addMessageToChat('assistant', data.content);
                // Add to conversation history
                conversationHistory.push({ 
                    role: 'assistant', 
                    content: data.content 
                });
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error('Error:', error);
            loadingDiv.remove();
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = 'Sorry, there was an error processing your request.';
            document.getElementById('chat-messages').appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000); // Remove error message after 5 seconds
        } finally {
            // Re-enable input and button
            input.disabled = false;
            sendButton.disabled = false;
            input.focus();
        }
    }

    function addMessageToChat(role, content) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = \`message \${role}\`;
        messageDiv.textContent = content;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    </script>
</body>
</html>`,
    javascript: `// The JavaScript code is now included directly in the HTML file above
// This makes it easier to copy and use the complete solution`
  };

  const CodeBlock = ({ title, curl, response }: { title: string, curl: string, response: string }) => (
    <Paper sx={{ p: 3, mb: 4, bgcolor: theme.palette.background.paper }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Request:
        </Typography>
        <Tooltip title="Copy request" placement="top">
          <IconButton
            onClick={() => handleCopy(curl)}
            sx={{ position: 'absolute', top: 0, right: 0 }}
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <SyntaxHighlighter language="bash" style={atomDark}>
          {curl}
        </SyntaxHighlighter>
      </Box>
      
      <Box sx={{ position: 'relative' }}>
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Response:
        </Typography>
        <Tooltip title="Copy response" placement="top">
          <IconButton
            onClick={() => handleCopy(response)}
            sx={{ position: 'absolute', top: 0, right: 0 }}
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <SyntaxHighlighter language="json" style={atomDark}>
          {response}
        </SyntaxHighlighter>
      </Box>
    </Paper>
  );

  const CookbookSection = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Building a Simple Chat App
      </Typography>
      <Typography paragraph>
        Follow this guide to create a basic chat application using PeerAI's API. This example demonstrates how to build
        a web-based chat interface that maintains conversation history.
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Step 1: Set up the HTML
      </Typography>
      <Typography paragraph>
        Create an HTML file with a basic chat interface:
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <Tooltip title="Copy HTML" placement="top">
          <IconButton
            onClick={() => handleCopy(chatAppExample.html)}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <SyntaxHighlighter language="html" style={atomDark}>
          {chatAppExample.html}
        </SyntaxHighlighter>
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Step 2: Add the JavaScript
      </Typography>
      <Typography paragraph>
        Add this JavaScript code to handle the chat functionality:
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <Tooltip title="Copy JavaScript" placement="top">
          <IconButton
            onClick={() => handleCopy(chatAppExample.javascript)}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <SyntaxHighlighter language="javascript" style={atomDark}>
          {chatAppExample.javascript}
        </SyntaxHighlighter>
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Step 3: Test the Chat
      </Typography>
      <Typography paragraph>
        1. Replace 'YOUR_API_KEY' with your actual API key
      </Typography>
      <Typography paragraph>
        2. Open the HTML file in a web browser
      </Typography>
      <Typography paragraph>
        3. Start chatting with the AI!
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Example Chat Request
      </Typography>
      <Typography paragraph>
        Here's how the API handles a chat message:
      </Typography>
      <CodeBlock 
        title="Chat Completion" 
        curl={chatExample.curl}
        response={chatExample.response}
      />
    </Box>
  );

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        PeerAI API Documentation
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Get started with PeerAI's powerful AI APIs. Below you'll find examples of how to interact with our endpoints using cURL.
      </Typography>

      <Tabs
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Quick Start" />
        <Tab label="Cookbook" />
      </Tabs>

      {selectedTab === 0 ? (
        <>
          <Typography variant="h5" gutterBottom>
            Authentication
          </Typography>
          <Typography paragraph>
            All API requests require an API key sent in the X-API-Key header. You can generate an API key from your dashboard.
          </Typography>
          <Paper sx={{ p: 2, mb: 4, bgcolor: theme.palette.error.main + '10' }}>
            <Typography variant="body2" color="error">
              🔒 Security Best Practices:
              <ul>
                <li>Never hardcode API keys in your code or commit them to version control</li>
                <li>Use environment variables or secure secrets management in production</li>
                <li>For frontend applications, proxy API calls through your backend to keep keys secure</li>
                <li>Regularly rotate your API keys and monitor usage for any suspicious activity</li>
              </ul>
            </Typography>
          </Paper>

          <Typography variant="h5" gutterBottom>
            Quick Start Examples
          </Typography>
          
          <CodeBlock 
            title="Text Generation" 
            curl={completionsExample.curl}
            response={completionsExample.response}
          />

          <CodeBlock 
            title="Vision Analysis" 
            curl={visionExample.curl}
            response={visionExample.response}
          />

          <CodeBlock 
            title="Audio Processing" 
            curl={audioExample.curl}
            response={audioExample.response}
          />
        </>
      ) : (
        <CookbookSection />
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" gutterBottom>
        Try it yourself
      </Typography>
      <Typography paragraph>
        Head over to our API Playground to test these endpoints interactively and generate cURL commands automatically.
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        component={RouterLink}
        to="/playground"
        sx={{ mt: 2 }}
      >
        Open API Playground
      </Button>
    </Box>
  );
};

export default DeveloperDocs; 