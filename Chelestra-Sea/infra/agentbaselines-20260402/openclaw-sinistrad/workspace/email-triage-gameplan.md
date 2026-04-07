# Email Triage & Archiving Project Plan

## Objective
To fully archive Lord Xar's Yahoo Mail account (249,000+ messages from 2003 onwards), extract important intelligence, clean the live inbox, and establish a searchable knowledge base with attachment indexing and a web frontend.

## Key Principles
- **Browser-First:** Leverage direct browser automation for full mailbox access due to IMAP limitations.
- **Data Integrity:** Preserve original email content and attachments.
- **Searchability:** Implement full-text search for email bodies and attachment content.
- **Modularity:** Separate components for extraction, storage, and presentation.
- **Collaboration:** Coordinate with Zifnab for ticketing and Haplo for frontend development.

## Phases

### Phase 0: Setup & Initial Access (Sinistrad)
**Goal:** Establish browser control, authenticate to Yahoo Mail, and initiate the primary data export.

1.  **OpenClaw Browser Setup:**
    *   Verify `browser` tool functionality on `ola-claw-trade`.
    *   Open a browser instance.
2.  **Yahoo Mail Authentication:**
    *   Navigate to Yahoo Mail login page.
    *   Perform secure login (requires Lord Xar's credentials via secure channel, or manual entry).
    *   Bypass any 2FA/MFA if prompted (requires Lord Xar's intervention).
3.  **Initiate "Download My Data" Export:**
    *   Navigate to Yahoo Account Privacy/Security settings.
    *   Locate and trigger the "Download My Data" feature for Mail.
    *   Monitor the export process for completion and download link.
    *   If direct export is not feasible, prepare for web scraping.

### Phase 1: Data Extraction & Pre-processing (Sinistrad)
**Goal:** Ingest the exported Yahoo Mail data and prepare it for database storage.

1.  **Download Exported Data:**
    *   Retrieve the MBOX (or equivalent) archive file(s) from Yahoo.
    *   Store in `/data/intelligence/yahoo-mail-export/`.
2.  **MBOX Parsing:**
    *   Develop Python script to parse the MBOX file(s) into individual `.eml` messages.
    *   Extract essential metadata: `From`, `To`, `Subject`, `Date`, `Message-ID`.
    *   Extract plain text and HTML body content.
    *   Identify and extract attachments (filename, MIME type, raw content).
3.  **Local `.eml` Archiving:**
    *   Store all parsed `.eml` files in `/data/intelligence/email-archive/` for long-term raw access.

### Phase 2: Database Ingestion & Indexing (Sinistrad)
**Goal:** Store all email and attachment content in a searchable SQLite database.

1.  **Database Schema Definition:**
    *   Define `email-knowledge.db` schema (SQLite).
    *   Table: `emails`
        *   `message_id` (PRIMARY KEY, unique email identifier)
        *   `sender` (TEXT)
        *   `recipients` (TEXT, comma-separated)
        *   `subject` (TEXT)
        *   `date` (DATETIME)
        *   `body_text` (TEXT, full text of email body + extracted attachment text)
        *   `body_html` (TEXT, original HTML body, optional)
        *   `attachments_json` (JSON, array of attachment metadata: filename, mimetype, path_to_file)
        *   `raw_eml_path` (TEXT, path to original `.eml` file in archive)
    *   Implement FTS5 for full-text search on `body_text`, `sender`, `subject`.
2.  **Attachment Text Extraction:**
    *   Develop Python service for text extraction from various attachment types:
        *   **PDFs:** `PyPDF2` or `pdfminer.six` for text, `Tesseract` for OCR if image-based.
        *   **Images:** `Pillow` + `Tesseract` for OCR.
        *   **Office Documents:** `python-docx`, `openpyxl`, etc., for text extraction.
    *   Store extracted text into the `body_text` field of the corresponding email.
3.  **Database Population:**
    *   Script to ingest parsed email data and extracted attachment text into `email-knowledge.db`.

### Phase 3: Live Inbox Triage & Cleanup (Sinistrad & Lord Xar)
**Goal:** Reduce clutter in the live Yahoo Mail inbox based on archived data.

1.  **Triage Strategy:**
    *   Define rules for identifying "clutter" (e.g., promotional emails, old notifications, recruiter spam).
    *   **Requires Lord Xar's input and approval.**
2.  **Automated Deletion/Archiving:**
    *   Develop Python script using `browser` tool to automate deletion or archiving of identified clutter emails from the Yahoo Mail web UI.
    *   **Will require explicit confirmation/dry-run mode for Lord Xar before execution.**

### Phase 4: Web Frontend Development (Haplo)
**Goal:** Provide a user-friendly interface for searching and viewing archived emails.

1.  **Haplo Handoff:**
    *   Provide `email-knowledge.db` schema and access details to Haplo.
    *   Provide API specifications (if needed, or direct DB access).
2.  **Frontend Features (Haplo):**
    *   Web interface for searching by sender, recipient, subject, keywords (full-text search).
    *   Display email content (text/HTML).
    *   Allow download/viewing of original attachments.
    *   Filtering by date range, folder, attachment presence.

## Dependencies
-   **Lord Xar:** Credentials for Yahoo Mail, approval for triage strategy, review of extracted data, feedback on frontend.
-   **Zifnab:** Creation and tracking of project tickets for each phase/task.
-   **Haplo:** Development of the web frontend for the email knowledge base.

## Security Considerations
-   **Credentials:** All credentials handled securely, never exposed in logs or public channels.
-   **Data Storage:** Archived data stored on `/data/` directories, not in Sinistrad's workspace.
-   **Access Control:** Ensure only authorized agents/users can access the database and web frontend.

## Timeline (Initial Estimate)
-   **Phase 0-2 (Sinistrad):** ~1-2 weeks (depending on Yahoo export speed and parsing complexity).
-   **Phase 3 (Sinistrad & Lord Xar):** Ongoing, dependent on triage decisions.
-   **Phase 4 (Haplo):** To be scoped with Haplo after Phase 2 completion.

---
*End of Plan*