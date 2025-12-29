"use client";

import { Editor } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const defaultCode = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}

\\title{Live LaTeX Preview}
\\author{Your Name}
\\maketitle

\\section{Introduction}
This is a quick example with math $E = mc^2$ and a fraction:
\\[
  \\frac{\\alpha + \\beta}{\\gamma}
\\]

\\begin{itemize}
  \\item Lists
  \\item Math inline $\\int_0^1 x^2\\,dx$
  \\item Environments like equations
\\end{itemize}

\\end{document}
`;

type ProjectSource = {
  id: string;
  path: string;
  content: string;
};

export default function EditorPage() {
  const params = useParams<{ projectId: string }>();
  const projectId =
    typeof params.projectId === "string" ? params.projectId : "";
  const [code, setCode] = useState(defaultCode);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [activeFile, setActiveFile] = useState<ProjectSource | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewPaneRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const saveTimeoutRef = useRef<number | null>(null);
  const { resolvedTheme } = useTheme();

  const saveSource = useCallback(
    (nextContent: string) => {
      if (!activeFile || !projectId) return;
      void fetch(`/api/projects/${projectId}/sources`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: activeFile.path,
          content: nextContent,
        }),
      });
    },
    [activeFile, projectId]
  );

  const editorOptions = useMemo<MonacoEditor.IStandaloneEditorConstructionOptions>(
    () => ({
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'Fira Code', 'JetBrains Mono', 'SFMono-Regular', monospace",
      fontLigatures: true,
      minimap: { enabled: true },
      wordWrap: "on",
      renderWhitespace: "selection",
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      tabSize: 2,
      insertSpaces: true,
      lineNumbers: "on",
      roundedSelection: true,
      autoIndent: "full",
      formatOnType: true,
      formatOnPaste: true,
      scrollBeyondLastLine: false,
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
    }),
    [],
  );

  const renderLatexPreview = useCallback(async (source: string, signal: AbortSignal) => {
    try {
      const response = await fetch("/api/latex", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: source,
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to compile LaTeX");
      }

      const pdfBlob = await response.blob();
      const nextUrl = URL.createObjectURL(pdfBlob);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      previewUrlRef.current = nextUrl;
      setPreviewPdfUrl(nextUrl);
      setPreviewError(null);
      setActivePage(1);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Failed to compile LaTeX";
      setPreviewError(message);
      setPreviewPdfUrl(null);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      renderLatexPreview(code, controller.signal);
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [code, renderLatexPreview]);

  useEffect(() => {
    if (!activeFile) return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveSource(code);
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeFile, code, projectId, saveSource]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSave =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "s";
      if (!isSave) return;
      event.preventDefault();
      saveSource(code);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, saveSource]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = previewPaneRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.max(240, entry.contentRect.width - 16);
      setPageWidth(nextWidth);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!previewPdfUrl || !numPages) return;
    pageRefs.current = pageRefs.current.slice(0, numPages);
  }, [previewPdfUrl, numPages]);

  useEffect(() => {
    if (!previewPdfUrl || !numPages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number(visible.target.getAttribute("data-page"));
        if (!Number.isNaN(index)) {
          setActivePage(index);
        }
      },
      {
        root: previewPaneRef.current,
        threshold: [0.4, 0.6, 0.8],
      },
    );

    pageRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [previewPdfUrl, numPages]);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) return;
      const data = (await response.json()) as {
        sources: ProjectSource[];
      };
      const mainSource =
        data.sources.find((source) => source.path === "main.tex") ||
        data.sources[0];
      if (mainSource) {
        setActiveFile(mainSource);
        setCode(mainSource.content);
      }
    };
    void loadProject();
  }, [projectId]);

  const handleEditorMount = useCallback(
    (
      editor: MonacoEditor.IStandaloneCodeEditor,
      _monaco: typeof import("monaco-editor"),
    ) => {
      editor.focus();
    },
    [],
  );

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="grid h-full grid-cols-1 lg:grid-cols-2">
        <section className="flex h-full min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Editor</p>
              <p className="text-xs text-muted-foreground">
                {activeFile ? activeFile.path : "main.tex"}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">Auto-saving</span>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              width="100%"
              defaultLanguage="plaintext"
              value={code}
              onChange={(value) => setCode(value ?? "")}
              theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
              options={editorOptions}
              onMount={handleEditorMount}
            />
          </div>
        </section>

        <section className="flex h-full min-h-0 flex-col bg-muted/30">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <p className="text-sm font-semibold">Live Preview</p>
            <span className="text-xs text-muted-foreground">
              {activePage}
              {numPages ? ` / ${numPages}` : ""}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              Zoom {(zoom * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex-1 min-h-0 p-4">
            <div
              className={`flex h-full flex-col rounded-xl border p-4 ${
                zoom < 1 ? "bg-accent/20" : "bg-card"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 pb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((prev) => Math.min(prev + 0.1, 2.5))}
                >
                  Zoom +
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.6))}
                >
                  Zoom -
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(1)}
                >
                  Reset
                </Button>
                {previewPdfUrl ? (
                  <Button asChild variant="secondary" size="sm">
                    <a href={previewPdfUrl} download="preview.pdf">
                      Download
                    </a>
                  </Button>
                ) : null}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-2" ref={previewPaneRef}>
                {previewError ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    <p className="font-medium">Preview error</p>
                    <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-destructive/80">
                      {previewError}
                    </p>
                  </div>
                ) : previewPdfUrl ? (
                  <Document
                    file={previewPdfUrl}
                    onLoadSuccess={({ numPages: loadedPages }) => {
                      setNumPages(loadedPages);
                      setActivePage(1);
                    }}
                    onLoadError={(error) => {
                      setPreviewError(error?.message || "Failed to load PDF.");
                    }}
                    loading={
                      <div className="text-sm text-muted-foreground">
                        Loading PDF…
                      </div>
                    }
                    error={
                      <div className="text-sm text-destructive">
                        Failed to load PDF.
                      </div>
                    }
                  >
                    {numPages
                      ? Array.from({ length: numPages }, (_, index) => {
                          const pageIndex = index + 1;
                          return (
                            <div
                              key={pageIndex}
                              data-page={pageIndex}
                              ref={(node) => {
                                pageRefs.current[pageIndex - 1] = node;
                              }}
                              className="mb-4"
                            >
                              <Page
                                pageNumber={pageIndex}
                                width={
                                  pageWidth
                                    ? Math.floor(pageWidth * zoom)
                                    : undefined
                                }
                                renderTextLayer
                                renderAnnotationLayer
                              />
                            </div>
                          );
                        })
                      : null}
                  </Document>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground">
                    Waiting for preview...
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
