import Link from "next/link";
import { AuthForm } from "../../../components/AuthForm";

export default function LoginPage() {
  return (
    <div className="space-y-4">
      <AuthForm mode="login" />
      <p className="text-center text-sm text-slate-600">
        Hesabin yok mu? <Link href="/register">Kayit ol</Link>
      </p>
    </div>
  );
}
