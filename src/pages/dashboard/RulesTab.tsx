// /src/pages/dashboard/RulesTab.tsx
export default function RulesTab() {
    return (
      <div className="rounded-2xl p-6 bg-white/10 border border-white/15 space-y-4">
        <h2 className="text-xl font-bold">Regras & Informações — Early Access</h2>
        <ul className="list-disc pl-6 space-y-2 opacity-90">
          <li>Slots limitados e acesso sujeito a aprovação.</li>
          <li>Respeita os outros jogadores e a equipa.</li>
          <li>Reporta bugs pelo separador “Reports”.</li>
          <li>Partilha logs/imagens sempre que possível para acelerar a correção.</li>
        </ul>
        <p className="opacity-70 text-sm">Última atualização: {new Date().toISOString().slice(0,10)}</p>
      </div>
    );
  }
  