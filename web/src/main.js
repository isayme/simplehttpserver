import './style.css'

const CONFIG = {
  endpoint: '/api/upload',
  fieldName: 'files',
  maxFileSize: 50 * 1024 * 1024, // 50 MB
}

const app = document.getElementById('app')

const dropzone = document.getElementById('dropzone')
const fileInput = document.getElementById('fileInput')
const fileList = document.getElementById('fileList')
const actions = document.getElementById('actions')
const clearBtn = document.getElementById('clearBtn')
const uploadBtn = document.getElementById('uploadBtn')

let files = []
let uid = 0

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
}

function extLabel(name) {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop().slice(0, 4) : '?'
}

function addFiles(fileArr) {
  for (const file of fileArr) {
    if (file.size > CONFIG.maxFileSize) {
      alert('文件 "' + file.name + '" 超过 50 MB，已跳过。')
      continue
    }
    files.push({ id: ++uid, file, status: 'ready', progress: 0 })
  }
  render()
}

function removeFile(id) {
  const target = files.find((f) => f.id === id)
  if (target && target.xhr) target.xhr.abort()
  files = files.filter((f) => f.id !== id)
  syncButtons()
  render()
}

function render() {
  fileList.innerHTML = ''

  if (files.length === 0) {
    actions.classList.add('hidden')
    return
  }
  actions.classList.remove('hidden')

  files.forEach((item) => {
    const el = document.createElement('div')
    el.className =
      'file-item' +
      (item.status === 'done' ? ' done' : '') +
      (item.status === 'error' ? ' error' : '')
    if (item.status === 'error') {
      el.style.cursor = 'pointer'
      el.addEventListener('click', (e) => {
        if (e.target.closest('.remove-btn')) return
        uploadOne(item)
      })
    }

    const thumb = document.createElement('div')
    thumb.className = 'thumb'
    if (item.file.type.startsWith('image/')) {
      const img = document.createElement('img')
      img.src = URL.createObjectURL(item.file)
      img.alt = item.file.name
      img.onload = () => URL.revokeObjectURL(img.src)
      thumb.appendChild(img)
    } else {
      thumb.textContent = extLabel(item.file.name)
    }

    const info = document.createElement('div')
    info.className = 'file-info'

    const name = document.createElement('div')
    name.className = 'file-name'
    name.textContent = item.file.name

    const meta = document.createElement('div')
    meta.className = 'file-meta'
    if (item.status === 'uploading') {
      meta.textContent = '上传中… ' + item.progress + '%'
    } else if (item.status === 'done') {
      meta.textContent = '上传完成 · ' + formatSize(item.file.size)
    } else if (item.status === 'error') {
      meta.textContent = '上传失败，点击重试'
    } else {
      meta.textContent = formatSize(item.file.size)
    }

    info.appendChild(name)
    info.appendChild(meta)

    if (item.status !== 'ready') {
      const progress = document.createElement('div')
      progress.className = 'progress'
      const bar = document.createElement('div')
      bar.className = 'progress-bar'
      bar.style.width = item.progress + '%'
      progress.appendChild(bar)
      info.appendChild(progress)
    }

    const btn = document.createElement('button')
    btn.className = 'remove-btn'
    btn.setAttribute('aria-label', '移除文件')
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    btn.addEventListener('click', () => removeFile(item.id))

    el.appendChild(thumb)
    el.appendChild(info)
    if (item.status !== 'uploading') el.appendChild(btn)

    fileList.appendChild(el)
  })
}

function syncButtons() {
  const uploading = files.some((f) => f.status === 'uploading')
  uploadBtn.disabled = uploading
  clearBtn.disabled = uploading
  uploadBtn.textContent = uploading ? '上传中…' : '开始上传'
}

function uploadOne(item) {
  if (item.status === 'uploading' || item.status === 'done') return

  const formData = new FormData()
  formData.append(CONFIG.fieldName, item.file, item.file.name)

  const xhr = new XMLHttpRequest()
  item.xhr = xhr
  item.status = 'uploading'
  item.progress = 0
  syncButtons()
  render()

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      item.progress = Math.round((e.loaded / e.total) * 100)
      render()
    }
  })

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      item.progress = 100
      item.status = 'done'
    } else {
      item.status = 'error'
    }
    item.xhr = null
    syncButtons()
    render()
  })

  xhr.addEventListener('error', () => {
    item.status = 'error'
    item.xhr = null
    syncButtons()
    render()
  })

  xhr.addEventListener('abort', () => {
    item.status = 'error'
    item.xhr = null
    syncButtons()
    render()
  })

  xhr.open('POST', CONFIG.endpoint)
  xhr.send(formData)
}

function startUpload() {
  const pending = files.filter((f) => f.status === 'ready' || f.status === 'error')
  pending.forEach(uploadOne)
}

// Event listeners
dropzone.addEventListener('click', () => fileInput.click())
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fileInput.click()
  }
})

fileInput.addEventListener('change', (e) => {
  addFiles(Array.from(e.target.files))
  fileInput.value = ''
})

;['dragenter', 'dragover'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault()
    dropzone.classList.add('dragging')
  })
})

;['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault()
    if (evt === 'dragleave' && dropzone.contains(e.relatedTarget)) return
    dropzone.classList.remove('dragging')
  })
})

dropzone.addEventListener('drop', (e) => {
  const dropped = e.dataTransfer.files
  if (dropped && dropped.length) addFiles(Array.from(dropped))
})

clearBtn.addEventListener('click', () => {
  files.forEach((f) => f.xhr && f.xhr.abort())
  files = []
  syncButtons()
  render()
})

uploadBtn.addEventListener('click', startUpload)

// Prevent browser from opening dropped files
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('drop', (e) => e.preventDefault())
