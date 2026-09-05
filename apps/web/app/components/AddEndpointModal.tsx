'use client'

import { useEffect, useRef, useState, SyntheticEvent } from 'react'
import { adminToken, api, ApiError } from '@/lib/api'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export default function AddEndpointModal({ onClose, onSuccess }: Props) {
  const [url, setUrl] = useState('')
  // Lazy initialiser rather than an effect: this modal only mounts after a
  // click, so it never renders on the server and localStorage is always there.
  const [token, setToken] = useState(() => adminToken.get())
  const [readOnly, setReadOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      setError('URL is required.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setReadOnly(false)

      await api.createEndpoint(trimmed, token.trim())
      adminToken.set(token.trim())
      onSuccess()
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) {
        setError('Something went wrong. Please try again.')
        return
      }

      if (err.status === 409) {
        setError('This endpoint is already being monitored.')
      } else if (err.status === 401 || err.status === 503) {
        // Expected for anyone browsing the public demo.
        setReadOnly(true)
      } else {
        // 400s explain themselves — rejected URLs say why.
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Add Endpoint
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              URL
            </label>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              placeholder="https://api.example.com/health"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
            />
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Admin token
              <span className="ml-1 font-normal text-slate-400">
                — required to make changes
              </span>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value)
                setReadOnly(false)
                setError(null)
              }}
              placeholder="Leave blank if you are just looking around"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {readOnly && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-medium text-amber-900">
                This is a public demo, so it is read-only.
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Adding endpoints needs an admin token. Everything else — uptime,
                response times, incidents and status pages — is fully live.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Adding…' : 'Add Endpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
