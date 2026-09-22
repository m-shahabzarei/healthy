import { AuthCard } from '@/components/auth/AuthCard';
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  return <AuthCard mode="login"><AuthForm mode="login" /></AuthCard>;
}
