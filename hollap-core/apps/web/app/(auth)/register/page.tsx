import Link from "next/link";
import { AuthForm } from "../../../components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="space-y-4">
      <AuthForm mode="register" />
      <p className="text-center text-sm text-slate-600">
        Hesabin var mi? <Link href="/login">Giris yap</Link>
      </p>
    </div>
  );
}
