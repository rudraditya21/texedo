"use client"

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/projects")
      if (!response.ok) throw new Error("Failed to load projects.")
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
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void (async () => {
      const trimmedTitle = title.trim()
      if (!trimmedTitle) return
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
        }),
      })
      if (!response.ok) return
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
    })()
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Project title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!title.trim()}>
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {loading ? (
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
                action={<Button variant="secondary" size="sm">Open</Button>}
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
