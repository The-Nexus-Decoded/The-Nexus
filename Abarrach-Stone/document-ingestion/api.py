#!/usr/bin/env python3
"""
Document Query API Server
REST API to query the document knowledge base.
"""

import sqlite3
import json
from flask import Flask, jsonify, request
from pathlib import Path

DB_PATH = "/data/openclaw/documents.db"

app = Flask(__name__)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/documents", methods=["GET"])
def list_documents():
    """List all documents."""
    conn = get_db()
    cursor = conn.cursor()
    
    category = request.args.get("category")
    if category:
        cursor.execute("SELECT * FROM documents WHERE category = ? ORDER BY processed_at DESC", (category,))
    else:
        cursor.execute("SELECT * FROM documents ORDER BY processed_at DESC")
    
    docs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Remove full content from list view
    for doc in docs:
        doc.pop("content", None)
    
    return jsonify(docs)


@app.route("/documents/<int:doc_id>", methods=["GET"])
def get_document(doc_id):
    """Get document by ID."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    doc = cursor.fetchone()
    conn.close()
    
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    
    return jsonify(dict(doc))


@app.route("/entities", methods=["GET"])
def list_entities():
    """Query entities by type."""
    conn = get_db()
    cursor = conn.cursor()
    
    entity_type = request.args.get("type")
    if entity_type:
        cursor.execute("SELECT * FROM entities WHERE entity_type = ?", (entity_type,))
    else:
        cursor.execute("SELECT * FROM entities")
    
    entities = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(entities)


@app.route("/search", methods=["GET"])
def search():
    """Full-text search."""
    conn = get_db()
    cursor = conn.cursor()
    
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "Query required"}), 400
    
    cursor.execute("""
        SELECT * FROM documents 
        WHERE content LIKE ? 
        ORDER BY processed_at DESC
        LIMIT 20
    """, (f"%{query}%",))
    
    docs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    for doc in docs:
        doc.pop("content", None)
    
    return jsonify(docs)


@app.route("/profile", methods=["GET"])
def get_profile():
    """Get consolidated profile."""
    conn = get_db()
    cursor = conn.cursor()
    
    profile = {
        "identity": [],
        "skills": [],
        "employment": [],
        "finance": [],
        "medical": [],
        "contracts": []
    }
    
    for entity_type in profile.keys():
        cursor.execute("""
            SELECT entity_key, entity_value, MAX(confidence) as confidence
            FROM entities 
            WHERE entity_type = ?
            GROUP BY entity_key, entity_value
            ORDER BY confidence DESC
        """, (entity_type,))
        
        profile[entity_type] = [
            {"key": row["entity_key"], "value": row["entity_value"], "confidence": row["confidence"]}
            for row in cursor.fetchall()
        ]
    
    conn.close()
    return jsonify(profile)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
