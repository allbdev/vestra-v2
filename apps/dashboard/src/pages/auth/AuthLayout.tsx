import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background px-4 pb-safe pt-safe text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 py-12">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <span className="text-lg font-bold">V</span>
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div>{children}</div>
        {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
