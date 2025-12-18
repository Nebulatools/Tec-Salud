"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ExpedientesPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/especialistas")
  }, [router])
  return null
}
