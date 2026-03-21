"use client"

import { useState, useEffect, useCallback } from "react"
import type { EmailTemplate, FormField, EventGroup, RegistrationPath } from "@/components/flow-builder/types"

interface UseFlowSyncOptions {
  eventId: string
  pathId?: string | null
}

export function useFlowSync({ eventId }: UseFlowSyncOptions) {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([])
  const [registrationPaths, setRegistrationPaths] = useState<RegistrationPath[]>([])

  const fetchEmailTemplates = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/emails`)
      if (!res.ok) return
      const data = await res.json()
      const templates: EmailTemplate[] = Array.isArray(data)
        ? data
        : Array.isArray(data.templates)
          ? data.templates
          : []
      setEmailTemplates(templates)
      window.dispatchEvent(new CustomEvent("flowSync:emailUpdated", { detail: templates }))
    } catch {
      // silent
    }
  }, [eventId])

  const fetchFormFields = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/form`)
      if (!res.ok) return
      const data = await res.json()
      const fields: FormField[] = Array.isArray(data)
        ? data
        : Array.isArray(data.fields)
          ? data.fields
          : []
      setFormFields(fields)
    } catch {
      // silent
    }
  }, [eventId])

  const fetchEventGroups = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/groups`)
      if (!res.ok) return
      const data = await res.json()
      const groups: EventGroup[] = Array.isArray(data)
        ? data
        : Array.isArray(data.groups)
          ? data.groups
          : []
      setEventGroups(groups)
    } catch {
      // silent
    }
  }, [eventId])

  const fetchRegistrationPaths = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/paths`)
      if (!res.ok) return
      const data = await res.json()
      const paths: RegistrationPath[] = Array.isArray(data)
        ? data
        : Array.isArray(data.paths)
          ? data.paths
          : []
      setRegistrationPaths(paths)
    } catch {
      // silent
    }
  }, [eventId])

  const refreshAll = useCallback(() => {
    fetchEmailTemplates()
    fetchFormFields()
    fetchEventGroups()
    fetchRegistrationPaths()
  }, [fetchEmailTemplates, fetchFormFields, fetchEventGroups, fetchRegistrationPaths])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  return {
    emailTemplates,
    formFields,
    eventGroups,
    registrationPaths,
    refreshAll,
  }
}
