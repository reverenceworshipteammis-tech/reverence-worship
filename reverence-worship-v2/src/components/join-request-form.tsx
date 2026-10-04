"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitJoinRequest, type JoinRequestState } from "@/app/join/actions";

const initialState: JoinRequestState = {};

export function JoinRequestForm() {
  const [state, formAction, pending] = useActionState(submitJoinRequest, initialState);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-blue-100 bg-white p-6 shadow-xl sm:p-10">
        <Link href="/" className="text-sm font-semibold text-blue-700">← Back to home</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">You belong here</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-slate-950">Join Reverence Worship</h1>
        <p className="mt-3 leading-7 text-slate-600">Share your contact details and we’ll get in touch to welcome you.</p>

        {state.success ? (
          <div role="status" className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900">{state.success}</div>
        ) : (
          <form action={formAction} className="mt-8 grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Full name
              <input name="name" required maxLength={120} autoComplete="name" className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Phone number
              <input name="phone" type="tel" required maxLength={40} autoComplete="tel" className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Email address
              <input name="email" type="email" required maxLength={254} autoComplete="email" className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Anything you’d like us to know? <span className="font-normal text-slate-500">(optional)</span>
              <textarea name="details" rows={4} maxLength={2000} className="resize-y rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
            </label>
            {state.error && <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>}
            <button type="submit" disabled={pending} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              {pending ? "Sending…" : "Send request"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
