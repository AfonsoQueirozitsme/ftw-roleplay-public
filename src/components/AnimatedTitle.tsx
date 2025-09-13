import React, { useEffect, useRef } from "react";


const AnimatedTitle: React.FC = () => {
const h1Ref = useRef<HTMLHeadingElement | null>(null);


useEffect(() => {
const el = h1Ref.current;
if (!el) return;
const rand = (min: number, max: number) => (Math.random() * (max - min) + min).toFixed(2);
el.style.setProperty("--rp-idle-delay", `${rand(4, 10)}s`);
el.style.setProperty("--city-idle-delay", `${rand(6, 12)}s`);
const io = new IntersectionObserver((entries) => {
entries.forEach((e) => {
if (e.isIntersecting) { el.classList.add("in-view"); io.disconnect(); }
});
}, { threshold: 0.5 });
io.observe(el);
const onVis = () => document.documentElement.style.setProperty("--anim-paused", document.hidden ? "paused" : "running");
document.addEventListener("visibilitychange", onVis);
onVis();
return () => document.removeEventListener("visibilitychange", onVis);
}, []);


return (
<>
<h1 ref={h1Ref} className="text-5xl md:text-7xl font-extrabold leading-[0.95]">
Vive o <span className="rp-word relative inline-block text-red-500">Roleplay</span>
<br />
Conquista a <span className="city-word relative inline-block text-red-500">Cidade</span>
</h1>
<style>{`
@media (prefers-reduced-motion: reduce) {
.rp-word,.city-word { animation: none !important; text-shadow: none !important; }
.rp-word::after,.city-word::after { display: none !important; }
}
.rp-word, .city-word { will-change: filter, transform, text-shadow; animation-play-state: var(--anim-paused, running); }
.in-view .rp-word { animation: rpIntro 900ms cubic-bezier(.2,.8,.2,1) both, rpIdle 14s var(--rp-idle-delay, 6s) ease-in-out infinite; }
.in-view .city-word { animation: cityIntro 1100ms 120ms cubic-bezier(.2,.8,.2,1) both, cityIdle 16s var(--city-idle-delay, 8s) ease-in-out infinite; }
.rp-word::after, .city-word::after { content: ""; position: absolute; left: 0; right: 0; bottom: -6px; height: 2px; border-radius: 999px; opacity: 0; transform: translateX(-15%); transition: opacity .25s ease, transform .25s ease; }
.rp-word::after { background: linear-gradient(90deg, transparent, rgba(239,68,68,.85) 50%, transparent); }
.city-word::after { background: linear-gradient(90deg, rgba(239,68,68,.25), rgba(239,68,68,1), rgba(239,68,68,.25)); }
.rp-word:hover::after, .city-word:hover::after { opacity: 1; transform: translateX(0); }
@keyframes rpIntro { 0%{opacity:0;transform:translateY(10px) skewX(3deg);filter:blur(2px);}60%{opacity:1;transform:translateY(0) skewX(0);filter:blur(.5px);}100%{opacity:1;filter:none;} }
@keyframes cityIntro { 0%{opacity:0;transform:translateY(12px) scale(.98);filter:blur(2px);}70%{opacity:1;transform:translateY(0) scale(1.005);filter:blur(.3px);}100%{opacity:1;transform:translateY(0) scale(1);} }
@keyframes rpIdle { 0%{text-shadow:0 0 6px rgba(239,68,68,.25),0 0 18px rgba(239,68,68,.18);}8%{text-shadow:0 0 12px rgba(239,68,68,.4),0 0 26px rgba(239,68,68,.25);}9%{transform:translateX(.5px) skewX(.8deg);}10%{transform:none;}50%{text-shadow:0 0 7px rgba(239,68,68,.28),0 0 20px rgba(239,68,68,.2);}52%{transform:translateY(-.5px);}54%{transform:translateY(0);}100%{text-shadow:0 0 6px rgba(239,68,68,.25),0 0 18px rgba(239,68,68,.18);} }
@keyframes cityIdle { 0%{filter:drop-shadow(0 0 0 rgba(239,68,68,0));}35%{filter:drop-shadow(0 0 8px rgba(239,68,68,.28));}36%{transform:translateY(-.3px);}38%{transform:translateY(0);}72%{filter:drop-shadow(0 0 10px rgba(239,68,68,.35));}100%{filter:drop-shadow(0 0 0 rgba(239,68,68,0));} }
`}</style>
</>
);
};
export default AnimatedTitle;