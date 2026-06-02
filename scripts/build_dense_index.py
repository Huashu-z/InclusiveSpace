import os
import json

from sentence_transformers import SentenceTransformer
import numpy as np
import faiss

ROOT = os.getcwd()
DATA_DIR = os.path.join(ROOT, "data")
RAG_INDEX = os.path.join(DATA_DIR, "rag_index.json")
INDEX_FILE = os.path.join(DATA_DIR, "dense_index.faiss")
META_FILE = os.path.join(DATA_DIR, "dense_index_meta.json")

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def load_docs_from_rag():
    if not os.path.exists(RAG_INDEX):
        print(f"RAG index not found: {RAG_INDEX}")
        return []
    payload = json.load(open(RAG_INDEX, "r", encoding="utf8"))
    docs = payload.get("docs", [])
    items = []
    for d in docs:
        text_parts = [d.get("description", ""), d.get("summary", ""), d.get("text", "")]
        text = " ".join([p for p in text_parts if p])
        items.append({"id": d.get("id"), "text": text, "metadata": d.get("metadata", {})})
    return items


def build_index(docs, model_name=MODEL_NAME, index_file=INDEX_FILE, meta_file=META_FILE):
    if len(docs) == 0:
        print("No documents to embed. Exiting.")
        return

    os.makedirs(os.path.dirname(index_file), exist_ok=True)

    texts = [d["text"] for d in docs]
    ids = [d["id"] for d in docs]

    print("Loading model:", model_name)
    model = SentenceTransformer(model_name)

    print(f"Encoding {len(texts)} documents...")
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=32, convert_to_numpy=True)

    # Normalize for cosine similarity with inner product
    faiss.normalize_L2(embeddings)

    dim = embeddings.shape[1]
    print(f"Embedding dim: {dim}")

    index = faiss.IndexFlatIP(dim)
    index.add(embeddings.astype('float32'))

    # FAISS on Windows can have issues writing absolute paths; switch to data dir and write relative filename
    index_dir = os.path.dirname(index_file) or '.'
    index_name = os.path.basename(index_file)
    cwd_save = os.getcwd()
    try:
        os.chdir(index_dir)
        print(f"Writing FAISS index to {os.path.join(index_dir, index_name)}")
        faiss.write_index(index, index_name)
    finally:
        os.chdir(cwd_save)

    meta = {"ids": ids, "docs": docs}
    with open(meta_file, "w", encoding="utf8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Saved meta to {meta_file}")
    print("Done.")


if __name__ == '__main__':
    docs = load_docs_from_rag()
    build_index(docs)
