/** Absolute same-tab auth redirects for the current web origin. */
export function getSocialAuthRedirects(callbackPath = "/onboarding"): {
  callbackURL: string;
  errorCallbackURL: string;
} {
  const { origin } = window.location;
  const path = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
  return {
    callbackURL: `${origin}${path}`,
    errorCallbackURL: `${origin}/login`,
  };
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    "Google recusou o acesso. Confirme que sua conta é test user no Google Cloud Console e clique de novo em Continuar com Google.",
  invalid_code:
    "O código do Google expirou. Clique de novo em Continuar com Google.",
  state_mismatch:
    "A sessão de login expirou ou ficou inválida (comum após Voltar no navegador). Limpe cookies de localhost e clique de novo em Continuar com Google — não reutilize a aba antiga do Google.",
};

export function messageForAuthError(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  return (
    AUTH_ERROR_MESSAGES[code] ??
    `Falha no login (${code}). Tente de novo a partir desta página.`
  );
}
