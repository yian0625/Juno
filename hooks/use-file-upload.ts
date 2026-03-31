import { useCallback, useMemo, useRef, useState } from "react"
import { useDrop } from "ahooks"
import { nanoid } from "nanoid"
import { toast } from "@/components/ui/use-toast"
import { uploadImage } from "@/lib/upload"
import type { RefObject } from "react"

export enum FileUploadStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  SUCCESS = "success",
  ERROR = "error",
}

export interface UploadFileItem {
  file: File
  isImage: boolean
  fileUrl?: string
  id: string
  previewUrl?: string
  status: FileUploadStatus
  progress?: number
}

interface UseFileUploadConfig {
  exceptFiles?: string[]
  maxNum?: number
  maxSize?: number
}

const mimeTypes = [
  // 文档类
  { format: "pdf", extension: ".pdf", mime: "application/pdf" },
  { format: "docx", extension: ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { format: "txt", extension: ".txt", mime: "text/plain" },
  // 图像类
  { format: "png", extension: ".png", mime: "image/png" },
  { format: "jpg", extension: ".jpg", mime: "image/jpeg" },
  { format: "jpeg", extension: ".jpeg", mime: "image/jpeg" },
  { format: "gif", extension: ".gif", mime: "image/gif" },
  { format: "webp", extension: ".webp", mime: "image/webp" },
]

const mimeTypesMap = mimeTypes.reduce(
  (acc, item) => {
    acc[item.extension] = item.mime
    return acc
  },
  {} as Record<string, string>
)

const DEFAULT_CONFIG: Required<UseFileUploadConfig> = {
  exceptFiles: mimeTypes.map((item) => item.extension),
  // 10个
  maxNum: 10,
  // 20MB
  maxSize: 1024 * 1024 * 20,
}

export function useFileUpload(containerRef?: RefObject<HTMLDivElement | null>, config: UseFileUploadConfig = DEFAULT_CONFIG) {
  const [isUploading, setIsUploading] = useState(false)

  const [uploadFileList, setUploadFileList] = useState<UploadFileItem[]>([])

  const { exceptFiles, maxNum, maxSize } = Object.assign({}, DEFAULT_CONFIG, config || {}) as Required<UseFileUploadConfig>

  const allowedMimeTypes = useMemo(() => exceptFiles.map((item) => mimeTypesMap[item]), [exceptFiles])

  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const filterFiles = useCallback(
    (files: File[]) => {
      const filteredFiles = files
        .filter((file) => {
          return allowedMimeTypes?.includes(file.type) && file.size <= maxSize
        })
        .slice(0, maxNum)
      // 先过滤类型
      if (filteredFiles.length < files.length) {
        const num = files.length - filteredFiles.length
        toast({
          title: "文件过滤提示",
          description: `${num === 1 ? "当前" : `${num}个`}文件已过滤，仅支持小于20MB的图片、文档、PDF资源`,
          variant: "default",
        })
      }
      return filteredFiles
    },
    [allowedMimeTypes, maxSize, maxNum]
  )

  /**
   * @description: 更新文件信息
   */
  const updateFileInfo = useCallback((fileItem: Partial<UploadFileItem>) => {
    setUploadFileList((prev) => prev.map((item) => (item.id === fileItem.id ? { ...item, ...fileItem } : item)))
  }, [])

  /**
   * @description: 创建上传任务
   */
  const createUploadTask = useCallback(
    async (fileItem: UploadFileItem) => {
      const { file, id } = fileItem

      try {
        updateFileInfo({ id, status: FileUploadStatus.UPLOADING, progress: 0 })
        
        const url = await uploadImage(file, (progress) => {
          updateFileInfo({ id, status: FileUploadStatus.UPLOADING, progress })
        })
        
        updateFileInfo({ id, fileUrl: url, status: FileUploadStatus.SUCCESS, progress: 100 })
      } catch (error) {
        console.error("Upload failed:", error)
        updateFileInfo({ id, status: FileUploadStatus.ERROR, progress: 0 })
      }
    },
    [updateFileInfo]
  )

  /**
   * @description: 创建上传文件
   */
  const uploadFiles = useCallback(
    async (file: File | File[]) => {
      const files = Array.isArray(file) ? file : [file]
      const tasks = files.map((file) => ({
        file,
        fileUrl: undefined,
        id: nanoid(),
        previewUrl: file.type.startsWith("image") ? URL.createObjectURL(file) : undefined,
        status: FileUploadStatus.PENDING,
        isImage: file.type.startsWith("image"),
      }))

      setIsUploading(true)
      setUploadFileList((prev) => [...prev, ...tasks])
      try {
        await Promise.allSettled(tasks.map((task) => createUploadTask(task)))
      } finally {
        // 确保无论上传成功、失败还是异常，都重置上传状态
        setIsUploading(false)
      }
    },
    [createUploadTask]
  )

  // 点击触发文件选择框
  const selectFilesToUpload = useCallback(() => {
    // 创建隐藏的文件输入框（如果不存在）
    if (!fileInputRef.current) {
      const input = document.createElement("input")
      input.type = "file"
      input.multiple = true
      // 设置文件类型过滤
      input.accept = allowedMimeTypes?.join(",") || ""
      // 监听文件选择事件
      input.onchange = (e) => {
        const acceptedFiles = (e.target as HTMLInputElement).files
        const files = filterFiles(Array.from(acceptedFiles || []))
        if (files.length > 0) {
          uploadFiles(files)
        }
        // 重置输入框值，以便能重复选择同一文件
        input.value = ""
      }
      fileInputRef.current = input
    }
    // 触发文件选择框
    fileInputRef.current.click()
  }, [uploadFiles, allowedMimeTypes, filterFiles])

  // 使用传入的 containerRef 处理拖拽
  useDrop(containerRef, {
    onDragEnter: () => {
      setIsDragOver(true)
    },
    onDragLeave: () => {
      setIsDragOver(false)
    },
    onFiles: (acceptedFiles: File[]) => {
      // 根据 canUploadImage 过滤文件类型
      const files = filterFiles(Array.from(acceptedFiles))
      if (files.length > 0) {
        uploadFiles(files)
      }
      setIsDragOver(false)
    },
  })

  /**
   * @description: 删除上传文件
   */
  const remove = useCallback(async (id: string) => {
    setUploadFileList((prev) => prev.filter((item) => item.id !== id))
  }, [])

  /**
   * @description: 取消所有上传任务
   */
  const removeAll = useCallback(async () => {
    setUploadFileList([])
  }, [])

  return {
    isUploading,
    isDragOver,
    uploadFiles,
    selectFilesToUpload,
    uploadFileList,
    remove,
    removeAll,
    updateFileInfo,
  }
}

