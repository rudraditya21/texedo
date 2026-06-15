"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Project = {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

type DisplayCardProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  content?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

function DisplayCard({
  title = "Card Title",
  description = "Card Description",
  action = "Card Action",
  content = "Card Content",
  footer = "Card Footer",
  className,
}: DisplayCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        {title ? <CardTitle>{title}</CardTitle> : null}
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex-1">
        {typeof content === "string" ? <p>{content}</p> : content}
      </CardContent>
      <CardFooter className="mt-auto">
        {typeof footer === "string" ? <p>{footer}</p> : footer}
      </CardFooter>
    </Card>
  )
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const loadProjects = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const response = await fetch("/api/projects", { signal: controller.signal })
        if (!response.ok) throw new Error(`Server error ${response.status}`)
        const data = (await response.json()) as Array<{
          id: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
        }>
        const formatted = data.map((project) => ({
          id: project.id,
          title: project.title,
          description: project.description || undefined,
          createdAt: new Date(project.created_at).toLocaleDateString(),
          updatedAt: new Date(project.updated_at).toLocaleDateString(),
        }))
        setProjects(formatted)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setLoadError("Failed to load projects. Check your connection and refresh.")
        setProjects([])
      } finally {
        setLoading(false)
      }
    }

    void loadProjects()
    return () => controller.abort()
  }, [])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    setCreating(true)
    setCreateError(null)

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
        }),
      })

      if (!response.ok) {
        const err = (await response.json()) as { error?: string }
        throw new Error(err.error || `Server error ${response.status}`)
      }

      const created = (await response.json()) as {
        id: string
        title: string
        description: string | null
        created_at: string
        updated_at: string
      }

      setProjects((current) => [
        {
          id: created.id,
          title: created.title,
          description: created.description || undefined,
          createdAt: new Date(created.created_at).toLocaleDateString(),
          updatedAt: new Date(created.updated_at).toLocaleDateString(),
        },
        ...current,
      ])
      setTitle("")
      setDescription("")
      setDialogOpen(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="py-8 px-6">
      <div className="mx-auto flex w-full flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage multi-file LaTeX projects.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setCreateError(null) }}>
            <DialogTrigger asChild>
              <Button>Create Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Project</DialogTitle>
                <DialogDescription>
                  Add a title and optional description. You can add files later.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={(e) => void handleCreate(e)}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Project title"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Optional description"
                    maxLength={1000}
                  />
                </div>
                {createError ? (
                  <p className="text-sm text-destructive">{createError}</p>
                ) : null}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!title.trim() || creating}>
                    {creating ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <DisplayCard
                key={`loading-${index}`}
                title="Loading..."
                description="Fetching projects"
                action={<Button variant="secondary" size="sm" disabled>Open</Button>}
                content={<div className="min-h-[3rem]" />}
                footer={<span className="text-xs text-muted-foreground">Please wait</span>}
                className="opacity-60"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Start with a fresh project</CardTitle>
              <CardDescription>
                Create your first multi-file LaTeX project to get going.
              </CardDescription>
              <CardAction>
                <Button onClick={() => setDialogOpen(true)}>New Project</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You can add files, images, and references after creation.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 items-stretch">
            {projects.map((project) => (
              <DisplayCard
                key={project.id}
                title={project.title}
                description={project.description}
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/project/${project.id}/editor`}>Open</Link>
                  </Button>
                }
                content={
                  <div className="min-h-[3rem] space-y-1 text-sm text-muted-foreground">
                    <p>Created: {project.createdAt}</p>
                    <p>Updated: {project.updatedAt}</p>
                  </div>
                }
                footer={
                  <span className="text-xs text-muted-foreground">
                    {project.description ? "Includes description" : "No description"}
                  </span>
                }
                className="h-full"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
