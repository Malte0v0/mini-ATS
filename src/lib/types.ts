// Mirrors the tables in supabase/migrations/001_init.sql.
export type UserRole = 'admin' | 'customer'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export type JobStatus = 'open' | 'closed'

export type Job = {
  id: string
  owner_id: string
  title: string
  description: string | null
  status: JobStatus
  created_at: string
}

export type CandidateStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'

// Kanban columns, in order.
export const STAGES: { id: CandidateStage; label: string }[] = [
  { id: 'applied', label: 'Applied' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'hired', label: 'Hired' },
  { id: 'rejected', label: 'Rejected' },
]

export type AiAssessment = {
  summary: string
  strengths: string[]
  concerns: string[]
  model?: string
  assessed_at?: string
}

export type Candidate = {
  id: string
  owner_id: string
  job_id: string
  full_name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  notes: string | null
  stage: CandidateStage
  cv_path: string | null
  ai_score: number | null
  ai_assessment: AiAssessment | null
  created_at: string
}
