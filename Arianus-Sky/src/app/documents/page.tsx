'use client';

import { useEffect, useState } from 'react';

interface Document {
  path: string;
  filename: string;
  extension: string;
  size_bytes: number;
  modified: string;
  content_type: string;
  content: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [search, typeFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (typeFilter) params.set('type', typeFilter);
      params.set('limit', '100');
      
      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      setDocuments(data.documents);
      setTotal(data.total);
      setContentTypes(data.contentTypes || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'pdf': 'bg-red-500/20 text-red-400 border-red-500/30',
      'docx': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'text': 'bg-green-500/20 text-green-400 border-green-500/30',
      'excel': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'binary_metadata': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      'image_pending': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b border-slate-800 pb-4">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tighter text-purple-400">DOCUMENT REPOSITORY</h1>
              <p className="text-slate-500 mt-2">Ingested documents from staging ({total.toLocaleString()} total)</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded text-sm ${viewMode === 'table' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded text-sm ${viewMode === 'cards' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                Cards
              </button>
            </div>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-64 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Types</option>
            {contentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading documents...</div>
        ) : viewMode === 'table' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                  <th className="p-4 font-semibold">Filename</th>
                  <th className="p-4 font-semibold">Type</th>
                  <th className="p-4 font-semibold">Size</th>
                  <th className="p-4 font-semibold">Modified</th>
                  <th className="p-4 font-semibold">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {documents.map((doc, i) => (
                  <tr 
                    key={i} 
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{doc.filename}</div>
                      <div className="text-xs text-slate-500">{doc.path}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs border ${getTypeColor(doc.content_type)}`}>
                        {doc.content_type}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{formatSize(doc.size_bytes)}</td>
                    <td className="p-4 text-slate-400 text-xs">{new Date(doc.modified).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-500 text-xs max-w-xs truncate">{doc.content?.substring(0, 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc, i) => (
              <div 
                key={i} 
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-purple-500/50 transition-colors cursor-pointer"
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-slate-200 truncate flex-1">{doc.filename}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs border ${getTypeColor(doc.content_type)}`}>
                    {doc.content_type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{doc.path}</p>
                <p className="text-xs text-slate-400 line-clamp-3">{doc.content?.substring(0, 150)}</p>
              </div>
            ))}
          </div>
        )}

        {documents.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">No documents found</div>
        )}

        {/* Document Detail Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 z-50" onClick={() => setSelectedDoc(null)}>
            <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-800">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold text-slate-100">{selectedDoc.filename}</h2>
                  <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="mt-2 flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs border ${getTypeColor(selectedDoc.content_type)}`}>
                    {selectedDoc.content_type}
                  </span>
                  <span className="text-xs text-slate-500">{formatSize(selectedDoc.size_bytes)}</span>
                  <span className="text-xs text-slate-500">{selectedDoc.path}</span>
                </div>
              </div>
              <div className="p-6">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-950 p-4 rounded max-h-96 overflow-auto">
                  {selectedDoc.content}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
