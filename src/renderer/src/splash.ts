import type { UpdateStatus } from './api'

const statusEl = document.getElementById('status')!
const trackEl = document.getElementById('track')!
const fillEl = document.getElementById('fill') as HTMLElement
const detailEl = document.getElementById('detail')!

window.api.onUpdateStatus((s: UpdateStatus) => {
  statusEl.textContent = s.message
  detailEl.textContent = s.detail ?? ''
  if (typeof s.percent === 'number') {
    trackEl.classList.remove('indeterminate')
    fillEl.style.width = `${Math.max(0, Math.min(100, s.percent))}%`
  } else {
    trackEl.classList.add('indeterminate')
  }
})
