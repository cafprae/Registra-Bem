const fs = require('fs');
const p = 'c:\\Users\\speed\\OneDrive - Universidade Federal do Ceará\\Aplicativos\\Registra Bem\\frontend\\src\\components\\ReportView.tsx';

let content = fs.readFileSync(p, 'utf8');

// Add desktop table
const desktopTable = `
      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block">
        {tabData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircle size={40} /></div>
            Nenhum item nesta categoria.
          </div>
        ) : (
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Patrimônio</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Local</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {tabData.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.name.substring(0, 40)}{item.name.length > 40 ? '...' : ''}</div>
                      <div className="text-xs text-slate-500">#{item.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-slate-400" />
                        {item.location || 'N/D'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={\`inline-block px-3 py-1 rounded-full text-xs font-medium border \${statusConfig[item.status]?.color || 'bg-slate-100 text-slate-600 border-slate-200'}\`}>
                        {statusConfig[item.status]?.label || item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Cards - Hidden on desktop */}
      <div className="block md:hidden flex flex-col space-y-4">
        {tabData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircle size={40} /></div>
            Nenhum item nesta categoria.
          </div>
        ) : (
          tabData.map(item => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-slate-400" />
                  <span className="font-semibold text-slate-900">#{item.id}</span>
                </div>
                <span className={\`inline-block px-3 py-1 rounded-full text-xs font-medium border \${statusConfig[item.status]?.color || 'bg-slate-100 text-slate-600 border-slate-200'}\`}>
                  {statusConfig[item.status]?.label || item.status}
                </span>
              </div>

              <div className="mb-3">
                <h3 className="font-medium text-slate-900 mb-1">{item.name}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} className="text-slate-400" />
                  {item.location || 'Local não definido'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar size={12} />
                  Criado em {formatDate(item.created_at || new Date().toISOString())}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
`;

content += desktopTable;

fs.writeFileSync(p, content, 'utf8');
console.log('Part 2 done! Total size:', content.length);
