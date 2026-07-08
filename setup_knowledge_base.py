"""
Setup script for initializing the Legal RAG knowledge base
Loads legal documents into ChromaDB for grounded retrieval
"""

import os
import logging
from pathlib import Path
from rag_system import LegalDocumentRAG, LegalDocumentProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_all_legal_documents():
    """Load all legal documents from the legal_documents directory"""
    
    legal_docs_dir = Path("legal_documents")
    
    if not legal_docs_dir.exists():
        logger.error(f"Legal documents directory not found: {legal_docs_dir}")
        return False
    
    # Initialize RAG system
    rag = LegalDocumentRAG(persist_directory="./legal_db")
    processor = LegalDocumentProcessor(chunk_size=1000, chunk_overlap=200)
    
    # Document mapping with metadata
    documents_to_load = {
        "landlord_tenant_act.md": {
            "source_name": "Landlord and Tenant Act",
            "jurisdiction": "General",
            "document_type": "Statute"
        },
        "tort_law_negligence.md": {
            "source_name": "Tort Law and Negligence Principles",
            "jurisdiction": "General",
            "document_type": "Common Law"
        },
        "contract_law.md": {
            "source_name": "Contract Law and Remedies",
            "jurisdiction": "General",
            "document_type": "Statute"
        }
    }
    
    total_documents_added = 0
    
    for filename, metadata in documents_to_load.items():
        filepath = legal_docs_dir / filename
        
        if not filepath.exists():
            logger.warning(f"Document not found: {filepath}")
            continue
        
        try:
            logger.info(f"Loading document: {filename}")
            
            # Read document content
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Process document into chunks
            documents = processor.process_markdown_document(
                content=content,
                source=metadata["source_name"],
                jurisdiction=metadata["jurisdiction"],
                document_type=metadata["document_type"]
            )
            
            # Add to RAG system
            rag.add_documents(documents)
            total_documents_added += len(documents)
            
            logger.info(f"✓ Successfully added {len(documents)} chunks from {filename}")
        
        except Exception as e:
            logger.error(f"✗ Error loading {filename}: {e}")
            continue
    
    # Print statistics
    stats = rag.get_statistics()
    logger.info("\n" + "="*50)
    logger.info("Knowledge Base Initialization Complete")
    logger.info("="*50)
    logger.info(f"Total documents in database: {stats['total_documents']}")
    logger.info(f"Status: {stats['status']}")
    logger.info(f"Embedding model: {stats['embedding_model']}")
    logger.info("="*50 + "\n")
    
    return stats['total_documents'] > 0


def verify_knowledge_base():
    """Verify that the knowledge base is properly initialized"""
    
    rag = LegalDocumentRAG(persist_directory="./legal_db")
    stats = rag.get_statistics()
    
    logger.info("Knowledge Base Status:")
    logger.info(f"- Total documents: {stats['total_documents']}")
    logger.info(f"- Status: {stats['status']}")
    
    if stats['total_documents'] > 0:
        # Test a simple search
        test_queries = [
            "tenant eviction notice period",
            "landlord security deposit refund",
            "negligence property damage",
            "breach of contract remedies"
        ]
        
        logger.info("\nTesting retrieval with sample queries:")
        logger.info("-" * 50)
        
        for query in test_queries:
            results = rag.search_relevant_laws(query, k=2)
            logger.info(f"\nQuery: '{query}'")
            logger.info(f"Results found: {len(results)}")
            if results:
                for i, result in enumerate(results, 1):
                    logger.info(f"  {i}. {result['source']} (relevance: {result['relevance_score']:.2%})")
        
        logger.info("\n✓ Knowledge base verification successful!")
        return True
    else:
        logger.warning("✗ Knowledge base is empty or not properly initialized")
        return False


if __name__ == "__main__":
    logger.info("Starting Legal RAG Knowledge Base Setup...\n")
    
    # Load documents
    success = load_all_legal_documents()
    
    if success:
        # Verify the setup
        verify_knowledge_base()
        logger.info("\n✓ RAG system ready for use!")
    else:
        logger.error("\n✗ Failed to initialize knowledge base")
        logger.info("Please ensure legal_documents/ directory exists with markdown files")
