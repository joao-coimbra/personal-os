import { Button } from "@personal-os/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto min-h-svh max-w-2xl px-6 py-12">
      <Button
        className="mb-8 px-0"
        render={<Link to="/login" />}
        variant="link"
      >
        ← Voltar ao login
      </Button>
      <h1 className="font-semibold text-3xl tracking-tight">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Última atualização: setembro de 2026
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          Esta política descreve como o PersonalOS trata dados pessoais neste
          MVP.
        </p>
        <h2 className="pt-2 font-medium text-base">1. Dados que coletamos</h2>
        <p>
          E-mail e nome da conta; tokens de integrações (armazenados
          criptografados); preferências de trabalho; conteúdo necessário para o
          operador de IA processar pedidos que você envia.
        </p>
        <h2 className="pt-2 font-medium text-base">2. Como usamos</h2>
        <p>
          Autenticar você, conectar ferramentas autorizadas, gerar planos e
          respostas do operador de IA, e melhorar a experiência do produto.
        </p>
        <h2 className="pt-2 font-medium text-base">3. Compartilhamento</h2>
        <p>
          Dados podem ser enviados a provedores que você conecta (ex.: Google,
          Trello, Notion) e ao provedor de modelo de IA configurado. Não
          vendemos dados pessoais.
        </p>
        <h2 className="pt-2 font-medium text-base">4. Retenção</h2>
        <p>
          Mantemos dados enquanto sua conta existir ou for necessário para
          operar o serviço. Você pode solicitar exclusão da conta ao mantenedor.
        </p>
        <h2 className="pt-2 font-medium text-base">5. Segurança</h2>
        <p>
          Usamos cookies de sessão seguros, criptografia de tokens de integração
          e autenticação por link mágico ou OAuth.
        </p>
        <h2 className="pt-2 font-medium text-base">6. Contato</h2>
        <p>
          Para solicitações relacionadas a privacidade, contate o mantenedor do
          PersonalOS.
        </p>
      </div>
    </div>
  );
}
