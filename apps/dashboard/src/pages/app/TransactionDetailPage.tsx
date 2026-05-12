import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftRight,
  Calendar,
  Check,
  CircleOff,
  Pencil,
  Tag,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DateDisplay,
  ErrorState,
  PageSkeleton,
  Separator,
  TopBar,
  toast,
} from "@vestra/ui";
import { AppNavShell } from "../../components/AppNav";
import { ConfirmDelete } from "../../components/ConfirmDelete";
import { TransactionFormSheet } from "../../components/sheets/TransactionFormSheet";
import { useAuth } from "../../auth/AuthProvider";
import { useWorkspace } from "../../workspace/WorkspaceProvider";
import {
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from "../../api/hooks/useTransactions";
import { formatMoney } from "../../lib/format";
import { toNumber } from "../../api/types";

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { active } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = active?.id ?? null;
  const query = useTransaction(workspaceId, id);
  const update = useUpdateTransaction(workspaceId ?? "");
  const del = useDeleteTransaction(workspaceId ?? "");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const t = query.data;
  const isIncome = t?.category?.type === 1;
  const amount = t ? toNumber(t.amount) : 0;
  const isOwner = t?.ownerId === user?.id;

  const handleTogglePaid = async () => {
    if (!t) return;
    try {
      await update.mutateAsync({
        id: t.id,
        isPaid: !t.isPaid,
        paidAt: !t.isPaid ? new Date().toISOString().slice(0, 10) : null,
      });
      toast.success(t.isPaid ? "Marcado como pendente" : "Marcado como pago");
    } catch {
      toast.error("Não foi possível atualizar");
    }
  };

  const handleDelete = async () => {
    if (!t) return;
    try {
      await del.mutateAsync(t.id);
      toast.success("Lançamento excluído");
      navigate("/transactions", { replace: true });
    } catch {
      toast.error("Falha ao excluir");
    }
  };

  return (
    <AppNavShell
      topBar={
        <TopBar
          title="Lançamento"
          onBack={() => navigate(-1)}
        />
      }
    >
      <div className="mx-auto max-w-2xl px-4 py-4 md:px-6 md:py-6">
        {query.isLoading ? (
          <PageSkeleton />
        ) : query.error || !t ? (
          <ErrorState
            onRetry={() => query.refetch()}
            title="Lançamento não encontrado"
            description="Pode ter sido removido ou pertencer a outro workspace."
          />
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-5 md:p-6">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                    style={{ backgroundColor: t.category?.color ?? "#94a3b8" }}
                    aria-hidden
                  >
                    {(t.category?.name ?? t.description).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-lg font-semibold leading-tight">
                      {t.description}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant={isIncome ? "default" : "outline"}>
                        {isIncome ? "Receita" : "Despesa"}
                      </Badge>
                      <Badge variant={t.isPaid ? "default" : "outline"}>
                        {t.isPaid ? "Pago" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Valor
                  </p>
                  <p
                    className={`mt-1 text-3xl font-semibold tabular-nums ${
                      isIncome ? "text-success" : "text-destructive"
                    }`}
                  >
                    {isIncome ? "+" : "-"} {formatMoney(amount)}
                  </p>
                </div>

                <Separator />

                <dl className="space-y-3 text-sm">
                  <DetailRow icon={Calendar} label="Vencimento">
                    <DateDisplay date={t.date} />
                  </DetailRow>
                  {t.isPaid && t.paidAt ? (
                    <DetailRow icon={Check} label="Pago em">
                      <DateDisplay date={t.paidAt} />
                    </DetailRow>
                  ) : null}
                  <DetailRow icon={Tag} label="Categoria">
                    {t.category ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: t.category.color ?? "#94a3b8" }}
                          aria-hidden
                        />
                        {t.category.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sem categoria</span>
                    )}
                  </DetailRow>
                  <DetailRow icon={User} label="Criado por">
                    {t.owner?.name ?? t.owner?.email ?? "—"}
                  </DetailRow>
                  <DetailRow icon={Wallet} label="Workspace">
                    {active?.name ?? "—"}
                  </DetailRow>
                  {t.templateId ? (
                    <DetailRow icon={ArrowLeftRight} label="Recorrência">
                      <span className="text-muted-foreground">Gerado por modelo recorrente</span>
                    </DetailRow>
                  ) : null}
                </dl>
              </CardContent>
            </Card>

            {isOwner ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  variant="default"
                  size="lg"
                  className="min-h-12"
                  onClick={handleTogglePaid}
                  disabled={update.isPending}
                >
                  {t.isPaid ? (
                    <>
                      <CircleOff className="h-4 w-4" /> Marcar pendente
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Marcar pago
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="min-h-12"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="min-h-12"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>
            ) : null}

            {active && isOwner ? (
              <>
                <TransactionFormSheet
                  open={editing}
                  onOpenChange={setEditing}
                  workspaceId={active.id}
                  initial={t}
                />
                <ConfirmDelete
                  open={deleting}
                  onOpenChange={setDeleting}
                  title="Excluir lançamento?"
                  description={`"${t.description}" será removido.`}
                  loading={del.isPending}
                  onConfirm={handleDelete}
                />
              </>
            ) : null}
          </div>
        )}
      </div>
    </AppNavShell>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm">{children}</dd>
      </div>
    </div>
  );
}
