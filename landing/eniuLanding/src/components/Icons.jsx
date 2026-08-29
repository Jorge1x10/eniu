const paths = {
  instagram: [
    'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z',
    'M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Z',
    'M17.6 6.4h.01',
  ],
  facebook: ['M14.5 8.5h2.2V5.6h-2.6c-2.4 0-3.9 1.5-3.9 3.9v1.6H8v2.9h2.2V22h3.1v-8h2.4l.5-2.9h-2.9V9.7c0-.8.4-1.2 1.2-1.2Z'],
  tiktok: ['M14.4 2.2v12.2a3.1 3.1 0 1 1-2.6-3.1', 'M14.4 5.4a5.2 5.2 0 0 0 5.2 4.1'],
  whatsapp: ['M3.2 20.8l1.3-4.2a8.2 8.2 0 1 1 3.1 3l-4.4 1.2Z', 'M8.9 8.2c.5 1.5 1.2 2.6 2.3 3.6 1 .9 2 1.4 3.1 1.7'],
}

export function SocialIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(paths[name] || []).map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
