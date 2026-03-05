# Document Ingestion Pipeline - SPEC.md

## Overview
Parse personal documents from `/data/openclaw/staging/` on Zifnab and build a queryable knowledge base.

## Architecture
- **Database:** SQLite on Zifnab (`/data/openclaw/documents.db`)
- **Parser:** Python script handling PDF, DOCX, XLSX, RTF, TXT
- **Extractor:** Gemini API for structured data extraction
- **API:** Simple Flask REST server for queries

## Database Schema

```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    category TEXT,  -- IRS, Medical, Contracts, Resumes, Crypto, etc.
    content TEXT,   -- Extracted plain text
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE TABLE entities (
    id INTEGER PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    entity_type TEXT,  -- identity, skill, employment, finance, medical, contract
    entity_key TEXT,   -- e.g., "name", "ssn_last4", "employer", "income"
    entity_value TEXT,
    confidence REAL DEFAULT 1.0
);

CREATE INDEX idx_category ON documents(category);
CREATE INDEX idx_entity_type ON entities(entity_type);
```

## Categories (auto-detected from folder)
- IRS → finance
- Medical Documents → medical
- Contracts → contract
- Resumes → employment
- Binance, Kraken, crypto → finance
- Projects → skills
- Visual Studio, RMA Forms → employment

## Extraction Categories
1. **Identity:** Name, DOB, SSN (last 4), address, phone, email
2. **Skills:** Technical skills, certifications, tools
3. **Employment:** Employers, job titles, dates, salary
4. **Finances:** Bank accounts, balances, income, taxes
5. **Medical:** Conditions, medications, providers, appointments
6. **Contracts:** Terms, dates, parties, obligations

## API Endpoints
- `GET /documents` - List all documents
- `GET /documents/<id>` - Get document content
- `GET /entities?type=<type>` - Query entities by type
- `GET /search?q=<query>` - Full-text search
- `GET /profile` - Get consolidated profile

## Acceptance Criteria
- [ ] SQLite database created on Zifnab
- [ ] Documents parsed (PDF, DOCX, XLSX, RTF, TXT)
- [ ] Categories auto-assigned from folder names
- [ ] Entities extracted via Gemini
- [ ] REST API functional
- [ ] Profile endpoint returns consolidated view
