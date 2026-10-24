import { unzipSync, strFromU8 } from 'fflate'

export const MAX_RESUME_BYTES = 10 * 1024 * 1024
export const MAX_RESUME_PAGES = 30
const MAX_TEXT = 100_000
const MAX_XML = 2 * 1024 * 1024

export function validateResumeFile(file: Pick<File, 'name' | 'size'>): 'pdf' | 'docx' {
  if (!file.size) throw new Error('This file is empty. Choose a PDF or DOCX résumé.')
  if (file.size > MAX_RESUME_BYTES) throw new Error('Choose a résumé smaller than 10 MB.')
  const extension = file.name.split('.').at(-1)?.toLowerCase()
  if (extension !== 'pdf' && extension !== 'docx') throw new Error('Choose a PDF or DOCX file. Older .doc files need to be saved as DOCX first.')
  return extension
}

export function docxDocumentXml(bytes: Uint8Array): string {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('This file is not a readable DOCX document.')
  let size = 0
  const files = unzipSync(bytes, { filter: (entry) => {
    if (entry.name !== 'word/document.xml') return false
    size = entry.originalSize
    if (size > MAX_XML) throw new Error('This document is too large to read safely. Export a shorter résumé.')
    return true
  } })
  const document = files['word/document.xml']
  if (!document || !size || document.length > MAX_XML) throw new Error('This file does not contain readable DOCX text. Export a new copy and try again.')
  const xml = strFromU8(document)
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('This document has unsupported XML content. Export a new copy and try again.')
  return xml
}

export function readableResumeText(text: string) {
  const clean = text.replace(/\u0000/g, '').trim()
  if (clean.length > MAX_TEXT) throw new Error('This document contains too much text. Choose a shorter résumé.')
  if (clean.replace(/\s/g, '').length < 40) throw new Error('There isn’t enough readable text in this file. Image-only scans need OCR first; export a text-based PDF or DOCX, or continue with manual setup.')
  return clean
}

export async function readResumeFile(file: File, signal: AbortSignal): Promise<string> {
  const kind = validateResumeFile(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  signal.throwIfAborted()
  if (kind === 'docx') {
    const document = new DOMParser().parseFromString(docxDocumentXml(bytes), 'application/xml')
    if (document.getElementsByTagName('parsererror').length) throw new Error('This DOCX could not be read. Export a new copy and try again.')
    const paragraphs = Array.from(document.getElementsByTagNameNS('*', 'p'))
    const text = paragraphs.map((paragraph) => Array.from(paragraph.getElementsByTagNameNS('*', 't')).map((node) => node.textContent ?? '').join('')).join('\n')
    signal.throwIfAborted()
    return readableResumeText(text)
  }
  const header = new TextDecoder().decode(bytes.subarray(0, 1024))
  if (!header.includes('%PDF-')) throw new Error('This file is not a readable PDF document.')
  const pdfjs = await import('pdfjs-dist')
  signal.throwIfAborted()
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const loading = pdfjs.getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, stopAtErrors: true })
  const abort = () => { void loading.destroy() }
  signal.addEventListener('abort', abort, { once: true })
  try {
    const document = await loading.promise
    if (document.numPages > MAX_RESUME_PAGES) throw new Error('Choose a résumé with 30 pages or fewer.')
    let text = ''
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      signal.throwIfAborted()
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      let lastY: number | null = null
      for (const item of content.items) {
        if (!('str' in item)) continue
        const y = item.transform[5]
        if (lastY !== null && Math.abs(y - lastY) > 2) text += '\n'
        text += item.str + (item.hasEOL ? '\n' : ' ')
        lastY = y
        if (text.length > MAX_TEXT) throw new Error('This document contains too much text. Choose a shorter résumé.')
      }
      text += '\n'
      page.cleanup()
    }
    return readableResumeText(text)
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('This PDF is password protected. Export an unprotected copy and try again.')
    throw error
  } finally {
    signal.removeEventListener('abort', abort)
    await loading.destroy()
  }
}
