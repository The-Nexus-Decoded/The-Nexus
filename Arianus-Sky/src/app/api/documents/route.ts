import { promises as fs } from 'fs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const type = searchParams.get('type') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const docFilePath = '/data/openclaw/document-db/ingested.jsonl';
    const fileContent = await fs.readFile(docFilePath, 'utf-8');
    
    const documents = fileContent.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(doc => doc !== null);
    
    // Filter by search query and type
    let filtered = documents;
    
    if (type) {
      filtered = filtered.filter(doc => doc.content_type === type);
    }
    
    if (query) {
      filtered = filtered.filter(doc => 
        doc.filename?.toLowerCase().includes(query) ||
        doc.path?.toLowerCase().includes(query) ||
        doc.content?.toLowerCase().includes(query)
      );
    }
    
    // Limit results
    const results = filtered.slice(0, limit);
    
    // Get unique content types for filters
    const contentTypes = [...new Set(documents.map(d => d.content_type))];
    
    return new Response(JSON.stringify({ 
      documents: results,
      total: filtered.length,
      contentTypes 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reading documents:', error);
    return new Response(JSON.stringify({ error: 'Failed to read documents' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
