import React from "react";
import AnimatedTitle from "./AnimatedTitle";


const Hero: React.FC = () => (
<section id="home" className="relative min-h-[86vh] grid">
<div className="mx-auto max-w-7xl px-6 w-full grid md:grid-cols-2 items-center gap-14">
<div className="pt-24 pb-14">
<p className="text-red-500 font-bold tracking-widest uppercase text-[11px] mb-4">FTW Roleplay</p>
<AnimatedTitle />
<p className="mt-6 max-w-xl text-[15px] text-white/70">
Entra na experiência roleplay mais intensa em Portugal. Economia, gangues, polícia, empresas — tudo num só servidor.
</p>
<div className="mt-8 flex items-center gap-4">
<a href="#candidatura" className="px-6 py-3.5 rounded-xl font-semibold bg-red-500 text-black hover:brightness-95 transition">Candidatar Early Access</a>
<a href="#candidatura" className="px-6 py-3.5 rounded-xl font-semibold bg-white/15 hover:bg-white/25 border border-white/15 transition">Saber mais</a>
</div>
</div>
</div>
</section>
);
export default Hero;