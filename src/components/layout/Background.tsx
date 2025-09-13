import React from "react";


const Background: React.FC = () => (
<>
<div aria-hidden className="absolute inset-0 -z-20 bg-gradient-to-br from-black via-[#1a0000] to-black" />
<div
aria-hidden
className="absolute inset-0 -z-10 opacity-70"
style={{
background:
`radial-gradient(800px 400px at 20% 20%, rgba(239,68,68,0.25), transparent),
radial-gradient(700px 500px at 80% 10%, rgba(220,38,38,0.2), transparent),
radial-gradient(1000px 600px at 50% 100%, rgba(239,68,68,0.15), transparent)`
}}
/>
<div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-red-500/20 blur-3xl animate-pulse -z-0" />
<div className="absolute top-1/2 -right-40 w-[32rem] h-[32rem] rounded-full bg-red-700/20 blur-3xl animate-ping -z-0" />
<div
aria-hidden
className="absolute inset-0 -z-0 pointer-events-none mix-blend-overlay opacity-30
[background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_3px)] [background-size:100%_3px]"
/>
</>
);
export default Background;