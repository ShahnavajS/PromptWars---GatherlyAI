'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function SessionNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<{ name: string; isDemoMode: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/auth/session').then((response) => response.json()).then((result) => {
      setSession(result.success ? result.data : null);
    }).catch(() => { setSession(null); });
  }, [pathname]);

  async function signOut() {
    const response = await fetch('/api/auth/session', { method: 'DELETE' });
    if (response.ok) {
      setSession(null);
      router.push('/sign-in');
      router.refresh();
    }
  }

  if (!session) {
    return <Link href="/sign-in" className="rounded-xl px-3 py-2 text-sm font-semibold text-[#285942] hover:bg-[#e8efe5]">Sign in</Link>;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-36 truncate text-sm text-[#596860] md:inline">{session.name}</span>
      <button type="button" onClick={signOut} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#285942] hover:bg-[#e8efe5]">Sign out</button>
    </div>
  );
}
