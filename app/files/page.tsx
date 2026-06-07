"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Upload, File, Image, FileText, Trash2, Download, FolderOpen,
  Loader2,
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { uploadAPI } from "@/lib/api"

interface UploadedFile {
  url: string
  filename: string
  file_type: string
  size: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

function getFileIcon(type: string) {
  if (type === "image") return <Image className="h-4 w-4 text-muted-foreground" />
  if (type === "pdf") return <FileText className="h-4 w-4 text-muted-foreground" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

export default function FilesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    setIsUploading(true)
    try {
      const results: UploadedFile[] = []
      for (const f of Array.from(fileList)) {
        const result = await uploadAPI.uploadFile(f)
        results.push(result)
      }
      setFiles(prev => [...results, ...prev])
      toast({ title: `已上传 ${results.length} 个文件` })
    } catch (err: any) {
      toast({ title: "上传失败", description: err.message })
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const handleDelete = () => {
    if (deletingIndex === null) return
    setFiles(prev => prev.filter((_, i) => i !== deletingIndex))
    setDeletingIndex(null)
    toast({ title: "已移除" })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">{files.length} 个文件</p>
          <label>
            <input type="file" multiple className="hidden" onChange={handleUpload} accept="image/*,.pdf" />
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild disabled={isUploading}>
              <span>
                {isUploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                上传文件
              </span>
            </Button>
          </label>
        </div>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-medium mb-1">暂无文件</p>
            <p className="text-xs mb-4">上传图片或 PDF 文件开始管理</p>
            <label>
              <input type="file" multiple className="hidden" onChange={handleUpload} accept="image/*,.pdf" />
              <Button size="sm" asChild>
                <span><Upload className="h-3.5 w-3.5 mr-1.5" />上传文件</span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-0.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 group transition-colors">
                {getFileIcon(f.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.filename}</p>
                  <p className="text-[11px] text-muted-foreground">{formatSize(f.size)} · {f.file_type}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {f.file_type === "image" && (
                    <a href={f.url} target="_blank" className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button onClick={() => setDeletingIndex(i)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deletingIndex !== null} onOpenChange={(open) => !open && setDeletingIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除文件？</AlertDialogTitle>
            <AlertDialogDescription>文件将从列表中移除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
