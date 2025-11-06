import { supabase } from "@/lib/supabase";

export type TebexPackage = {
  id: number;
  name: string;
  price: number;
  currency: string;
  description?: string;
  image?: string;
};

export type TebexBasket = {
  id: string;
  url: string;
  complete: boolean;
};

export type TebexCheckoutResponse = {
  id: string;
  url: string;
};

export type TebexGiftCard = {
  id: number;
  code: string;
  amount: number;
  currency: string;
  note?: string;
  expires_at?: string;
};

/**
 * Cria um carrinho de compras no Tebex e adiciona um pacote
 * @param packageId ID do pacote no Tebex
 * @param username Nome de utilizador (opcional, para autenticação)
 * @returns URL de checkout do Tebex
 */
export async function createTebexCheckout(
  packageId: number,
  username?: string
): Promise<string> {
  try {
    // Obter o utilizador autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("Utilizador não autenticado. Por favor, inicia sessão primeiro.");
    }

    // Obter o webstore ID e secret key do Tebex das variáveis de ambiente
    const webstoreId = import.meta.env.VITE_TEBEX_WEBSTORE_ID;
    const secretKey = import.meta.env.VITE_TEBEX_SECRET_KEY;

    if (!webstoreId || !secretKey) {
      console.error("Tebex config missing:", { webstoreId: !!webstoreId, secretKey: !!secretKey });
      throw new Error("Configuração do Tebex não encontrada. Contacta o administrador.");
    }

    // Usar o username fornecido ou email do utilizador
    const userIdentifier = username || user.email || user.id;

    console.log("Criando carrinho Tebex...", { webstoreId, packageId, userIdentifier });

    // Usar a API Headless do Tebex para criar um checkout
    // A API do Tebex usa o formato: https://headless.tebex.io/api/accounts/{webstoreId}/baskets
    const basketResponse = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/baskets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tebex-Secret": secretKey,
        },
        body: JSON.stringify({
          username: userIdentifier,
          complete_auto_redirect: false,
        }),
      }
    );

    if (!basketResponse.ok) {
      const errorText = await basketResponse.text();
      let errorMessage = "Erro ao criar carrinho";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${basketResponse.status}`;
      }
      console.error("Erro ao criar carrinho Tebex:", errorMessage);
      throw new Error(errorMessage);
    }

    const basket: TebexBasket = await basketResponse.json();
    console.log("Carrinho criado:", basket.id);

    if (!basket.id) {
      throw new Error("Resposta inválida do Tebex: carrinho sem ID");
    }

    // Adicionar o pacote ao carrinho
    const addPackageResponse = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/baskets/${basket.id}/packages/${packageId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tebex-Secret": secretKey,
        },
        body: JSON.stringify({
          quantity: 1,
        }),
      }
    );

    if (!addPackageResponse.ok) {
      const errorText = await addPackageResponse.text();
      let errorMessage = "Erro ao adicionar pacote";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${addPackageResponse.status}`;
      }
      console.error("Erro ao adicionar pacote ao carrinho:", errorMessage);
      throw new Error(errorMessage);
    }

    console.log("Pacote adicionado ao carrinho com sucesso");

    // Retornar a URL de checkout do Tebex
    // O formato da URL depende da configuração do webstore
    const checkoutUrl = `https://checkout.tebex.io/basket/${basket.id}`;
    return checkoutUrl;
  } catch (error: any) {
    console.error("Erro ao criar checkout do Tebex:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(error?.message || "Erro desconhecido ao processar pagamento");
  }
}

/**
 * Resgata um código de gift card ou cupom do Tebex
 * @param code Código do gift card/cupom
 * @param username Nome de utilizador (opcional)
 * @returns Informações sobre o resgate
 */
export async function redeemTebexCode(
  code: string,
  username?: string
): Promise<{ success: boolean; message: string; amount?: number; currency?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("Utilizador não autenticado. Por favor, inicia sessão primeiro.");
    }

    const webstoreId = import.meta.env.VITE_TEBEX_WEBSTORE_ID;
    const secretKey = import.meta.env.VITE_TEBEX_SECRET_KEY;

    if (!webstoreId || !secretKey) {
      console.error("Tebex config missing:", { webstoreId: !!webstoreId, secretKey: !!secretKey });
      throw new Error("Configuração do Tebex não encontrada. Contacta o administrador.");
    }

    // Criar um carrinho primeiro
    const basketResponse = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/baskets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tebex-Secret": secretKey,
        },
        body: JSON.stringify({
          username: username || user.email || user.id,
          complete_auto_redirect: false,
        }),
      }
    );

    if (!basketResponse.ok) {
      const errorText = await basketResponse.text();
      throw new Error(`Erro ao criar carrinho: ${errorText}`);
    }

    const basket: TebexBasket = await basketResponse.json();

    // Aplicar o código ao carrinho
    const applyCodeResponse = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/baskets/${basket.id}/coupons/${code}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tebex-Secret": secretKey,
        },
      }
    );

    if (!applyCodeResponse.ok) {
      // Tentar como gift card
      const giftCardResponse = await fetch(
        `https://headless.tebex.io/api/accounts/${webstoreId}/gift-cards/${code}/redeem`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tebex-Secret": secretKey,
          },
          body: JSON.stringify({
            username: username || user.email || user.id,
          }),
        }
      );

      if (!giftCardResponse.ok) {
        const errorData = await giftCardResponse.json().catch(() => ({ error: "Código inválido" }));
        throw new Error(errorData.error || "Código inválido ou já utilizado");
      }

      const giftCardData = await giftCardResponse.json();
      return {
        success: true,
        message: `Gift card resgatado com sucesso! Valor: ${giftCardData.amount || 0} ${giftCardData.currency || "EUR"}`,
        amount: giftCardData.amount,
        currency: giftCardData.currency,
      };
    }

    const couponData = await applyCodeResponse.json();
    return {
      success: true,
      message: `Cupom aplicado com sucesso! Desconto: ${couponData.discount || 0}%`,
      amount: couponData.discount,
      currency: "EUR",
    };
  } catch (error: any) {
    console.error("Erro ao resgatar código Tebex:", error);
    throw new Error(error.message || "Erro ao resgatar código. Verifica se o código está correto e ainda é válido.");
  }
}

/**
 * Lista os pacotes disponíveis no Tebex (opcional, se quiseres buscar dinamicamente)
 */
export async function listTebexPackages(): Promise<TebexPackage[]> {
  try {
    const webstoreId = import.meta.env.VITE_TEBEX_WEBSTORE_ID;
    const secretKey = import.meta.env.VITE_TEBEX_SECRET_KEY;

    if (!webstoreId || !secretKey) {
      return [];
    }

    const response = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/packages`,
      {
        headers: {
          "X-Tebex-Secret": secretKey,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Erro ao listar pacotes do Tebex:", error);
    return [];
  }
}
