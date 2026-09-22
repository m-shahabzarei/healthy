import { AuthCard } from '@/components/auth/AuthCard';
import { AuthForm } from '@/components/auth/AuthForm';

export default function RegisterPage() {
  return <AuthCard mode="register"><AuthForm mode="register" /></AuthCard>;
}
