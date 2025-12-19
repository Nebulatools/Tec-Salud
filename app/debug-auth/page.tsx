"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Link = {
  id: string
  doctor_id: string
  patient_user_id: string
  status: string
}

type Order = {
  id: string
  patient_user_id: string
  doctor_id: string
  specialty_id: string | null
  status: string
  recommended_tests: Record<string, unknown> | unknown[] | null
}

export default function DebugAuthPage() {
  const [userInfo, setUserInfo] = useState<{ id: string; email: string } | null>(null)
  const [links, setLinks] = useState<Link[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)
      const { data: u, error: uErr } = await supabase.auth.getUser()
      if (uErr) {
        setError(uErr.message)
        return
      }
      if (u?.user) {
        setUserInfo({ id: u.user.id, email: u.user.email ?? "" })
      } else {
        setUserInfo(null)
      }

      const { data: l, error: lErr } = await supabase.from("doctor_patient_links").select("*")
      if (lErr) setError(lErr.message)
      setLinks(l ?? [])

      const { data: o, error: oErr } = await supabase.from("lab_orders").select("*")
      if (oErr) setError(oErr.message)
      setOrders(o ?? [])
    }
    load()
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Debug Auth</h1>
      {error && <div className="text-red-600 text-sm">Error: {error}</div>}

      <section className="space-y-2">
        <h2 className="font-medium">Auth user</h2>
        <pre className="bg-gray-100 p-3 rounded text-sm">
{JSON.stringify(userInfo, null, 2)}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">doctor_patient_links (según RLS de tu sesión)</h2>
        <pre className="bg-gray-100 p-3 rounded text-sm">
{JSON.stringify(links, null, 2)}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">lab_orders (según RLS de tu sesión)</h2>
        <pre className="bg-gray-100 p-3 rounded text-sm">
{JSON.stringify(orders, null, 2)}
        </pre>
      </section>
    </div>
  )
}
