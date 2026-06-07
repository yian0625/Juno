import { getToken } from './api'

type UploadResponse = {
  code?: number
  message?: string
  msg?: string
  data?: {
    url?: string
  }
  url?: string
}

export function uploadImage(file: File, onProgress?: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/topic_api/upload_file')

    const token = getToken()
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress?.(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`))
        return
      }

      try {
        const response = JSON.parse(xhr.responseText || '{}') as UploadResponse
        if (response.code !== undefined && response.code !== 200 && response.code !== 0) {
          reject(new Error(response.message || response.msg || 'Upload failed'))
          return
        }

        const url = response.data?.url || response.url
        if (!url) {
          reject(new Error('Upload response missing url'))
          return
        }

        onProgress?.(100)
        resolve(url)
      } catch {
        reject(new Error('Invalid upload response'))
      }
    }

    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.onabort = () => reject(new Error('Upload cancelled'))
    xhr.send(formData)
  })
}
