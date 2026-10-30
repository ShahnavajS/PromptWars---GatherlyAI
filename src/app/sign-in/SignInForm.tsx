'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInForm({ nextPath, example }: { nextPath: string; example: { email: string; password: string } | null }) {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(register ? { mode: 'register', name, email, password } : { mode: 'login', email, password }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'Could not sign in.'); return; }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError('Could not connect to the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-wrap grid min-h-[calc(100vh-250px)] gap-10 py-12 lg:grid-cols-2 lg:items-center lg:gap-20">
      <div className="rounded-[28px] bg-[#e8eee4] p-8 sm:p-12">
        <span className="eyebrow">Welcome to Gatherly</span>
        <h1 className="font-editorial mt-5 text-[clamp(3rem,5vw,5.5rem)] leading-[1.02] tracking-[-.06em]">A good plan makes space for joy.</h1>
        <p className="mt-7 max-w-md text-base leading-7 text-[#596860]">Keep your ideas, budget, timeline and vendor notes in one thoughtful planning space.</p>
        <div className="mt-10 flex gap-3" aria-hidden="true"><span className="h-14 w-14 rounded-full bg-[#efd0c2]" /><span className="h-14 w-14 rounded-full bg-[#e9c980]" /><span className="h-14 w-14 rounded-full bg-[#c7dcc9]" /></div>
      </div>
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">{register ? 'Begin here' : 'Good to see you again'}</p>
        <h2 className="font-editorial mt-3 text-4xl tracking-[-.04em]">{register ? 'Create your account' : 'Sign in'}</h2>
        <p className="mt-3 text-sm leading-6 text-[#596860]">{register ? 'Your next celebration starts with a place to keep it all together.' : 'Pick up right where your planning left off.'}</p>
        <form onSubmit={submit} className="surface-card mt-8 space-y-5 p-6 sm:p-8">
          {register && <div><label htmlFor="name" className="form-label">Your name</label><input id="name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="form-control" /></div>}
          <div><label htmlFor="email" className="form-label">Email address</label><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="form-control" /></div>
          <div><label htmlFor="password" className="form-label">Password</label><input id="password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={12} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} className="form-control" /><p className="mt-2 text-xs text-[#596860]">Use at least 12 characters.</p></div>
          {error && <p role="alert" className="rounded-xl bg-[#fff0eb] p-3 text-sm text-[#8f4938]">{error}</p>}
          {!register && example && <button type="button" className="button-secondary w-full" onClick={() => { setEmail(example.email); setPassword(example.password); setError(''); }}>Fill example account</button>}
          <button type="submit" disabled={busy} className="button-primary w-full">{busy ? 'One moment…' : register ? 'Create account' : 'Sign in'}</button>
        </form>
        {example && <p className="mt-4 text-xs leading-5 text-[#596860]">The example account is shared. Use it only for sample plans; create your own account for private events.</p>}
        <button type="button" onClick={() => { setRegister(!register); setError(''); }} className="button-text mt-5 text-sm">{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
      </div>
    </div>
  );
}
