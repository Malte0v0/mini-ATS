// Edge Function: manage-user
// Admin-only account management: reset someone's password, or delete an
// account. Both need the secret key (auth.admin.*), so like create-user this
// runs on the server and checks that the caller is an admin first.

import { withSupabase } from 'npm:@supabase/server@1'

type ManageUserBody = {
  action?: 'reset_password' | 'delete'
  user_id?: string
  password?: string
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    // 1. Only admins.
    const { data: isAdmin, error: adminError } = await ctx.supabase.rpc('is_admin')
    if (adminError || !isAdmin) {
      return Response.json({ error: 'Only admins can manage accounts' }, { status: 403 })
    }

    const body = (await req.json().catch(() => ({}))) as ManageUserBody
    const userId = body.user_id
    if (!userId) {
      return Response.json({ error: 'user_id is required' }, { status: 400 })
    }

    // 2a. Reset password: the admin sets a new one and hands it over.
    if (body.action === 'reset_password') {
      const password = body.password ?? ''
      if (password.length < 8) {
        return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      const { error } = await ctx.supabaseAdmin.auth.admin.updateUserById(userId, { password })
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ ok: true })
    }

    // 2b. Delete: removes the login. The database cascades from auth.users to
    //     profiles, jobs and candidates. CV files aren't rows, so we remove
    //     them from Storage ourselves first.
    if (body.action === 'delete') {
      if (userId === ctx.userClaims?.id) {
        return Response.json({ error: "You can't delete your own account" }, { status: 400 })
      }

      const { data: cvs } = await ctx.supabaseAdmin
        .from('candidates')
        .select('cv_path')
        .eq('owner_id', userId)
        .not('cv_path', 'is', null)
      const paths = (cvs ?? []).map((c) => c.cv_path as string)
      if (paths.length > 0) {
        await ctx.supabaseAdmin.storage.from('cvs').remove(paths)
      }

      const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'action must be reset_password or delete' }, { status: 400 })
  }),
}
