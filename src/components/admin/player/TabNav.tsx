import React from "react";

export default function TabNav({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string)=>void; }) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {tabs.map(t => {
        const is = t === active;
        return (
          <button
            key={t}
            onClick={()=>onChange(t)}
            className={`px-3 py-2 text-sm ${is ? "bg-white text-black" : "text-white/80 hover:text-white hover:bg-white/10"}`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
