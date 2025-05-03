"""
Service for processing documents and generating embeddings.
"""
import os
import re
import httpx
import logging
import asyncio
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from markdownify import markdownify as md
import PyPDF2
import tiktoken

from backend.models.documents import Document, DocumentChunk
from backend.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Maximum tokens per chunk for Mistral embeddings
# Mistral's embedding model has a limit of 8192 tokens
# Our token counting differs from Mistral's by ~12%, so we need a significant safety margin
MAX_TOKENS_PER_CHUNK = 6000


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
            logger.error(f"Document with ID {document_id} not found")
            return False

        logger.info(f"Processing document: {document.filename} (ID: {document_id})")

        # Get file size if available
        file_size = 0
        if os.path.exists(document.storage_path):
            file_size = os.path.getsize(document.storage_path)
            logger.info(f"Document file size: {file_size / 1024:.2f} KB")

        try:
            # Extract text from the document
            logger.info(f"Extracting text from document: {document.filename} (Content-Type: {document.content_type})")
            text = await self._extract_text(document.storage_path, document.content_type)

            # Log the text length
            text_length = len(text)
            logger.info(f"Extracted text length: {text_length} characters")

            # Count tokens in the extracted text
            token_count = self._count_tokens(text)
            logger.info(f"Total tokens in extracted text: {token_count}")

            # Split text into chunks
            logger.info(f"Splitting document into chunks (max tokens per chunk: {MAX_TOKENS_PER_CHUNK})")
            chunks = self._split_text(text)
            logger.info(f"Document split into {len(chunks)} chunks")

            # Generate embeddings for each chunk
            successful_chunks = 0
            failed_chunks = 0

            for i, chunk in enumerate(chunks):
                chunk_token_count = self._count_tokens(chunk)
                logger.info(f"Processing chunk {i+1}/{len(chunks)} with {chunk_token_count} tokens")

                # Add a delay between chunks to respect rate limits (1 RPS)
                if i > 0:
                    logger.info(f"Waiting 1.1 seconds before processing next chunk to respect rate limits")
                    await asyncio.sleep(1.1)  # Slightly more than 1 second to be safe

                try:
                    embedding = await self._generate_embedding(chunk)

                    # Create document chunk
                    chunk_obj = DocumentChunk(
                        document_id=document.id,
                        chunk_index=i,
                        text=chunk,
                        embedding=embedding,
                        chunk_metadata={
                            "index": i,
                            "total_chunks": len(chunks),
                            "token_count": chunk_token_count,
                            "char_count": len(chunk)
                        }
                    )

                    self.db.add(chunk_obj)
                    successful_chunks += 1

                except Exception as chunk_error:
                    logger.error(f"Error processing chunk {i+1}: {str(chunk_error)}")
                    failed_chunks += 1

                    # Create a failed chunk record with error information
                    chunk_obj = DocumentChunk(
                        document_id=document.id,
                        chunk_index=i,
                        text=chunk[:1000] + "...",  # Store truncated text
                        embedding=None,  # No embedding for failed chunk
                        chunk_metadata={
                            "index": i,
                            "total_chunks": len(chunks),
                            "token_count": chunk_token_count,
                            "char_count": len(chunk),
                            "error": str(chunk_error),
                            "status": "failed"
                        }
                    )
                    self.db.add(chunk_obj)

            # Mark document as processed if at least some chunks were successful
            if successful_chunks > 0:
                document.is_processed = True
                if failed_chunks > 0:
                    document.processing_error = f"Partial success: {successful_chunks} chunks processed, {failed_chunks} chunks failed"
                    logger.warning(f"Document {document_id} partially processed: {successful_chunks} successful, {failed_chunks} failed")
                else:
                    document.processing_error = None
                    logger.info(f"Document {document_id} successfully processed: {successful_chunks} chunks")
            else:
                document.is_processed = False
                document.processing_error = f"All {len(chunks)} chunks failed to process"
                logger.error(f"Document {document_id} processing failed: all {len(chunks)} chunks failed")

            # Delete the file from disk after processing
            try:
                if os.path.exists(document.storage_path):
                    os.remove(document.storage_path)
                    logger.info(f"Deleted file: {document.storage_path}")

                    # Update storage path to indicate file was deleted
                    # But keep the original filename in the path for reference
                    original_filename = os.path.basename(document.storage_path)
                    document.storage_path = f"PROCESSED_AND_DELETED:{original_filename}"
            except Exception as e:
                logger.error(f"Error deleting file {document.storage_path}: {str(e)}")
                # Continue even if file deletion fails

            self.db.commit()

            return successful_chunks > 0

        except Exception as e:
            # Mark document as failed
            document.is_processed = False
            document.processing_error = str(e)
            self.db.commit()

            logger.error(f"Error processing document {document_id}: {str(e)}", exc_info=True)
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
            # For PDF files - use PyPDF2 to extract text
            try:
                pdf_text = ""
                with open(file_path, "rb") as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    for page_num in range(len(pdf_reader.pages)):
                        page = pdf_reader.pages[page_num]
                        pdf_text += page.extract_text() + "\n\n"

                # Add a title based on the filename
                filename = os.path.basename(file_path)
                extracted_text = f"# {filename}\n\n{pdf_text}"
            except Exception as e:
                logger.error(f"Error extracting text from PDF: {str(e)}")
                extracted_text = f"# {os.path.basename(file_path)}\n\nError extracting text from PDF: {str(e)}"

        elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # For DOCX files - placeholder implementation
            # In a production system, you would use python-docx
            extracted_text = f"# {os.path.basename(file_path)}\n\nText extracted from DOCX document."

        elif content_type.startswith("text/html") or content_type == "application/xhtml+xml":
            # For HTML files, use markdownify directly
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    html_content = f.read()
                extracted_text = md(html_content)
            except Exception as e:
                logger.error(f"Error converting HTML to Markdown: {str(e)}")
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

    def _count_tokens(self, text: str) -> int:
        """
        Count the number of tokens in a text string using tiktoken.

        Args:
            text: The text to count tokens for.

        Returns:
            int: The number of tokens in the text with a safety factor applied.
        """
        try:
            # Use cl100k_base encoding which is used by many models
            encoding = tiktoken.get_encoding("cl100k_base")
            tokens = encoding.encode(text)
            token_count = len(tokens)

            # Apply a safety factor to account for differences between our tokenizer and Mistral's
            # Based on logs, Mistral counts ~12% more tokens than tiktoken
            safety_factor = 1.15  # 15% safety margin
            adjusted_count = int(token_count * safety_factor)

            if token_count > 1000:  # Only log for significant chunks
                logger.debug(f"Token count: {token_count}, adjusted with safety factor: {adjusted_count}")

            return adjusted_count
        except Exception as e:
            logger.error(f"Error counting tokens: {str(e)}")
            # Fallback to a rough estimate if tiktoken fails
            return int(len(text.split()) * 1.5)  # Apply safety factor to word count too

    def _split_text(self, text: str, max_tokens_per_chunk: int = MAX_TOKENS_PER_CHUNK, overlap_tokens: int = 50) -> List[str]:
        """
        Split text into chunks based on token count.

        Args:
            text: Text to split.
            max_tokens_per_chunk: Maximum number of tokens per chunk.
            overlap_tokens: Number of tokens to overlap between chunks.

        Returns:
            List[str]: List of text chunks.
        """
        logger.info(f"Splitting text into chunks with max_tokens={max_tokens_per_chunk}, overlap={overlap_tokens}")

        # Get total token count for the entire text
        total_tokens = self._count_tokens(text)
        logger.info(f"Total tokens in document: {total_tokens}")

        # If text is small enough, return it as a single chunk
        if total_tokens <= max_tokens_per_chunk:
            logger.info(f"Document fits in a single chunk ({total_tokens} tokens)")
            return [text]

        # Split text into sentences first for more natural chunks
        sentences = re.split(r'(?<=[.!?])\s+', text)
        chunks = []
        current_chunk = []
        current_chunk_tokens = 0

        for sentence in sentences:
            sentence_tokens = self._count_tokens(sentence)
            logger.debug(f"Sentence with {sentence_tokens} tokens: {sentence[:50]}...")

            # If a single sentence is too large, we need to split it further
            if sentence_tokens > max_tokens_per_chunk:
                logger.warning(f"Found very long sentence with {sentence_tokens} tokens, splitting further")
                if current_chunk:
                    # Add the current chunk before processing the long sentence
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_chunk_tokens = 0

                # Split the long sentence into smaller parts
                words = sentence.split()
                current_part = []
                current_part_tokens = 0

                for word in words:
                    word_tokens = self._count_tokens(word)
                    if current_part_tokens + word_tokens <= max_tokens_per_chunk:
                        current_part.append(word)
                        current_part_tokens += word_tokens
                    else:
                        # Add the current part as a chunk
                        if current_part:
                            chunks.append(" ".join(current_part))
                        # Start a new part with this word
                        current_part = [word]
                        current_part_tokens = word_tokens

                # Add any remaining part
                if current_part:
                    chunks.append(" ".join(current_part))

            # If adding this sentence would exceed the chunk size, start a new chunk
            elif current_chunk_tokens + sentence_tokens > max_tokens_per_chunk:
                chunks.append(" ".join(current_chunk))

                # Start a new chunk with overlap
                if overlap_tokens > 0 and current_chunk:
                    # Calculate how many sentences to include for overlap
                    overlap_text = " ".join(current_chunk[-3:])  # Take last 3 sentences for overlap
                    overlap_tokens_count = self._count_tokens(overlap_text)

                    # Only use overlap if it's not too large
                    if overlap_tokens_count <= overlap_tokens:
                        current_chunk = current_chunk[-3:]
                        current_chunk_tokens = overlap_tokens_count
                    else:
                        current_chunk = []
                        current_chunk_tokens = 0
                else:
                    current_chunk = []
                    current_chunk_tokens = 0

                current_chunk.append(sentence)
                current_chunk_tokens += sentence_tokens
            else:
                # Add the sentence to the current chunk
                current_chunk.append(sentence)
                current_chunk_tokens += sentence_tokens

        # Add the last chunk if it's not empty
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        logger.info(f"Split document into {len(chunks)} chunks")

        # Check for oversized chunks and split them further if needed
        final_chunks = []
        for i, chunk in enumerate(chunks):
            chunk_tokens = self._count_tokens(chunk)
            logger.info(f"Chunk {i+1}: {chunk_tokens} tokens")

            # If chunk is within the token limit, add it directly
            if chunk_tokens <= max_tokens_per_chunk:
                final_chunks.append(chunk)
            else:
                # If chunk is too large, split it further
                logger.warning(f"Chunk {i+1} has {chunk_tokens} tokens, which exceeds the limit of {max_tokens_per_chunk}")
                logger.info(f"Splitting oversized chunk into smaller pieces")

                # Split by words to create smaller chunks
                words = chunk.split()
                current_piece = []
                current_piece_tokens = 0

                for word in words:
                    word_tokens = self._count_tokens(word + " ")
                    if current_piece_tokens + word_tokens <= max_tokens_per_chunk:
                        current_piece.append(word)
                        current_piece_tokens += word_tokens
                    else:
                        # Add the current piece as a chunk
                        if current_piece:
                            new_chunk = " ".join(current_piece)
                            new_chunk_tokens = self._count_tokens(new_chunk)
                            logger.info(f"Created new chunk with {new_chunk_tokens} tokens")
                            final_chunks.append(new_chunk)
                        # Start a new piece with this word
                        current_piece = [word]
                        current_piece_tokens = word_tokens

                # Add any remaining piece
                if current_piece:
                    new_chunk = " ".join(current_piece)
                    new_chunk_tokens = self._count_tokens(new_chunk)
                    logger.info(f"Created new chunk with {new_chunk_tokens} tokens")
                    final_chunks.append(new_chunk)

        # Update the chunks list with our properly sized chunks
        chunks = final_chunks
        logger.info(f"Final document split: {len(chunks)} chunks after resizing")

        return chunks

    async def _generate_embedding(self, text: str, max_retries: int = 5) -> List[float]:
        """
        Generate an embedding for a text chunk using Mistral's embedding API.
        Includes retry logic for rate limiting.

        Args:
            text: Text to generate embedding for.
            max_retries: Maximum number of retries for rate limit errors.

        Returns:
            List[float]: Embedding vector with 1024 dimensions.
        """
        # Count tokens in the chunk
        token_count = self._count_tokens(text)
        logger.info(f"Generating embedding for chunk with {token_count} tokens")

        # Check if chunk is too large for the embedding model
        # Mistral's embedding model has a hard limit of 8192 tokens
        if token_count > 8192:
            logger.error(f"Chunk is too large for Mistral's embedding model: {token_count} tokens (max: 8192)")
            raise ValueError(f"Chunk exceeds Mistral's maximum token limit ({token_count} > 8192)")

        # Check if chunk is too large for our configured limit
        if token_count > MAX_TOKENS_PER_CHUNK:
            logger.warning(f"Chunk is larger than our configured limit: {token_count} tokens (limit: {MAX_TOKENS_PER_CHUNK})")
            # We'll still try to process it if it's under Mistral's hard limit

        retries = 0
        base_delay = 1  # Start with a 1-second delay (respecting 1 RPS limit)

        while retries <= max_retries:
            try:
                # Use Mistral's embedding API
                url = "https://api.mistral.ai/v1/embeddings"

                # Prepare the request payload
                payload = {
                    "model": "mistral-embed",  # Mistral's embedding model
                    "input": text,
                    "encoding_format": "float"
                }

                # Make the API call
                async with httpx.AsyncClient() as client:
                    logger.debug(f"Sending request to Mistral API for embedding generation (attempt {retries+1})")
                    response = await client.post(
                        url,
                        headers={"Authorization": f"Bearer {settings.EXTERNAL_LLM_API_KEY}"},
                        json=payload,
                        timeout=30.0
                    )

                    # Check if we hit a rate limit
                    if response.status_code == 429:
                        # Get retry delay from headers if available, otherwise use exponential backoff
                        retry_after = int(response.headers.get('retry-after', str(base_delay * (2 ** retries))))
                        # Ensure minimum delay of 1 second for rate limit (1 RPS)
                        retry_after = max(retry_after, 1)
                        logger.warning(f"Rate limit hit. Retrying in {retry_after} seconds (attempt {retries+1}/{max_retries})")
                        await asyncio.sleep(retry_after)
                        retries += 1
                        continue

                    # Check if the request was successful
                    if response.status_code != 200:
                        error_content = response.text
                        logger.error(f"Embedding API error: Status {response.status_code}, Response: {error_content}")

                        # If it's a token limit error, extract the actual token count from Mistral for debugging
                        if response.status_code == 400 and "exceeding max" in error_content:
                            try:
                                import json
                                error_json = json.loads(error_content)
                                error_msg = error_json.get("message", "")
                                import re
                                token_count_match = re.search(r"has (\d+) tokens", error_msg)
                                if token_count_match:
                                    mistral_token_count = int(token_count_match.group(1))
                                    our_token_count = self._count_tokens(text) / 1.15  # Remove our safety factor
                                    discrepancy = (mistral_token_count - our_token_count) / our_token_count * 100
                                    logger.warning(f"Token count discrepancy: Mistral counted {mistral_token_count} tokens, " +
                                                  f"we estimated {int(our_token_count)} tokens (raw) or {self._count_tokens(text)} (adjusted). " +
                                                  f"Discrepancy: {discrepancy:.2f}%")
                            except Exception as e:
                                logger.error(f"Error parsing token count from error message: {str(e)}")

                        response.raise_for_status()

                    result = response.json()

                    # Log token usage if available
                    if "usage" in result:
                        logger.info(f"Embedding API usage: {result['usage']}")

                    # Extract the embedding vector
                    embedding = result["data"][0]["embedding"]

                    # Verify that we have a 1024-dimensional vector
                    if len(embedding) != 1024:
                        logger.warning(f"Expected 1024-dimensional embedding, got {len(embedding)}")

                    logger.info(f"Successfully generated embedding with dimension {len(embedding)}")
                    return embedding

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and retries < max_retries:
                    # Get retry delay from headers if available, otherwise use exponential backoff
                    retry_after = int(e.response.headers.get('retry-after', str(base_delay * (2 ** retries))))
                    # Ensure minimum delay of 1 second for rate limit (1 RPS)
                    retry_after = max(retry_after, 1)
                    logger.warning(f"Rate limit hit. Retrying in {retry_after} seconds (attempt {retries+1}/{max_retries})")
                    await asyncio.sleep(retry_after)
                    retries += 1
                elif e.response.status_code == 400:
                    # This is likely a token limit issue
                    logger.error(f"Bad request error (possibly token limit exceeded): {e.response.text}")

                    # Extract token count information for debugging
                    try:
                        import json
                        error_json = json.loads(e.response.text)
                        error_msg = error_json.get("message", "")
                        import re
                        token_count_match = re.search(r"has (\d+) tokens", error_msg)
                        if token_count_match:
                            mistral_token_count = int(token_count_match.group(1))
                            our_token_count = self._count_tokens(text) / 1.15  # Remove our safety factor
                            discrepancy = (mistral_token_count - our_token_count) / our_token_count * 100
                            logger.warning(f"Token count discrepancy: Mistral counted {mistral_token_count} tokens, " +
                                          f"we estimated {int(our_token_count)} tokens (raw) or {self._count_tokens(text)} (adjusted). " +
                                          f"Discrepancy: {discrepancy:.2f}%")
                    except Exception as parse_error:
                        logger.error(f"Error parsing token count from error message: {str(parse_error)}")

                    raise
                else:
                    logger.error(f"HTTP error generating embedding: {str(e)}")
                    raise
            except httpx.RequestError as e:
                logger.error(f"Request error generating embedding: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error generating embedding: {str(e)}")
                # For unexpected errors, we might want to retry
                if retries < max_retries:
                    delay = base_delay * (2 ** retries)
                    logger.warning(f"Unexpected error. Retrying in {delay} seconds (attempt {retries+1}/{max_retries})")
                    await asyncio.sleep(delay)
                    retries += 1
                else:
                    # Fallback to random vector if API call fails after all retries
                    import random
                    logger.warning("Using random vector as fallback due to embedding generation failure")
                    return [random.random() for _ in range(1024)]

        # If we've exhausted all retries
        logger.error(f"Failed to generate embedding after {max_retries} retries")
        import random
        return [random.random() for _ in range(1024)]

    async def search_similar_chunks(
        self, query: str, app_id: int, top_k: int = 5, threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Search for document chunks similar to a query using vector similarity.

        Args:
            query: Query text.
            app_id: ID of the app to search in.
            top_k: Number of results to return.
            threshold: Minimum similarity score.

        Returns:
            List[Dict[str, Any]]: List of similar chunks with metadata.
        """
        from backend.models.documents import AppDocument
        import numpy as np

        logger.info(f"Searching for documents with app_id={app_id}")

        # 1. Generate an embedding for the query
        query_embedding = await self._generate_embedding(query)
        query_embedding_np = np.array(query_embedding)

        # 2. Get all document chunks for the app
        app_documents = (
            self.db.query(Document)
            .join(AppDocument)
            .filter(AppDocument.app_id == app_id, AppDocument.is_active.is_(True))
            .all()
        )

        logger.info(f"Found {len(app_documents)} documents for app_id={app_id}")

        # 3. Calculate similarity scores and find the most similar chunks
        all_chunks = []
        for document in app_documents:
            logger.info(f"Processing document {document.id}: {document.filename}")
            chunks = self.db.query(DocumentChunk).filter(
                DocumentChunk.document_id == document.id
            ).all()

            logger.info(f"Found {len(chunks)} chunks for document {document.id}")
            all_chunks.extend(chunks)

        # Calculate similarity scores for all chunks
        results_with_scores = []
        for chunk in all_chunks:
            if chunk.embedding:
                # Calculate cosine similarity
                chunk_embedding_np = np.array(chunk.embedding)
                similarity = np.dot(query_embedding_np, chunk_embedding_np) / (
                    np.linalg.norm(query_embedding_np) * np.linalg.norm(chunk_embedding_np)
                )

                # Only include results above the threshold
                if similarity >= threshold:
                    results_with_scores.append({
                        "chunk": chunk,
                        "similarity": float(similarity)
                    })

        # Sort by similarity score (highest first)
        results_with_scores.sort(key=lambda x: x["similarity"], reverse=True)

        # Convert to the expected output format
        results = []
        for item in results_with_scores[:top_k]:
            chunk = item["chunk"]
            results.append({
                "text": chunk.text,
                "metadata": {
                    "document_id": chunk.document_id,
                    "document_name": self.db.query(Document.filename).filter(Document.id == chunk.document_id).scalar(),
                    "chunk_index": chunk.chunk_index,
                    "similarity_score": item["similarity"]
                }
            })

        return results
