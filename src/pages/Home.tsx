import React from "react";
import Hero from "../components/Hero";
import ApplicationForm from "../components/ApplicationForm";
import MarqueeBarTones from "@/components/layout/MarqueeBarTones";
import LatestNews from "@/components/layout/LatestNews";
import Galeria from "@/components/layout/Galeria";

const Home: React.FC = () => (
<>
<Hero />
<MarqueeBarTones />
<LatestNews />
<Galeria />
<MarqueeBarTones />

</>
);
export default Home;