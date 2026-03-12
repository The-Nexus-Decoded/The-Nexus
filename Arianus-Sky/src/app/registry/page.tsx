import projects from './projects.json';

export const metadata = {
  title: 'Nexus Project Registry',
  description: 'All deployed sites and apps built for Lord Xar',
};

export default function RegistryPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 border-b border-slate-800 pb-4">
          <h1 className="text-4xl font-bold tracking-tighter text-purple-400">NEXUS REGISTRY</h1>
          <p className="text-slate-500 mt-2">Deployed sites &amp; apps built for Lord Xar</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.projects.map((project: any) => (
            <a
              key={project.name}
              href={project.url || '#'}
              target={project.url ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className={`block bg-slate-900 border rounded-lg p-6 shadow-xl transition-all hover:scale-[1.02] ${
                project.url 
                  ? 'border-slate-700 hover:border-purple-500 cursor-pointer' 
                  : 'border-slate-800 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  project.status === 'live' 
                    ? 'bg-green-900 text-green-300' 
                    : 'bg-yellow-900 text-yellow-300'
                }`}>
                  {project.status}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-4">{project.description}</p>
              <div className="text-xs text-slate-500">
                {project.realm}
              </div>
              {project.url && (
                <div className="text-xs text-purple-400 mt-2 truncate">
                  {project.url}
                </div>
              )}
            </a>
          ))}
        </section>

        <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-slate-600 text-sm">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </footer>
      </div>
    </div>
  );
}
