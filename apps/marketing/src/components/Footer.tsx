import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            V
          </span>
          <span className="text-sm font-medium">Vestra</span>
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}
          </span>
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacidade
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Termos
          </Link>
          <Link href="/#contact" className="hover:text-foreground">
            Contato
          </Link>
        </nav>
      </div>
    </footer>
  );
}
