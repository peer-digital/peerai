"""
Simple seed script for app templates.
This script adds some initial app templates to the database.
"""
import sys
import os
import json
from datetime import datetime

# Add the parent directory to the path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from backend.config import settings

# Create engine and session
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class
Base = declarative_base()

# Define AppTemplate model directly to avoid circular imports
class AppTemplate(Base):
    __tablename__ = "app_templates"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String, nullable=True)  # Light mode or default icon
    dark_icon_url = Column(String, nullable=True)  # Dark mode icon
    template_config = Column(JSON, nullable=False)  # Configuration schema and default values
    template_code = Column(Text, nullable=False)  # Template code (HTML, JS, etc.)
    tags = Column(JSON, nullable=True)  # Array of tags
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# Sample app templates to seed
SAMPLE_TEMPLATES = [
    {
        "slug": "document-qa",
        "name": "Document Q&A",
        "description": "A simple app that allows users to ask questions about documents and get AI-powered answers.",
        "icon_url": "https://via.placeholder.com/300x150?text=Document+QA&bg=FFFFFF&fg=000000",
        "dark_icon_url": "https://via.placeholder.com/300x150?text=Document+QA&bg=333333&fg=FFFFFF",
        "template_config": {
            "schema": {
                "title": "Document Q&A Configuration",
                "type": "object",
                "properties": {
                    "model": {
                        "type": "string",
                        "title": "AI Model",
                        "description": "The AI model to use for answering questions",
                        "enum": ["mistral-large", "mistral-medium", "mistral-small"],
                        "default": "mistral-medium"
                    },
                    "max_tokens": {
                        "type": "integer",
                        "title": "Max Tokens",
                        "description": "Maximum number of tokens in the response",
                        "minimum": 100,
                        "maximum": 4000,
                        "default": 1000
                    },
                    "temperature": {
                        "type": "number",
                        "title": "Temperature",
                        "description": "Controls randomness in the response",
                        "minimum": 0,
                        "maximum": 1,
                        "default": 0.7
                    }
                },
                "required": ["model", "max_tokens", "temperature"]
            },
            "default_values": {
                "model": "mistral-medium",
                "max_tokens": 1000,
                "temperature": 0.7
            }
        },
        "template_code": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Q&A</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .upload-section {
            border: 2px dashed #ccc;
            padding: 20px;
            text-align: center;
        }
        .chat-section {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .message {
            padding: 10px;
            border-radius: 5px;
            max-width: 80%;
        }
        .user-message {
            background-color: #e1f5fe;
            align-self: flex-end;
        }
        .ai-message {
            background-color: #f5f5f5;
            align-self: flex-start;
        }
        .input-section {
            display: flex;
            gap: 10px;
        }
        input[type="text"] {
            flex-grow: 1;
            padding: 10px;
        }
        button {
            padding: 10px 20px;
            background-color: #2196f3;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background-color: #0b7dda;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Document Q&A</h1>
        <div class="upload-section">
            <p>Upload your documents to ask questions about them</p>
            <input type="file" id="document-upload" multiple>
            <button id="upload-btn">Upload</button>
        </div>
        <div class="chat-section" id="chat-container">
            <div class="message ai-message">
                Hello! I'm here to help you with your documents. Please upload some documents and ask me questions about them.
            </div>
        </div>
        <div class="input-section">
            <input type="text" id="question-input" placeholder="Ask a question...">
            <button id="send-btn">Send</button>
        </div>
    </div>

    <script>
        // This is a placeholder for the actual implementation
        // In a real app, this would connect to your backend API
        document.getElementById('send-btn').addEventListener('click', function() {
            const question = document.getElementById('question-input').value;
            if (question.trim() === '') return;

            // Add user message
            const chatContainer = document.getElementById('chat-container');
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message';
            userMessage.textContent = question;
            chatContainer.appendChild(userMessage);

            // Clear input
            document.getElementById('question-input').value = '';

            // Simulate AI response (replace with actual API call)
            setTimeout(() => {
                const aiMessage = document.createElement('div');
                aiMessage.className = 'message ai-message';
                aiMessage.textContent = 'This is a placeholder response. In a real implementation, this would be an AI-generated answer based on your documents.';
                chatContainer.appendChild(aiMessage);

                // Scroll to bottom
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 1000);
        });

        // Handle Enter key
        document.getElementById('question-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('send-btn').click();
            }
        });
    </script>
</body>
</html>
        """,
        "tags": ["document", "qa", "search"],
        "is_active": True,
    },
    {
        "slug": "knowledge-base-search",
        "name": "Knowledge Base Search",
        "description": "Search through your company's knowledge base and get AI-powered answers to your questions.",
        "icon_url": "https://via.placeholder.com/300x150?text=Knowledge+Base&bg=FFFFFF&fg=000000",
        "dark_icon_url": "https://via.placeholder.com/300x150?text=Knowledge+Base&bg=333333&fg=FFFFFF",
        "template_config": {
            "schema": {
                "title": "Knowledge Base Search Configuration",
                "type": "object",
                "properties": {
                    "model": {
                        "type": "string",
                        "title": "AI Model",
                        "description": "The AI model to use for answering questions",
                        "enum": ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"],
                        "default": "mistral-large-latest"
                    },
                    "knowledge_base_url": {
                        "type": "string",
                        "title": "Knowledge Base URL",
                        "description": "URL to your knowledge base API",
                        "default": "https://api.example.com/kb"
                    },
                    "api_key": {
                        "type": "string",
                        "title": "API Key",
                        "description": "API key for accessing the knowledge base",
                        "format": "password"
                    }
                },
                "required": ["model", "knowledge_base_url", "api_key"]
            },
            "default_values": {
                "model": "mistral-large-latest",
                "knowledge_base_url": "https://api.example.com/kb"
            }
        },
        "template_code": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Base Search</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .search-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .search-input {
            flex-grow: 1;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        .search-button {
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .search-button:hover {
            background-color: #45a049;
        }
        .results-container {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 20px;
            min-height: 200px;
        }
        .result-item {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .result-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .result-snippet {
            color: #555;
            margin-bottom: 10px;
        }
        .result-link {
            color: #2196F3;
            text-decoration: none;
        }
        .result-link:hover {
            text-decoration: underline;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Knowledge Base Search</h1>
    <p>Search through your company's knowledge base and get AI-powered answers.</p>

    <div class="search-container">
        <input type="text" class="search-input" id="search-input" placeholder="Ask a question...">
        <button class="search-button" id="search-button">Search</button>
    </div>

    <div class="results-container" id="results-container">
        <p>Enter a question above to search the knowledge base.</p>
    </div>

    <script>
        // Configuration from template
        const API_KEY = '{{api_key}}';
        const MODEL = '{{model}}';
        const KNOWLEDGE_BASE_URL = '{{knowledge_base_url}}';

        // For API calls, we need to use a fully qualified URL to ensure it works in all contexts
        // This is especially important for iframes where relative URLs might resolve incorrectly

        // In deployed apps, we need to use the backend API URL
        // We'll use the same domain as the frontend but with the backend port in development
        let apiBaseUrl;

        // Check if we're in an iframe (preview mode)
        const isInIframe = window !== window.parent;

        if (isInIframe) {
            // In preview mode (iframe), use the backend API URL directly
            apiBaseUrl = 'http://localhost:8000';
        } else if (window.location.hostname === 'localhost') {
            // In development, use localhost:8000
            apiBaseUrl = 'http://localhost:8000';
        } else {
            // In production, use the same domain
            apiBaseUrl = window.location.origin;
        }

        // Construct the full API URL
        const API_URL = `${apiBaseUrl}/api/v1/llm/completions`;

        console.log('Using API URL:', API_URL, 'isInIframe:', isInIframe);

        document.getElementById('search-button').addEventListener('click', async function() {
            const query = document.getElementById('search-input').value.trim();
            if (!query) return;

            const resultsContainer = document.getElementById('results-container');
            resultsContainer.innerHTML = '<div class="loading">Searching knowledge base...</div>';

            try {
                // Make the API call to the Peer AI LLM API
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': API_KEY
                    },
                    body: JSON.stringify({
                        messages: [
                            {role: 'system', content: 'You are a helpful assistant that answers questions based on the knowledge base.'},
                            {role: 'user', content: query}
                        ],
                        model: MODEL,
                        temperature: 0.7
                    })
                });

                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }

                const data = await response.json();

                // Log the response data to help with debugging
                console.log('API response:', data);

                // Extract the content from the response
                // The response format might be different depending on the model
                let content = '';
                if (data.content) {
                    // Direct content field
                    content = data.content;
                } else if (data.choices && data.choices.length > 0) {
                    // Choices array with content or text
                    const choice = data.choices[0];
                    if (choice.message && choice.message.content) {
                        content = choice.message.content;
                    } else if (choice.text) {
                        content = choice.text;
                    } else if (choice.content) {
                        content = choice.content;
                    }
                }

                // Display the AI-generated answer
                resultsContainer.innerHTML = `
                    <div class="result-item">
                        <div class="result-title">AI-Generated Answer</div>
                        <div class="result-snippet">${content || 'No response content found'}</div>
                    </div>
                `;

            } catch (error) {
                console.error('Error calling LLM API:', error);
                resultsContainer.innerHTML = `
                    <div class="result-item">
                        <div class="result-title">Error</div>
                        <div class="result-snippet">
                            Sorry, there was an error processing your request. Please try again later.
                            <br><br>
                            Error details: ${error.message}
                        </div>
                    </div>
                `;
            }
        });

        // Handle Enter key in search input
        document.getElementById('search-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('search-button').click();
            }
        });
    </script>
</body>
</html>
        """,
        "tags": ["knowledge base", "search", "enterprise"],
        "is_active": True,
    },
]


def seed_app_templates():
    """Seed the database with app templates."""
    db = SessionLocal()
    try:
        # Check if there are already templates in the database
        existing_templates = db.query(AppTemplate).count()
        if existing_templates > 0:
            print(f"Found {existing_templates} existing templates. Skipping seeding.")
            return

        # Add sample templates
        for template_data in SAMPLE_TEMPLATES:
            # Convert template_config to JSON string if it's a dict
            if isinstance(template_data["template_config"], dict):
                template_data["template_config"] = template_data["template_config"]

            template = AppTemplate(**template_data)
            db.add(template)

        db.commit()
        print(f"Successfully added {len(SAMPLE_TEMPLATES)} sample templates to the database.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding app templates: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    seed_app_templates()
