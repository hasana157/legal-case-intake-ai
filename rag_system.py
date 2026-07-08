"""
Grounded Retrieval Augmented Generation (RAG) System
Prevents hallucinations by grounding responses in actual legal statutes and documents
"""

import os
import logging
from typing import List, Dict, Optional, Tuple
import json
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from sentence_transformers import SentenceTransformer
from langchain_core.embeddings import Embeddings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HuggingFaceEmbeddings(Embeddings):
    """Custom Hugging Face Embeddings wrapper for LangChain"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """Initialize with a Hugging Face model (no GPU required)"""
        self.model = SentenceTransformer(model_name)
        logger.info(f"Loaded embedding model: {model_name}")
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed search documents"""
        embeddings = self.model.encode(texts, convert_to_tensor=False)
        return embeddings.tolist() if hasattr(embeddings, 'tolist') else embeddings
    
    def embed_query(self, text: str) -> List[float]:
        """Embed query text"""
        embedding = self.model.encode(text, convert_to_tensor=False)
        return embedding.tolist() if hasattr(embedding, 'tolist') else embedding.tolist()


class LegalDocumentRAG:
    """
    Retrieval Augmented Generation system for legal documents
    Prevents hallucinations by searching actual laws and statutes
    """
    
    def __init__(
        self, 
        persist_directory: str = "./legal_db",
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    ):
        """
        Initialize RAG system
        
        Args:
            persist_directory: Directory to store ChromaDB vectors
            embedding_model: Hugging Face model for embeddings (CPU-friendly)
        """
        self.persist_directory = persist_directory
        self.embedding_model = HuggingFaceEmbeddings(embedding_model)
        self.vectorstore = None
        self.documents = []
        
        # Create directory if it doesn't exist
        os.makedirs(persist_directory, exist_ok=True)
        
        # Try to load existing vectorstore
        self._load_or_create_vectorstore()
    
    def _load_or_create_vectorstore(self):
        """Load existing vectorstore or create new one"""
        try:
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embedding_model,
                collection_name="legal_documents"
            )
            collection = self.vectorstore._collection
            count = collection.count()
            logger.info(f"Loaded existing vectorstore with {count} documents")
        except Exception as e:
            logger.info(f"Creating new vectorstore: {e}")
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embedding_model,
                collection_name="legal_documents"
            )
    
    def add_documents(self, documents: List[Document], batch_size: int = 10):
        """
        Add documents to the vectorstore
        
        Args:
            documents: List of LangChain Document objects
            batch_size: Number of documents to add at once
        """
        try:
            if not documents:
                logger.warning("No documents provided")
                return
            
            logger.info(f"Adding {len(documents)} documents to vectorstore")
            
            # Add documents in batches
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                ids = [f"doc_{j}_{i + j}" for j in range(len(batch))]
                
                self.vectorstore.add_documents(
                    documents=batch,
                    ids=ids
                )
            
            # Persist to disk
            self.vectorstore.persist()
            logger.info(f"Successfully added {len(documents)} documents")
            self.documents.extend(documents)
            
        except Exception as e:
            logger.error(f"Error adding documents: {e}")
            raise
    
    def search_relevant_laws(
        self,
        query: str,
        k: int = 5,
        threshold: float = 0.4
    ) -> List[Dict]:
        """
        Search for relevant legal documents based on case facts
        
        Args:
            query: Search query based on case facts
            k: Number of results to return
            threshold: Minimum relevance score (0-1)
            
        Returns:
            List of relevant legal documents with metadata
        """
        try:
            logger.info(f"Searching for relevant laws: {query}")
            
            # Search with similarity scores
            results = self.vectorstore.similarity_search_with_score(query, k=k)
            
            relevant_laws = []
            for doc, score in results:
                # Convert score to relevance (0-1 scale)
                relevance = 1 - (score / 2) if score < 2 else 0
                
                if relevance >= threshold:
                    relevant_laws.append({
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                        "relevance_score": float(relevance),
                        "source": doc.metadata.get("source", "Unknown"),
                        "section": doc.metadata.get("section", "N/A"),
                        "jurisdiction": doc.metadata.get("jurisdiction", "General")
                    })
            
            logger.info(f"Found {len(relevant_laws)} relevant legal documents")
            return relevant_laws
        
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []
    
    def ground_response(
        self,
        query: str,
        case_type: str = None,
        jurisdiction: str = None,
        k: int = 5
    ) -> Tuple[List[Dict], str]:
        """
        Ground a response by finding relevant legal documents
        
        Args:
            query: The query/question to ground
            case_type: Type of case (Civil, Criminal, etc.)
            jurisdiction: Legal jurisdiction
            k: Number of relevant documents to retrieve
            
        Returns:
            Tuple of (relevant_documents, grounding_status)
        """
        try:
            # Enhance query with case context
            enhanced_query = query
            if case_type:
                enhanced_query += f" {case_type}"
            if jurisdiction:
                enhanced_query += f" {jurisdiction}"
            
            relevant_docs = self.search_relevant_laws(enhanced_query, k=k)
            
            if relevant_docs:
                status = f"✓ Grounded: Found {len(relevant_docs)} relevant legal sources"
            else:
                status = "⚠ Limited grounding: No exact matches found in knowledge base"
            
            return relevant_docs, status
        
        except Exception as e:
            logger.error(f"Error grounding response: {e}")
            return [], f"✗ Error: {str(e)}"
    
    def get_statistics(self) -> Dict:
        """Get statistics about the knowledge base"""
        try:
            collection = self.vectorstore._collection
            count = collection.count()
            
            stats = {
                "total_documents": count,
                "persist_directory": self.persist_directory,
                "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
                "status": "Ready" if count > 0 else "Empty"
            }
            return stats
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    def delete_all_documents(self):
        """Clear all documents from the vectorstore (use with caution)"""
        try:
            self.vectorstore.delete_collection()
            self._load_or_create_vectorstore()
            logger.info("All documents deleted from vectorstore")
        except Exception as e:
            logger.error(f"Error deleting documents: {e}")


class LegalDocumentProcessor:
    """Process raw legal documents into structured chunks"""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        """
        Initialize document processor
        
        Args:
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks for context
        """
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", " ", ""]
        )
    
    def process_markdown_document(
        self,
        content: str,
        source: str,
        jurisdiction: str = "General",
        document_type: str = "Statute"
    ) -> List[Document]:
        """
        Process markdown document into chunks
        
        Args:
            content: Document content
            source: Document source/title
            jurisdiction: Legal jurisdiction
            document_type: Type of document (Statute, Case Law, etc.)
            
        Returns:
            List of Document objects with metadata
        """
        chunks = self.splitter.split_text(content)
        
        documents = []
        for i, chunk in enumerate(chunks):
            doc = Document(
                page_content=chunk,
                metadata={
                    "source": source,
                    "chunk": i + 1,
                    "total_chunks": len(chunks),
                    "jurisdiction": jurisdiction,
                    "document_type": document_type
                }
            )
            documents.append(doc)
        
        logger.info(f"Processed '{source}' into {len(documents)} chunks")
        return documents
