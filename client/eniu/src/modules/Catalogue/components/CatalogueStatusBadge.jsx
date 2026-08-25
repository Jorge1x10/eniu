export default function CatalogueStatusBadge({ isPublished }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        isPublished
          ? "bg-green-100 text-green-700"
          : "bg-[#F1EEE5] text-[#666666]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          isPublished ? "bg-green-600" : "bg-[#888888]"
        }`}
      />
      {isPublished ? "Publicado" : "Borrador"}
    </span>
  );
}
