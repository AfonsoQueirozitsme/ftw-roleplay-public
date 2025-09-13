import React from "react";


const Footer: React.FC = () => (
<footer className="border-t border-white/10 py-9 relative z-10">
<div className="mx-auto max-w-7xl px-6 flex items-center justify-between text-sm">
<p className="text-white/60">© {new Date().getFullYear()} FTW Roleplay — Todos os direitos reservados.</p>
<div className="flex gap-6">
<a href="termos" className="text-white/60 hover:text-white">Termos</a>
<a href="privacidade" className="text-white/60 hover:text-white">Privacidade</a>
</div>
</div>
</footer>
);
export default Footer;