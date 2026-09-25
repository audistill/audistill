import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { PrintDocument } from './PrintDocument'
import { settlePrintDocument } from './print-readiness'
import './assets/print.css'

const unsubscribe = window.tabPrint.onDocument((printDocument) => {
  unsubscribe()
  document.title = `${printDocument.tabName} — ${printDocument.episodeTitle}`
  flushSync(() => {
    createRoot(document.getElementById('root')!).render(
      <PrintDocument
        tabName={printDocument.tabName}
        episodeTitle={printDocument.episodeTitle}
        content={printDocument.content}
      />
    )
  })

  void settlePrintDocument(document)
    .then(() => window.tabPrint.ready())
    .catch((error: unknown) => {
      window.tabPrint.failed(error instanceof Error ? error.message : 'Print rendering failed')
    })
})
