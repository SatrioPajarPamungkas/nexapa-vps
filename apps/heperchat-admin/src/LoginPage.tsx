/**
 * Adapted from Medusa Community Admin Login and EmailPassLogin.
 * Upstream f8dce55556a1e68d6ea9b2fb88852b2a76fbd73c — MIT.
 */
import { FormEvent, useState } from "react"
import { LockClosedSolid } from "../third_party/medusa-icons/src"
import { Alert } from "../third_party/medusa-ui/src/components/alert"
import { Avatar } from "../third_party/medusa-ui/src/components/avatar"
import { Button } from "../third_party/medusa-ui/src/components/button"
import { Heading } from "../third_party/medusa-ui/src/components/heading"
import { Input } from "../third_party/medusa-ui/src/components/input"
import { Label } from "../third_party/medusa-ui/src/components/label"
import { Text } from "../third_party/medusa-ui/src/components/text"
import { AdminUser, login } from "./commerce-api"

type LoginPageProps = {
  onAuthenticated: (user: AdminUser) => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const response = await login(email.trim(), password)
      if (!response.data.user.is_admin) {
        setError("Akun ini tidak memiliki akses administrator Commerce.")
        return
      }
      onAuthenticated(response.data.user)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login gagal. Silakan coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-ui-bg-subtle flex min-h-dvh w-full items-center justify-center px-4">
      <div className="flex w-full max-w-[320px] flex-col items-center">
        <div className="shadow-elevation-card-rest mb-6 rounded-xl border p-1.5">
          <Avatar variant="squared" size="large" fallback="N" />
        </div>
        <div className="mb-8 flex flex-col items-center gap-y-1">
          <Heading level="h1">Masuk ke Nexapa Commerce</Heading>
          <Text size="small" className="text-ui-fg-subtle text-center">
            Gunakan akun administrator Nexapa Anda.
          </Text>
        </div>

        <form onSubmit={submit} className="flex w-full flex-col gap-y-5">
          <div className="flex flex-col gap-y-4">
            <div className="space-y-2">
              <Label htmlFor="commerce-email" size="small" weight="plus">Email</Label>
              <Input
                id="commerce-email"
                type="email"
                autoComplete="email"
                placeholder="nama@nexapa.app"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commerce-password" size="small" weight="plus">Password</Label>
              <Input
                id="commerce-password"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <Button className="w-full" type="submit" isLoading={submitting}>
            Masuk
          </Button>
        </form>

        <div className="text-ui-fg-muted mt-8 flex items-center gap-x-2">
          <LockClosedSolid />
          <Text size="xsmall">Sesi aman melalui Laravel Sanctum</Text>
        </div>
      </div>
    </div>
  )
}
