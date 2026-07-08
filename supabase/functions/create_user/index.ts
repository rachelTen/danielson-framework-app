import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@^2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

interface UserData {
  email: string
  password: string
  full_name: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const { email, password, full_name }: UserData = await req.json()

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, full_name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: user, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (signUpError) {
      return new Response(JSON.stringify({ error: signUpError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.user.id,
        email,
        full_name,
      })

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully",
        user: { id: user.user.id, email: user.user.email },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
