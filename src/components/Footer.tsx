import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex items-center justify-between px-6 py-4 text-sm text-zinc-600">
      <p>© 2025 Prompt Architect</p>
      <div className="flex items-center gap-4">
        <Link href="/privacy" className="hover:text-zinc-400 transition-colors">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-zinc-400 transition-colors">
          Terms and Conditions
        </Link>
      </div>
    </footer>
  );
}
