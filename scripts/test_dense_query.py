import os
import sys
import json

from sentence_transformers import SentenceTransformer
import faiss

ROOT = os.getcwd()
DATA_DIR = os.path.join(ROOT, "data")
INDEX_FILE = os.path.join(DATA_DIR, "dense_index.faiss")
META_FILE = os.path.join(DATA_DIR, "dense_index_meta.json")
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def main():
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "无障碍 轮椅"

    if not os.path.exists(INDEX_FILE) or not os.path.exists(META_FILE):
        print("Index or meta file missing. Run scripts/build_dense_index.py first.")
        return

    print("Loading model and index...")
    model = SentenceTransformer(MODEL_NAME)
    index = faiss.read_index(INDEX_FILE)
    meta = json.load(open(META_FILE, "r", encoding="utf8"))

    q_emb = model.encode([query], convert_to_numpy=True)
    faiss.normalize_L2(q_emb)

    k = 5
    D, I = index.search(q_emb.astype('float32'), k)

    print(f"Query: {query}\nTop {k} results:")
    ids = [meta['ids'][i] if i < len(meta['ids']) else None for i in I[0]]
    for rank, (idx, score) in enumerate(zip(ids, D[0]), start=1):
        doc = next((d for d in meta['docs'] if d['id'] == idx), None)
        print(f"{rank}. id={idx} score={score:.4f}")
        if doc:
            print("  desc:", doc.get('description'))
            print("  summary:", doc.get('summary'))
            print()


if __name__ == '__main__':
    main()
