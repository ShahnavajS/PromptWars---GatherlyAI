import SignInForm from './SignInForm';
import { exampleAccountConfig } from '@/lib/auth/accounts';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next;
  const nextPath = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
    ? next : '/';
  const example = exampleAccountConfig();
  return <SignInForm nextPath={nextPath} example={example.enabled ? { email: example.email, password: example.password } : null} />;
}
