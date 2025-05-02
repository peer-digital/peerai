"""
Service for processing documents and generating embeddings.
"""
import os
import re
import json
import httpx
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from markdownify import markdownify as md
from bs4 import BeautifulSoup

from backend.models.documents import Document, DocumentChunk
from backend.config import settings


class DocumentProcessor:
    """
    Service for processing documents and generating embeddings.
    """

    def __init__(self, db: Session):
        """Initialize the document processor."""
        self.db = db

    async def process_document(self, document_id: int) -> bool:
        """
        Process a document and generate embeddings.

        Args:
            document_id: The ID of the document to process.

        Returns:
            bool: True if processing was successful, False otherwise.
        """
        # Get the document
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return False

        try:
            # Extract text from the document
            text = await self._extract_text(document.storage_path, document.content_type)

            # Split text into chunks
            chunks = self._split_text(text)

            # Generate embeddings for each chunk
            for i, chunk in enumerate(chunks):
                embedding = await self._generate_embedding(chunk)

                # Create document chunk
                chunk_obj = DocumentChunk(
                    document_id=document.id,
                    chunk_index=i,
                    text=chunk,
                    embedding=embedding,
                    chunk_metadata={"index": i, "total_chunks": len(chunks)}
                )

                self.db.add(chunk_obj)

            # Mark document as processed
            document.is_processed = True

            # Delete the file from disk after processing
            try:
                if os.path.exists(document.storage_path):
                    os.remove(document.storage_path)
                    print(f"Deleted file: {document.storage_path}")

                    # Update storage path to indicate file was deleted
                    # But keep the original filename in the path for reference
                    original_filename = os.path.basename(document.storage_path)
                    document.storage_path = f"PROCESSED_AND_DELETED:{original_filename}"
            except Exception as e:
                print(f"Error deleting file {document.storage_path}: {str(e)}")
                # Continue even if file deletion fails

            self.db.commit()

            return True

        except Exception as e:
            # Mark document as failed
            document.is_processed = False
            document.processing_error = str(e)
            self.db.commit()

            return False

    async def _extract_text(self, file_path: str, content_type: str) -> str:
        """
        Extract text from a document and convert to Markdown.

        Args:
            file_path: Path to the document file.
            content_type: MIME type of the document.

        Returns:
            str: Extracted text in Markdown format.
        """
        extracted_text = ""

        # Extract text based on file type
        if content_type == "text/plain":
            # For plain text files
            with open(file_path, "r", encoding="utf-8") as f:
                extracted_text = f.read()

        elif content_type == "application/pdf":
            # For PDF files - placeholder implementation
            # In a production system, you would use PyPDF2, pdfminer, or similar
            extracted_text = f"# {os.path.basename(file_path)}\n\nText extracted from PDF document."

        elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # For DOCX files - placeholder implementation
            # In a production system, you would use python-docx
            extracted_text = f"# {os.path.basename(file_path)}\n\nText extracted from DOCX document."

        elif content_type.startswith("text/html") or content_type == "application/xhtml+xml":
            # For HTML files, use BeautifulSoup and markdownify
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    html_content = f.read()
                extracted_text = md(html_content)
            except Exception as e:
                print(f"Error converting HTML to Markdown: {str(e)}")
                extracted_text = f"# {os.path.basename(file_path)}\n\nError converting HTML to Markdown."

        else:
            # Default fallback for other file types
            extracted_text = f"# {os.path.basename(file_path)}\n\nText extracted from {os.path.basename(file_path)}"

        # If the text is not already in Markdown format, convert it
        if not extracted_text.startswith("#") and not "```" in extracted_text:
            # Simple heuristic to detect if it's already markdown
            # Add a title based on filename
            filename = os.path.basename(file_path)
            extracted_text = f"# {filename}\n\n{extracted_text}"

        return extracted_text

    def _split_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Split text into chunks.

        Args:
            text: Text to split.
            chunk_size: Size of each chunk in characters.
            overlap: Overlap between chunks in characters.

        Returns:
            List[str]: List of text chunks.
        """
        # Simple implementation that splits by characters
        chunks = []

        if len(text) <= chunk_size:
            chunks.append(text)
        else:
            start = 0
            while start < len(text):
                end = min(start + chunk_size, len(text))

                # Try to find a natural break point (period, newline, etc.)
                if end < len(text):
                    # Look for a period, question mark, or exclamation mark followed by a space or newline
                    match = re.search(r'[.!?]\s', text[end-20:end])
                    if match:
                        end = end - 20 + match.end()

                chunks.append(text[start:end])
                start = end - overlap

        return chunks

    async def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate an embedding for a text chunk.

        Args:
            text: Text to generate embedding for.

        Returns:
            List[float]: Embedding vector.
        """
        # In a real implementation, we would call an embedding API
        # For now, we'll just return a placeholder

        # TODO: Implement proper embedding generation using Mistral's API
        # This would typically involve making an API call to an embedding service

        # Placeholder: Return a random vector of length 384 (typical for small embedding models)
        import random
        return [random.random() for _ in range(384)]

    async def search_similar_chunks(
        self, query: str, app_id: int, top_k: int = 5, threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Search for document chunks similar to a query.

        Args:
            query: Query text.
            app_id: ID of the app to search in.
            top_k: Number of results to return.
            threshold: Minimum similarity score.

        Returns:
            List[Dict[str, Any]]: List of similar chunks with metadata.
        """
        # In a real implementation, we would:
        # 1. Generate an embedding for the query
        # 2. Find document chunks with similar embeddings
        # 3. Return the most similar chunks

        # For now, we'll just return a placeholder

        # TODO: Implement proper similarity search

        # Placeholder: Return some chunks from the app's documents
        from backend.models.documents import AppDocument

        app_documents = (
            self.db.query(Document)
            .join(AppDocument)
            .filter(AppDocument.app_id == app_id, AppDocument.is_active.is_(True))
            .all()
        )

        results = []
        for document in app_documents:
            chunks = self.db.query(DocumentChunk).filter(
                DocumentChunk.document_id == document.id
            ).limit(top_k).all()

            for chunk in chunks:
                results.append({
                    "text": chunk.text,
                    "metadata": {
                        "document_id": document.id,
                        "document_name": document.filename,
                        "chunk_index": chunk.chunk_index,
                        "similarity_score": 0.8  # Placeholder similarity score
                    }
                })

        return results[:top_k]
