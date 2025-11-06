import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Gem, Loader2, AlertCircle } from "lucide-react";
import { createTebexCheckout } from "@/lib/api/tebex";
import { supabase } from "@/lib/supabase";
import StaticPageShell from "./StaticPageShell";

type VIPTier = "bronze" | "silver" | "gold";

interface TierConfig {
  id: VIPTier;
  name: string;
  price: string;
  packageId: number; // ID do pacote no Tebex
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgGradient: string;
  perks: string[];
  popular?: boolean;
}

const TIERS: TierConfig[] = [
  {
    id: "bronze",
    name: "VIP Bronze",
    price: "9.99",
    packageId: parseInt(import.meta.env.VITE_TEBEX_PACKAGE_BRONZE || "0"),
    icon: <Crown className="w-8 h-8" />,
    color: "text-amber-600",
    borderColor: "border-amber-500/50",
    bgGradient: "from-amber-900/20 to-amber-800/10",
    perks: [
      "Tag VIP Bronze no Discord",
      "Acesso prioritário ao servidor",
      "Kit inicial melhorado",
      "Desconto de 5% em lojas",
      "1 slot de personagem extra",
      "Suporte prioritário",
    ],
  },
  {
    id: "silver",
    name: "VIP Silver",
    price: "19.99",
    packageId: parseInt(import.meta.env.VITE_TEBEX_PACKAGE_SILVER || "0"),
    icon: <Sparkles className="w-8 h-8" />,
    color: "text-gray-300",
    borderColor: "border-gray-400/50",
    bgGradient: "from-gray-800/20 to-gray-700/10",
    perks: [
      "Tudo do VIP Bronze",
      "Tag VIP Silver no Discord",
      "Kit inicial premium",
      "Desconto de 10% em lojas",
      "2 slots de personagem extra",
      "Acesso a veículos exclusivos",
      "Prioridade em eventos",
      "Badge especial no fórum",
    ],
    popular: true,
  },
  {
    id: "gold",
    name: "VIP Gold",
    price: "34.99",
    packageId: parseInt(import.meta.env.VITE_TEBEX_PACKAGE_GOLD || "0"),
    icon: <Gem className="w-8 h-8" />,
    color: "text-yellow-400",
    borderColor: "border-yellow-400/50",
    bgGradient: "from-yellow-900/20 to-yellow-800/10",
    perks: [
      "Tudo do VIP Silver",
      "Tag VIP Gold no Discord",
      "Kit inicial deluxe",
      "Desconto de 15% em lojas",
      "3 slots de personagem extra",
      "Acesso a todos os veículos exclusivos",
      "Prioridade máxima em eventos",
      "Badge dourado no fórum",
      "Acesso a área VIP exclusiva",
      "Suporte 24/7 dedicado",
    ],
  },
];

export default function Shop() {
  const [loading, setLoading] = useState<VIPTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePurchase = async (tier: TierConfig) => {
    if (!isAuthenticated) {
      // Redirecionar para login com return URL
      window.location.href = `/auth?redirect=${encodeURIComponent("/shop")}`;
      return;
    }

    if (!tier.packageId || tier.packageId === 0) {
      setError("Pacote não configurado. Contacta o suporte.");
      return;
    }

    setLoading(tier.id);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const checkoutUrl = await createTebexCheckout(
        tier.packageId,
        user?.email || user?.user_metadata?.username
      );

      // Redirecionar para o checkout do Tebex
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error("Erro ao criar checkout:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar a compra. Tenta novamente."
      );
      setLoading(null);
    }
  };

  return (
    <StaticPageShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl md:text-6xl font-extrabold mb-4"
            style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
          >
            VIP Membership
          </h1>
          <p className="text-lg text-[#fbfbfb]/80 max-w-2xl mx-auto">
            Escolhe o nível VIP que melhor se adequa a ti e desbloqueia benefícios exclusivos no FTW Roleplay.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-200">Erro</p>
              <p className="text-xs text-rose-200/80 mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Pricing Tiers */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {TIERS.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl border-2 ${
                tier.popular ? tier.borderColor : "border-white/10"
              } bg-gradient-to-br ${tier.bgGradient} p-8 flex flex-col ${
                tier.popular ? "scale-105 md:scale-110 z-10" : ""
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#e53e30] text-white text-xs font-semibold">
                  MAIS POPULAR
                </div>
              )}

              {/* Icon & Name */}
              <div className={`flex items-center gap-3 mb-4 ${tier.color}`}>
                {tier.icon}
                <h2 className="text-2xl font-bold">{tier.name}</h2>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">{tier.price}€</span>
                  <span className="text-white/60 text-sm">/mês</span>
                </div>
              </div>

              {/* Perks */}
              <ul className="flex-1 space-y-3 mb-8">
                {tier.perks.map((perk, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white/90">{perk}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handlePurchase(tier)}
                disabled={loading !== null}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                  tier.popular
                    ? "bg-[#e53e30] text-white hover:brightness-110"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {loading === tier.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>A processar...</span>
                  </>
                ) : (
                  <>
                    {isAuthenticated ? "Comprar Agora" : "Iniciar Sessão para Comprar"}
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h3 className="text-xl font-bold mb-4">Perguntas Frequentes</h3>
          <div className="space-y-4 text-sm text-white/80">
            <div>
              <p className="font-semibold text-white mb-1">Como funciona a subscrição VIP?</p>
              <p>
                A subscrição VIP é mensal e renova automaticamente. Podes cancelar a qualquer momento através do painel do Tebex.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Os benefícios são cumulativos?</p>
              <p>
                Sim! O VIP Gold inclui todos os benefícios do Silver, e o Silver inclui todos os do Bronze.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Quando recebo os benefícios?</p>
              <p>
                Os benefícios são atribuídos automaticamente após a confirmação do pagamento, geralmente em poucos minutos.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Posso fazer upgrade ou downgrade?</p>
              <p>
                Sim, podes alterar o teu plano a qualquer momento. O sistema ajusta automaticamente os benefícios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StaticPageShell>
  );
}
