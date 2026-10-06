import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Calls one of our Edge Functions. invoke() sends the logged-in user's JWT
// automatically. On a non-2xx response the function's own JSON error message
// is in error.context, so we read it from there.
export async function invokeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (!error) return { data, error: null }

  const message =
    error instanceof FunctionsHttpError
      ? ((await error.context.json().catch(() => null))?.error ?? error.message)
      : error.message
  return { data: null, error: message }
}
