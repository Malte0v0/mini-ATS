// Edge Function: create-user
// Lets an admin create a new account (admin or customer).
//
// Why a server function: creating a login for SOMEONE ELSE needs the secret
// key (auth.admin.createUser). The secret key bypasses RLS, so it must never
// reach the browser. This function holds it on the server and only uses it
// after checking that the caller is an admin.

import { withSupabase } from 'npm:@supabase/server@1'

type CreateUserBody = {
  email?: string
  password?: string
  full_name?: string
  role?: string
}

export default {
  // auth: 'user' = the request must carry a valid logged-in user's JWT.
  // The wrapper also handles CORS and the browser's OPTIONS preflight.
  // ctx.supabase      -> acts as the caller, RLS applies
  // ctx.supabaseAdmin -> uses the secret key, bypasses RLS
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    // 1. Is the caller an admin? Ask the database with the caller's own
    //    permissions, using the same is_admin() function our RLS policies use.
    const { data: isAdmin, error: adminError } = await ctx.supabase.rpc('is_admin')
    if (adminError || !isAdmin) {
      return Response.json({ error: 'Only admins can create accounts' }, { status: 403 })
    }

    // 2. Validate input. Never trust the browser, even an admin's.
    const body = (await req.json().catch(() => ({}))) as CreateUserBody
    const email = body.email?.trim().toLowerCase()
    const password = body.password ?? ''
    const fullName = body.full_name?.trim() || null
    const role = body.role

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (role !== 'admin' && role !== 'customer') {
      return Response.json({ error: 'Role must be admin or customer' }, { status: 400 })
    }

    // 3. Create the login. email_confirm: true = no confirmation email needed,
    //    the admin hands over the credentials directly.
    const { data: created, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return Response.json({ error: createError?.message ?? 'Could not create user' }, { status: 400 })
    }

    // 4. Create the matching profiles row (this is where the role lives).
    const { error: profileError } = await ctx.supabaseAdmin.from('profiles').insert({
      id: created.user.id,
      email,
      full_name: fullName,
      role,
    })
    if (profileError) {
      // Roll back: a login without a profile would have no role at all.
      await ctx.supabaseAdmin.auth.admin.deleteUser(created.user.id)
      return Response.json({ error: profileError.message }, { status: 500 })
    }

    return Response.json({ id: created.user.id, email, role })
  }),
}
