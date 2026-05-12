import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const LAST_UPDATE = "2026-01-31";

export const metadata = {
  title: "Termos de Uso — Vestra",
  description:
    "Termos de uso do Vestra. Responsabilidades, isenções e direitos do usuário.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Termos de Uso" lastUpdate={LAST_UPDATE}>
      <LegalSection number={1} title="Aceitação dos Termos">
        <p>
          Ao acessar e usar o Vestra (&ldquo;Serviço&rdquo;), você concorda em cumprir e
          estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte
          destes termos, você não deve usar o Serviço.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Descrição do Serviço">
        <p>
          O Vestra é uma plataforma de gestão financeira pessoal que permite aos usuários
          gerenciar despesas, acompanhar gastos, criar orçamentos e visualizar relatórios
          financeiros. O Serviço é fornecido &ldquo;como está&rdquo; e &ldquo;conforme
          disponível&rdquo;.
        </p>
      </LegalSection>

      <LegalSection number={3} title="Responsabilidades do Usuário">
        <p>
          Você é responsável por manter a confidencialidade de sua conta e senha. Você
          concorda em fornecer informações verdadeiras, exatas, atuais e completas durante
          o processo de registro. Você é inteiramente responsável por todas as atividades
          que ocorram sob sua conta.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Isenção de Responsabilidade Financeira">
        <p>
          O Vestra é uma ferramenta de organização e planejamento. Não fornecemos
          consultoria financeira, legal ou fiscal. As informações fornecidas pelo Serviço
          não devem ser interpretadas como aconselhamento profissional. Você é o único
          responsável por suas decisões financeiras.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Propriedade Intelectual">
        <p>
          O Serviço e seu conteúdo original, recursos e funcionalidades são e permanecerão
          de propriedade exclusiva do Vestra e de seus licenciadores. O Serviço é
          protegido por direitos autorais e outras leis do Brasil e de outros países.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Alterações nos Termos">
        <p>
          Reservamo-nos o direito de modificar ou substituir estes Termos a qualquer
          momento. Se uma revisão for material, tentaremos fornecer um aviso com pelo
          menos 30 dias de antecedência antes que quaisquer novos termos entrem em vigor.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Contato">
        <p>
          Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco através
          do nosso formulário de contato na página inicial.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
