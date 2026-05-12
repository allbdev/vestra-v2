import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const LAST_UPDATE = "2026-01-31";

export const metadata = {
  title: "Política de Privacidade — Vestra",
  description:
    "Política de privacidade do Vestra. Coleta de dados, LGPD, segurança e seus direitos.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidade" lastUpdate={LAST_UPDATE}>
      <LegalSection number={1} title="Introdução">
        <p>
          Sua privacidade é importante para nós. É política do Vestra respeitar a sua
          privacidade em relação a qualquer informação sua que possamos coletar no site
          Vestra. Esta política está em conformidade com a Lei Geral de Proteção de Dados
          (LGPD &ndash; Lei nº 13.709/2018).
        </p>
      </LegalSection>

      <LegalSection number={2} title="Coleta de Dados">
        <p>
          Coletamos apenas as informações estritamente necessárias para o funcionamento
          do serviço:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-foreground">Nome:</strong> Para identificação no
            sistema e personalização da experiência.
          </li>
          <li>
            <strong className="text-foreground">E-mail:</strong> Para login, recuperação
            de senha e comunicações importantes sobre o serviço.
          </li>
          <li>
            <strong className="text-foreground">Telefone:</strong> Como meio de contato.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={3} title="Dados de Pagamento">
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 md:p-6">
          <p className="font-medium text-foreground">Informação importante:</p>
          <p className="mt-2">
            Nós <strong className="text-foreground">NÃO</strong> armazenamos os dados do
            seu cartão de crédito em nossos servidores. Todas as transações de pagamento
            são processadas por meio de provedores de pagamento seguros e certificados.
            Os dados do seu cartão são enviados diretamente e de forma criptografada para
            o provedor de pagamento.
          </p>
        </div>
      </LegalSection>

      <LegalSection number={4} title="Uso das Informações">
        <p>Utilizamos suas informações para:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Fornecer, operar e manter nosso serviço;</li>
          <li>Melhorar, personalizar e expandir nosso serviço;</li>
          <li>Entender e analisar como você usa nosso serviço;</li>
          <li>
            Enviar e-mails, incluindo confirmações de conta, avisos técnicos,
            atualizações de segurança e mensagens de suporte.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={5} title="Seus Direitos (LGPD)">
        <p>Como titular dos dados, você tem direito a:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Confirmar a existência de tratamento de dados;</li>
          <li>Acessar seus dados;</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>
            Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;
          </li>
          <li>Revogar seu consentimento a qualquer momento.</li>
        </ul>
        <p>Para exercer esses direitos, entre em contato conosco.</p>
      </LegalSection>

      <LegalSection number={6} title="Segurança">
        <p>
          Valorizamos sua confiança em nos fornecer suas informações pessoais e, portanto,
          envidamos esforços para usar meios comercialmente aceitáveis para protegê-las.
          No entanto, lembre-se que nenhum método de transmissão pela internet ou método
          de armazenamento eletrônico é 100% seguro e confiável, e não podemos garantir
          sua segurança absoluta.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Contato">
        <p>
          Para questões relacionadas à privacidade e proteção de dados, entre em contato
          conosco através do nosso formulário de contato na página inicial.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
