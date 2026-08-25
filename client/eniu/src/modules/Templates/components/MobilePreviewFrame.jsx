export default function MobilePreviewFrame({ children }) {
  return <div className="mx-auto w-full max-w-[390px] rounded-[2.5rem] border-[8px] border-[#111111] bg-[#111111] p-1 shadow-2xl"><div className="mx-auto mb-2 h-5 w-24 rounded-b-xl bg-[#111111]" /><div aria-label="Vista previa móvil del menú" className="h-[min(720px,75vh)] overflow-y-auto overflow-x-hidden rounded-[1.8rem] bg-white">{children}</div></div>;
}
