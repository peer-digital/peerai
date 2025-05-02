# RAG Chatbot Template

This template provides a chatbot that can answer questions based on your uploaded documents using Retrieval Augmented Generation (RAG).

## Features

- **Document Upload**: Upload documents in the back office to create a knowledge base
- **RAG-powered Responses**: Get AI-generated answers based on the content of your documents
- **Customizable UI**: Easily customize the look and feel of the chatbot
- **Configurable AI Settings**: Control the AI model, temperature, and other parameters

## How to Use

1. Run the seed script to add the template:
   ```
   python backend/scripts/seed_app_templates.py
   ```

   If the template already exists and you want to update it:
   ```
   python backend/scripts/seed_app_templates.py --force-update
   ```

2. Go to the App Templates page in the admin dashboard
3. Find the "RAG Chatbot" template
4. Click "Configure & Deploy"
5. Customize the template using the configuration options
6. Deploy the app
7. Access the app via the public URL
8. Upload documents in the back office to enable document-based answers

## Technical Details

The template uses the Peer AI LLM API to generate responses and the document processing API to handle file uploads and RAG functionality. It dynamically determines the correct API URL based on the context (preview or public mode) and includes fallback mechanisms to ensure it works in all environments.

The template is built with pure HTML, CSS, and JavaScript, with no external dependencies. It's designed to be lightweight and fast.

## Customization

The template can be customized through the configuration UI, which provides options for:

- **App Settings**: Title, description, language
- **Content**: Welcome message, input placeholder, etc.
- **Quick Actions**: Predefined questions that users can click on
- **AI Settings**: Model, temperature, system prompt
- **RAG Settings**: Chunk size, overlap, similarity threshold, etc.
- **Styling**: Colors, fonts, sizes, etc.

## Database Structure

The template uses the following database tables:

- `documents`: Stores metadata about uploaded files
- `document_chunks`: Stores text chunks and their embeddings
- `app_documents`: Associates documents with specific deployed apps

## API Endpoints

The template uses the following API endpoints:

- `POST /api/v1/documents/upload`: Upload a document
- `GET /api/v1/documents/`: List documents
- `DELETE /api/v1/documents/{document_id}`: Delete a document
- `POST /api/v1/documents/app-documents`: Associate a document with an app
- `GET /api/v1/documents/app/{app_id}`: List documents associated with an app
- `DELETE /api/v1/documents/app-documents/{app_id}/{document_id}`: Remove a document's association with an app
- `POST /api/v1/llm/rag`: Generate a RAG-based completion

## Requirements

- Peer AI backend with document processing capabilities
- PostgreSQL database with vector extension for similarity search
- Mistral API key for embeddings and completions
