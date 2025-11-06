import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Crown, ShoppingBag, Gift, Coins, Sparkles, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import UltraSpinner from "@/components/layout/Spinner";
import { redeemTebexCode } from "@/lib/api/tebex";

const RING = "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

type VIPTier = "none" | "bronze" | "silver" | "gold";
type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "cosmetic" | "utility" | "boost" | "special";
  icon: string;
  available: boolean;
};

type VipStatus = {
  tier: VIPTier;
  expiresAt: string | null;
  coins: number;
  benefits: string[];
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "slot_character",
    name: "Slot de Personagem",
    description: "Desbloqueia um slot adicional para criar uma nova personagem",
    price: 500,
    category: "utility",
    icon: "👤",
    available: true,
  },
  {
    id: "name_change",
    name: "Mudança de Nome",
    description: "Permite alterar o nome da tua personagem uma vez",
    price: 200,
    category: "cosmetic",
    icon: "✏️",
    available: true,
  },
  {
    id: "xp_boost_1d",
    name: "Boost de XP (1 dia)",
    description: "Aumenta o ganho de XP em 50% durante 24 horas",
    price: 150,
    category: "boost",
    icon: "⚡",
    available: true,
  },
  {
    id: "xp_boost_7d",
    name: "Boost de XP (7 dias)",
    description: "Aumenta o ganho de XP em 50% durante 7 dias",
    price: 800,
    category: "boost",
    icon: "⚡",
    available: true,
  },
  {
    id: "money_boost_1d",
    name: "Boost de Dinheiro (1 dia)",
    description: "Aumenta o ganho de dinheiro em 30% durante 24 horas",
    price: 200,
    category: "boost",
    icon: "💰",
    available: true,
  },
  {
    id: "custom_plate",
    name: "Matrícula Personalizada",
    description: "Personaliza a matrícula de um dos teus veículos",
    price: 300,
    category: "cosmetic",
    icon: "🚗",
    available: true,
  },
  {
    id: "inventory_expansion",
    name: "Expansão de Inventário",
    description: "Aumenta o espaço do inventário em 10 slots",
    price: 400,
    category: "utility",
    icon: "🎒",
    available: true,
  },
  {
    id: "premium_vehicle",
    name: "Veículo Premium",
    description: "Desbloqueia acesso a veículos exclusivos VIP",
    price: 1000,
    category: "special",
    icon: "🏎️",
    available: true,
  },
];

const VIP_BENEFITS: Record<VIPTier, string[]> = {
  none: [],
  bronze: [
    "Tag VIP Bronze no Discord",
    "1 slot de personagem adicional",
    "Acesso a canais VIP no Discord",
    "Prioridade no suporte",
  ],
  silver: [
    "Tudo do VIP Bronze",
    "Tag VIP Silver no Discord",
    "2 slots de personagem adicionais",
    "Boost de XP 10% permanente",
    "Acesso a eventos exclusivos",
  ],
  gold: [
    "Tudo do VIP Silver",
    "Tag VIP Gold no Discord",
    "3 slots de personagem adicionais",
    "Boost de XP 25% permanente",
    "Boost de dinheiro 15% permanente",
    "Acesso prioritário a novos recursos",
    "Suporte prioritário 24/7",
  ],
};

export default function VipTab() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"shop" | "status" | "redeem">("shop");
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const loadVipStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar dados do VIP do utilizador
      const { data: profile } = await supabase
        .from("profiles")
        .select("vip_tier, vip_expires_at, vip_coins")
        .eq("id", user.id)
        .single();

      const tier = (profile?.vip_tier as VIPTier) || "none";
      const coins = profile?.vip_coins || 0;

      setVipStatus({
        tier,
        expiresAt: profile?.vip_expires_at || null,
        coins,
        benefits: VIP_BENEFITS[tier] || [],
      });
    } catch (err) {
      console.error("Erro ao carregar status VIP:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o teu status VIP.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadVipStatus();
  }, [loadVipStatus]);

  const handlePurchase = async (item: ShopItem) => {
    if (purchasing) return;
    if (!vipStatus) return;

    if (vipStatus.coins < item.price) {
      toast({
        title: "Coins insuficientes",
        description: `Precisas de ${item.price} coins para comprar este item. Tens ${vipStatus.coins} coins.`,
        variant: "destructive",
      });
      return;
    }

    setPurchasing(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado");

      // Simular compra (substituir por chamada real à API)
      const { error } = await supabase.rpc("purchase_shop_item", {
        user_id: user.id,
        item_id: item.id,
        item_price: item.price,
      });

      if (error) throw error;

      toast({
        title: "Compra realizada!",
        description: `${item.name} foi adicionado à tua conta.`,
      });

      await loadVipStatus();
    } catch (err: any) {
      console.error("Erro ao comprar item:", err);
      toast({
        title: "Erro na compra",
        description: err.message || "Não foi possível completar a compra. Tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      toast({
        title: "Código inválido",
        description: "Introduz um código de resgate válido.",
        variant: "destructive",
      });
      return;
    }

    setRedeeming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado");

      // Tentar resgatar via Tebex API
      try {
        const result = await redeemTebexCode(redeemCode.trim().toUpperCase(), user.email || undefined);
        
        toast({
          title: "Código resgatado!",
          description: result.message,
        });

        setRedeemCode("");
        await loadVipStatus();
      } catch (tebexError: any) {
        // Fallback para sistema interno se o Tebex falhar
        console.warn("Erro ao resgatar via Tebex, tentando sistema interno:", tebexError);
        
        const { data, error } = await supabase.rpc("redeem_code", {
          user_id: user.id,
          code: redeemCode.trim().toUpperCase(),
        });

        if (error) throw error;

        toast({
          title: "Código resgatado!",
          description: data.message || "O código foi resgatado com sucesso.",
        });

        setRedeemCode("");
        await loadVipStatus();
      }
    } catch (err: any) {
      console.error("Erro ao resgatar código:", err);
      toast({
        title: "Erro ao resgatar",
        description: err.message || "Código inválido ou já utilizado.",
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  const getTierColor = (tier: VIPTier) => {
    switch (tier) {
      case "gold":
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-300";
      case "silver":
        return "bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/30 text-gray-300";
      case "bronze":
        return "bg-gradient-to-r from-orange-700/20 to-orange-600/20 border-orange-700/30 text-orange-300";
      default:
        return "bg-white/5 border-white/10 text-white/60";
    }
  };

  const getTierLabel = (tier: VIPTier) => {
    switch (tier) {
      case "gold":
        return "VIP Gold";
      case "silver":
        return "VIP Silver";
      case "bronze":
        return "VIP Bronze";
      default:
        return "Sem VIP";
    }
  };

  if (loading) {
    return (
      <div className="py-20 grid place-items-center border border-white/10 bg-[#0f1013] rounded-xl">
        <UltraSpinner size={84} label="A carregar..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <Crown className="w-4 h-4" />
          <span>VIP</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Centro VIP</h1>
            <p className="max-w-2xl text-sm text-white/70 leading-relaxed mt-2">
              Gerencia o teu VIP, compra itens com coins e resgata códigos promocionais.
            </p>
          </div>
          {vipStatus && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <Coins className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-xs text-white/60">Coins disponíveis</div>
                <div className="text-lg font-bold text-yellow-400">{vipStatus.coins}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
          <TabsTrigger value="shop" className="data-[state=active]:bg-[#e53e30]">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Loja
          </TabsTrigger>
          <TabsTrigger value="status" className="data-[state=active]:bg-[#e53e30]">
            <Crown className="w-4 h-4 mr-2" />
            O Meu VIP
          </TabsTrigger>
          <TabsTrigger value="redeem" className="data-[state=active]:bg-[#e53e30]">
            <Gift className="w-4 h-4 mr-2" />
            Resgatar
          </TabsTrigger>
        </TabsList>

        {/* Tab: Loja */}
        <TabsContent value="shop" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SHOP_ITEMS.map((item) => {
              const canAfford = vipStatus ? vipStatus.coins >= item.price : false;
              const isPurchasing = purchasing === item.id;

              return (
                <Card
                  key={item.id}
                  className={`border-white/10 bg-[#111215]/90 backdrop-blur-sm transition hover:border-[#e53e30]/50 ${
                    !item.available ? "opacity-50" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="text-4xl mb-2">{item.icon}</div>
                      <Badge
                        variant="outline"
                        className={
                          item.category === "special"
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                            : item.category === "boost"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            : item.category === "utility"
                            ? "bg-green-500/20 text-green-300 border-green-500/30"
                            : "bg-pink-500/20 text-pink-300 border-pink-500/30"
                        }
                      >
                        {item.category === "cosmetic"
                          ? "Cosmético"
                          : item.category === "utility"
                          ? "Utilidade"
                          : item.category === "boost"
                          ? "Boost"
                          : "Especial"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="text-white/60">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="text-lg font-bold text-yellow-400">{item.price}</span>
                      </div>
                      {!canAfford && vipStatus && (
                        <span className="text-xs text-white/50">
                          Faltam {item.price - vipStatus.coins} coins
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => handlePurchase(item)}
                      disabled={!item.available || !canAfford || isPurchasing}
                      className="w-full bg-[#e53e30] hover:bg-[#e53e30]/90 text-white"
                    >
                      {isPurchasing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          A processar...
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Comprar
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab: O Meu VIP */}
        <TabsContent value="status" className="space-y-6">
          {vipStatus && (
            <>
              <Card className={`border ${getTierColor(vipStatus.tier)}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <Crown className="w-6 h-6" />
                        {getTierLabel(vipStatus.tier)}
                      </CardTitle>
                      <CardDescription className="text-white/70 mt-2">
                        {vipStatus.expiresAt
                          ? `Válido até ${new Date(vipStatus.expiresAt).toLocaleDateString("pt-PT")}`
                          : vipStatus.tier !== "none"
                          ? "VIP permanente"
                          : "Não tens VIP ativo"}
                      </CardDescription>
                    </div>
                    {vipStatus.tier !== "none" && (
                      <div className="text-6xl opacity-20">
                        <Crown />
                      </div>
                    )}
                  </div>
                </CardHeader>
                {vipStatus.benefits.length > 0 && (
                  <CardContent>
                    <h3 className="text-sm font-semibold mb-3 text-white/90">Benefícios ativos:</h3>
                    <ul className="space-y-2">
                      {vipStatus.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-white/80">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>

              {vipStatus.tier === "none" && (
                <Card className="border-white/10 bg-[#111215]/90">
                  <CardHeader>
                    <CardTitle>Adquire VIP</CardTitle>
                    <CardDescription>
                      Desbloqueia benefícios exclusivos adquirindo um dos nossos planos VIP.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => (window.location.href = "/shop")}
                      className="w-full bg-[#e53e30] hover:bg-[#e53e30]/90 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Ver Planos VIP
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab: Resgatar */}
        <TabsContent value="redeem" className="space-y-6">
          <Card className="border-white/10 bg-[#111215]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Resgatar Código
              </CardTitle>
              <CardDescription>
                Introduz um código promocional para resgatares coins, VIP ou outros benefícios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">Código de resgate</label>
                <Input
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="Ex: PROMO2024"
                  className="bg-white/5 border-white/10 text-white"
                  disabled={redeeming}
                />
              </div>
              <Button
                onClick={handleRedeem}
                disabled={!redeemCode.trim() || redeeming}
                className="w-full bg-[#e53e30] hover:bg-[#e53e30]/90 text-white"
              >
                {redeeming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A processar...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Resgatar Código
                  </>
                )}
              </Button>
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium mb-1">Como obter códigos?</p>
                  <p className="text-blue-200/80">
                    Os códigos promocionais são distribuídos em eventos, streams e campanhas especiais. Fica atento
                    às nossas redes sociais!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

