
'use client';

import { useEffect, useState } from 'react';

interface Signal {
  action: string;
  amount: number;
  pair: string;
  reason: string;
  price_change: number;
  timestamp: string;
}

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        setSignals(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 border-b border-slate-800 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter text-blue-400">ARIANUS-SKY</h1>
            <p className="text-slate-500 mt-2">Tactical Market Intelligence Dashboard (Phase 8)</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-600 uppercase tracking-widest">Linked Issue</span><br/>
            <a href="https://github.com/The-Nexus-Decoded/Arianus-Sky/issues/1" className="text-blue-500 hover:underline">#1 Integration</a>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Total Signals</h3>
            <p className="text-3xl font-bold text-white">{loading ? '...' : signals.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Execution Engine</h3>
            <p className="text-3xl font-bold text-green-400">DRY_RUN</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Status</h3>
            <p className="text-3xl font-bold text-blue-400 animate-pulse">STABLE</p>
          </div>
        </section>

        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Timestamp</th>
                <th className="p-4 font-semibold">Action</th>
                <th className="p-4 font-semibold">Pair</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Price Δ</th>
                <th className="p-4 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Retrieving intelligence...</td></tr>
              ) : signals.slice().reverse().map((s, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-xs text-slate-500">{s.timestamp}</td>
                  <td className="p-4 font-bold">
                    <span className={s.action === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                      {s.action}
                    </span>
                  </td>
                  <td className="p-4">{s.pair}</td>
                  <td className="p-4">{s.amount}</td>
                  <td className={`p-4 ${s.price_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(s.price_change * 100).toFixed(2)}%
                  </td>
                  <td className="p-4 text-xs text-slate-400">{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
