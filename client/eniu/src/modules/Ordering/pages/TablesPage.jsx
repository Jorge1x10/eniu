import { useCallback, useEffect, useMemo, useState } from "react";
import { Armchair, Download, Pencil, Plus, Printer, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { useBusiness } from "../../Business/services/useBusiness";
import { useCatalogueService } from "../../Catalogue/services/catalogueService";
import ConfirmDialog from "../components/ConfirmDialog";
import TableFormModal from "../components/TableFormModal";
import TableQr from "../components/TableQr";
import { orderingErrorMessage, useOrderingService } from "../services/orderingService";
import { tableLabel } from "../utils/labels";
import { downloadTableQr, printTableQrs } from "../utils/printTables";

export default function TablesPage() {
  const { t } = useTranslation();
  const { selectedBusiness, isLoadingBusinesses } = useBusiness();

  if (isLoadingBusinesses) {
    return <p className="rounded-2xl bg-white p-6 text-[#666666] shadow-sm">{t("Cargando negocio...")}</p>;
  }
  if (!selectedBusiness) {
    return <p className="rounded-2xl bg-white p-6 text-[#666666] shadow-sm">{t("Crea un negocio para administrar sus mesas.")}</p>;
  }
  return <TablesManager key={selectedBusiness.id} business={selectedBusiness} />;
}

function TablesManager({ business }) {
  const { t } = useTranslation();
  const { listTables, createTable, updateTable, deleteTable, regenerateQr } = useOrderingService(business.id);
  const { list: listCatalogues } = useCatalogueService(business.id);
  const [tables, setTables] = useState([]);
  const [catalogues, setCatalogues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const load = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError("");
    const [tableResponse, catalogueResponse] = await Promise.all([
      listTables({ signal }),
      listCatalogues({ signal }),
    ]);
    if (tableResponse.aborted || catalogueResponse.aborted) return;
    if (!tableResponse.ok) {
      setLoadError(orderingErrorMessage(tableResponse, t("No pudimos cargar las mesas. Intenta nuevamente.")));
      setIsLoading(false);
      return;
    }
    setTables(tableResponse.data?.tables || []);
    if (catalogueResponse.ok) setCatalogues(catalogueResponse.data?.catalogues || []);
    setIsLoading(false);
  }, [listCatalogues, listTables, t]);

  useEffect(() => {
    const controller = new AbortController();
    const taskId = window.setTimeout(() => load(controller.signal), 0);
    return () => { window.clearTimeout(taskId); controller.abort(); };
  }, [load]);

  const catalogueNames = useMemo(
    () => Object.fromEntries(catalogues.map((catalogue) => [catalogue.id, catalogue.name])),
    [catalogues]
  );
  const printable = tables.filter((table) => table.is_active && table.qr_url);
  const suggestedNumber = tables.length ? Math.max(...tables.map((table) => table.number)) + 1 : 1;

  function saved({ created, skipped, keepOpen }) {
    if (!keepOpen) {
      setIsCreating(false);
      setEditing(null);
    }
    if (editing && !created) {
      setNotice(t("La mesa se actualizó."));
    } else if (skipped.length) {
      setNotice(t("Se crearon {{count}} mesas. Ya existían: {{numbers}}.", { count: created, numbers: skipped.join(", ") }));
    } else {
      setNotice(created === 1 ? t("La mesa se creó.") : t("Se crearon {{count}} mesas.", { count: created }));
    }
    load();
  }

  async function download(table) {
    setActionError("");
    try {
      await downloadTableQr(table);
    } catch {
      setActionError(t("No pudimos generar el QR. Intenta nuevamente."));
    }
  }

  async function printAll() {
    setActionError("");
    setIsPrinting(true);
    try {
      const opened = await printTableQrs(printable, business.name);
      if (!opened) setActionError(t("El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes de Eniu e intenta de nuevo."));
    } catch {
      setActionError(t("No pudimos generar el QR. Intenta nuevamente."));
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#8A7420]">{business.name}</p>
          <h1 className="mt-1 text-3xl font-bold text-[#111111]">{t("Mesas")}</h1>
          <p className="mt-1 text-sm text-[#666666]">{t("Cada mesa tiene su propio QR. El primer pedido de una mesa abre su cuenta.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={printAll} disabled={!printable.length || isPrinting} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#E9DDB7] bg-white px-4 font-semibold hover:bg-[#FFF8DE] disabled:cursor-not-allowed disabled:opacity-50">
            <Printer size={17} aria-hidden="true" /> {t("Imprimir QR")}
          </button>
          <button type="button" onClick={() => setIsCreating(true)} disabled={isLoading || !catalogues.length} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50">
            <Plus size={18} aria-hidden="true" /> {t("Agregar mesas")}
          </button>
        </div>
      </header>

      {notice && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}
      {actionError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}

      {isLoading ? (
        <div aria-label={t("Cargando mesas")} className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-72 rounded-2xl border border-[#E9DDB7] bg-white" />)}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center">
          <p role="alert" className="font-semibold">{loadError}</p>
          <button type="button" onClick={() => load()} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 py-2.5 font-semibold text-white"><RefreshCw size={17} /> {t("Reintentar")}</button>
        </div>
      ) : !catalogues.length ? (
        <EmptyTables
          title={t("Primero crea un menú")}
          description={t("El QR de cada mesa abre uno de tus menús.")}
          action={<Link to={`/dashboard/businesses/${business.id}/catalogues`} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D]">{t("Ir a mis menús")}</Link>}
        />
      ) : !tables.length ? (
        <EmptyTables
          title={t("Todavía no tienes mesas")}
          description={t("Agrega tus mesas para imprimir su QR. Puedes crear varias a la vez.")}
          action={<button type="button" onClick={() => setIsCreating(true)} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D]"><Plus size={18} aria-hidden="true" /> {t("Agregar mesas")}</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tables.map((table) => (
            <article key={table.id} className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm ${table.is_active ? "border-[#E9DDB7]" : "border-dashed border-[#D9D9D9] opacity-80"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-[#111111]">{tableLabel(table)}</h2>
                  <p className="truncate text-xs text-[#666666]">{catalogueNames[table.catalogue_id] || ""}</p>
                </div>
                {!table.is_active && <span className="shrink-0 rounded-full bg-[#EFEFEF] px-2.5 py-1 text-xs font-semibold text-[#666666]">{t("Inactiva")}</span>}
              </div>

              <div className="mt-4 flex flex-1 items-center justify-center">
                {table.qr_url ? (
                  <TableQr url={table.qr_url} label={t("QR de {{table}}", { table: tableLabel(table) })} />
                ) : (
                  <p className="rounded-xl bg-[#FFF8DE] px-3 py-4 text-center text-sm text-[#5E501A]">{t("Publica su menú para que el QR funcione.")}</p>
                )}
              </div>

              {/* La descarga va sola a todo el ancho: con cuatro columnas no
                  cabía en la misma fila que los otros tres botones. */}
              <div className="mt-4 space-y-2 border-t border-[#EFE8D1] pt-4">
                <button type="button" onClick={() => download(table)} disabled={!table.qr_url} className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#2A2A2A] px-3 text-sm font-semibold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50">
                  <Download size={15} aria-hidden="true" /> {t("Descargar QR")}
                </button>
                <div className="flex justify-end gap-2">
                  <IconButton label={t("Editar {{table}}", { table: tableLabel(table) })} onClick={() => setEditing(table)}><Pencil size={16} aria-hidden="true" /></IconButton>
                  <IconButton label={t("Cambiar el QR de {{table}}", { table: tableLabel(table) })} onClick={() => setConfirming({ kind: "regenerate", table })}><RotateCcw size={16} aria-hidden="true" /></IconButton>
                  <IconButton label={t("Eliminar {{table}}", { table: tableLabel(table) })} danger onClick={() => setConfirming({ kind: "delete", table })}><Trash2 size={16} aria-hidden="true" /></IconButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {(isCreating || editing) && (
        <TableFormModal
          table={editing}
          catalogues={catalogues}
          suggestedNumber={suggestedNumber}
          onCreate={createTable}
          onUpdate={updateTable}
          onClose={() => { setIsCreating(false); setEditing(null); }}
          onSaved={saved}
        />
      )}
      {confirming?.kind === "regenerate" && (
        <ConfirmDialog
          tone="neutral"
          title={t("¿Cambiar el QR de {{table}}?", { table: tableLabel(confirming.table) })}
          description={t("El QR impreso dejará de funcionar y tendrás que imprimir el nuevo. Úsalo si el QR de esta mesa se compartió fuera del local.")}
          confirmLabel={t("Cambiar QR")}
          onConfirm={() => regenerateQr(confirming.table.id)}
          errorMessage={(response) => orderingErrorMessage(response, t("No pudimos cambiar el QR."))}
          onDone={() => { setConfirming(null); setNotice(t("El QR de la mesa cambió. Imprime el nuevo.")); load(); }}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming?.kind === "delete" && (
        <ConfirmDialog
          title={t("¿Eliminar {{table}}?", { table: tableLabel(confirming.table) })}
          description={t("Su QR dejará de funcionar. Esta acción no se puede deshacer.")}
          confirmLabel={t("Eliminar mesa")}
          onConfirm={() => deleteTable(confirming.table.id)}
          errorMessage={(response) => orderingErrorMessage(response, t("No pudimos eliminar la mesa."))}
          onDone={() => { setConfirming(null); setNotice(t("La mesa se eliminó.")); load(); }}
          onClose={() => setConfirming(null)}
        />
      )}
    </section>
  );
}

function IconButton({ label, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border ${danger ? "border-red-200 text-red-700 hover:bg-red-50" : "border-[#E9DDB7] text-[#444444] hover:bg-[#FFF8DE]"}`}
    >
      {children}
    </button>
  );
}

function EmptyTables({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D7C990] bg-[#FFFDF5] px-6 py-14 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE05A]"><Armchair size={26} aria-hidden="true" /></span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-[#666666]">{description}</p>
      {action}
    </div>
  );
}
