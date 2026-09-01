"use client"



import { Suspense, useEffect } from "react"

import { useRouter, useSearchParams } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

import {

  fetchProfileRole,

  privilegedGoogleBlockMessage,

  privilegedGoogleLoginPath,

  signOutIfPrivilegedGoogle,

} from "@/lib/privileged-session-guard"



function AuthCallbackContent() {

  const router = useRouter()

  const searchParams = useSearchParams()



  useEffect(() => {

    const run = async () => {

      const supabase = createClient()

      if (!supabase) {

        router.replace("/login?auth_error=Supabase+is+not+configured")

        return

      }



      const errorDescription = searchParams.get("error_description")

      if (errorDescription) {

        router.replace(`/login?auth_error=${encodeURIComponent(errorDescription)}`)

        return

      }



      const code = searchParams.get("code")

      if (code) {

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {

          router.replace(`/login?auth_error=${encodeURIComponent(error.message)}`)

          return

        }

      }



      const {

        data: { user },

      } = await supabase.auth.getUser()



      if (user) {

        const role = await fetchProfileRole(supabase, user.id)

        if (await signOutIfPrivilegedGoogle(supabase, user, role)) {

          if (role === "staff" || role === "admin") {

            const message = encodeURIComponent(privilegedGoogleBlockMessage(role))

            router.replace(`${privilegedGoogleLoginPath(role)}?auth_error=${message}`)

            return

          }

        }

      }



      router.replace("/")

    }



    void run()

  }, [router, searchParams])



  return (

    <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">

      Signing you in…

    </div>

  )

}



export default function AuthCallbackPage() {

  return (

    <Suspense

      fallback={

        <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">

          Signing you in…

        </div>

      }

    >

      <AuthCallbackContent />

    </Suspense>

  )

}


