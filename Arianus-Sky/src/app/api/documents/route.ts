import sqlite3 from 'sqlite3';

const dbPath = '/data/openclaw/document-db/documents.db';

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const type = searchParams.get('type') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const db = new sqlite3.Database(dbPath);
    
    // Build query
    let sql = "SELECT id, filename, filepath, category, parsed_text, file_type, file_size, created_at FROM documents WHERE 1=1";
    const params: (string | number)[] = [];
    
    if (type) {
      sql += " AND category = ?";
      params.push(type);
    }
    
    if (query) {
      sql += " AND (filename LIKE ? OR filepath LIKE ? OR parsed_text LIKE ?)";
      const q = `%${query}%`;
      params.push(q, q, q);
    }
    
    sql += " LIMIT ?";
    params.push(limit);
    
    return new Promise<Response>((resolve) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          db.close();
          resolve(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
          return;
        }
        
        // Get category counts
        db.all("SELECT category, COUNT(*) as count FROM documents GROUP BY category", (err2, counts) => {
          db.close();
          if (err2) {
            resolve(new Response(JSON.stringify({ error: err2.message }), { status: 500 }));
            return;
          }
          
          const contentTypes = (counts as {category: string}[]).map(c => c.category);
          const total = (counts as {count: number}[]).reduce((acc, c) => acc + c.count, 0);
          
          resolve(new Response(JSON.stringify({ 
            documents: rows,
            total,
            contentTypes 
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }));
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to query database' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
