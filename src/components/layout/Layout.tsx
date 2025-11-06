import React from "react";
import { Outlet } from "react-router-dom";
import Background from "./Background";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import TicketSidebar from '@/components/admin/TicketSidebar';


const Layout: React.FC = () => {
return (
<div className="min-h-screen relative text-white overflow-hidden">
<Background />
<Navbar />
<main className="relative z-10">
<Outlet />
</main>
<Footer />
<CookieConsent />
<TicketSidebar />
</div>
);
};
export default Layout;