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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Utilizador não autenticado");
    }

    // Obter o webstore ID e secret key do Tebex das variáveis de ambiente
    const webstoreId = import.meta.env.VITE_TEBEX_WEBSTORE_ID;
    const secretKey = import.meta.env.VITE_TEBEX_SECRET_KEY;

    if (!webstoreId || !secretKey) {
      throw new Error("Configuração do Tebex não encontrada. Contacta o administrador.");
    }

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
          username: username || user.email || user.id,
          complete_auto_redirect: false,
        }),
      }
    );

    if (!basketResponse.ok) {
      const errorText = await basketResponse.text();
      console.error("Erro ao criar carrinho Tebex:", errorText);
      throw new Error(`Erro ao criar carrinho: ${errorText}`);
    }

    const basket: TebexBasket = await basketResponse.json();

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
      console.error("Erro ao adicionar pacote ao carrinho:", errorText);
      throw new Error(`Erro ao adicionar pacote ao carrinho: ${errorText}`);
    }

    // Retornar a URL de checkout do Tebex
    // O formato da URL depende da configuração do webstore
    const checkoutUrl = `https://checkout.tebex.io/basket/${basket.id}`;
    return checkoutUrl;
  } catch (error) {
    console.error("Erro ao criar checkout do Tebex:", error);
    throw error;
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

