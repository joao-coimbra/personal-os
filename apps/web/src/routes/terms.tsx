import { Button } from "@personal-os/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
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
        Termos de Serviço
      </h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Última atualização: setembro de 2026
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          O PersonalOS é um sistema operacional pessoal para organizar tarefas,
          agenda e produtividade com apoio de IA. Ao criar uma conta ou usar o
          produto, você concorda com estes termos.
        </p>
        <h2 className="pt-2 font-medium text-base">1. Conta e acesso</h2>
        <p>
          Você é responsável pelas credenciais da sua conta e pelo uso feito sob
          ela. Métodos de acesso incluem login social (Google/GitHub) e link
          mágico por e-mail.
        </p>
        <h2 className="pt-2 font-medium text-base">2. Integrações</h2>
        <p>
          Ao conectar serviços de terceiros (Trello, Google Calendar, Notion),
          você autoriza o PersonalOS a acessar dados necessários para as
          funcionalidades solicitadas. Você pode revogar o acesso a qualquer
          momento nas configurações de integrações ou no provedor.
        </p>
        <h2 className="pt-2 font-medium text-base">3. Uso aceitável</h2>
        <p>
          Não utilize o PersonalOS para atividades ilegais, abuso de APIs de
          terceiros ou tentativa de acesso não autorizado a dados de outros
          usuários.
        </p>
        <h2 className="pt-2 font-medium text-base">4. Disponibilidade</h2>
        <p>
          O serviço é oferecido “como está” neste MVP acadêmico/experimental,
          sem garantia de disponibilidade contínua.
        </p>
        <h2 className="pt-2 font-medium text-base">5. Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas ao mantenedor do
          projeto.
        </p>
      </div>
    </div>
  );
}
