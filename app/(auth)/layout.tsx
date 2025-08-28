import type React from "react"
import { TeacherLayout } from "@/components/teacher-layout"
import { GestionProvider } from "@/hooks/use-gestion-global"
import { TrimestreProvider } from "@/hooks/use-trimestre-global"
import { getServerSession } from "@/lib/get-server-session"
import { redirect } from "next/navigation"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <GestionProvider>
      <TrimestreProvider>
        <TeacherLayout>{children}</TeacherLayout>
      </TrimestreProvider>
    </GestionProvider>
  )
}
