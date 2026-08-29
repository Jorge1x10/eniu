import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El contrato que estas pruebas fijan es el del backend: rechaza la imagen si
 * la extensión del nombre, el mimetype y los bytes de cabecera no coinciden
 * entre sí, o si pasa de 5 MB. Como aquí el archivo se reconstruye desde cero,
 * lo que hay que garantizar es que las tres cosas se generen juntas.
 */

const MEGABYTE = 1024 * 1024;

function blobOf(bytes, type) {
  return new Blob([new Uint8Array(bytes)], { type });
}

/** Tamaño en bytes que devolverá `toBlob`, por formato. */
let encodedSizes;
let canWriteWebp;
let lastCanvas;

function stubCanvas() {
  lastCanvas = null;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function getContext() {
    lastCanvas = this;
    return { drawImage: vi.fn() };
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(
    () => (canWriteWebp ? "data:image/webp;base64,AA" : "data:image/png;base64,AA")
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
    callback(blobOf(encodedSizes[type] ?? 1024, type));
  });
}

/** Se reimporta en cada prueba porque el módulo cachea si el navegador escribe WebP. */
async function loadModule() {
  vi.resetModules();
  return import("./imageFile.js");
}

function sourceFile({ width = 4000, height = 3000, type = "image/jpeg" } = {}) {
  globalThis.createImageBitmap = vi.fn(async () => ({ width, height, close: vi.fn() }));
  return new File([new Uint8Array(10)], "IMG_0431.JPG", { type });
}

beforeEach(() => {
  encodedSizes = {};
  canWriteWebp = true;
  stubCanvas();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.createImageBitmap;
});

describe("prepareImage", () => {
  it("entrega WebP con el nombre y el mimetype que el backend espera", async () => {
    const { prepareImage } = await loadModule();
    encodedSizes["image/webp"] = 180 * 1024;

    const prepared = await prepareImage(sourceFile());

    expect(prepared.type).toBe("image/webp");
    expect(prepared.name).toMatch(/^eniu-\d+-\d+\.webp$/);
    expect(prepared.size).toBe(180 * 1024);
  });

  it("reescala al lado mayor del perfil y conserva la proporción", async () => {
    const { prepareImage } = await loadModule();

    await prepareImage(sourceFile({ width: 4000, height: 3000 }), "ligera");

    // Perfil "ligera": 1080 px de lado mayor. 4000x3000 -> 1080x810.
    expect(lastCanvas.width).toBe(1080);
    expect(lastCanvas.height).toBe(810);
  });

  it("no amplía una imagen más chica que el perfil", async () => {
    const { prepareImage } = await loadModule();

    await prepareImage(sourceFile({ width: 600, height: 400 }), "alta");

    expect(lastCanvas.width).toBe(600);
    expect(lastCanvas.height).toBe(400);
  });

  it("cae a JPEG cuando el WebP no baja de los 5 MB", async () => {
    const { prepareImage } = await loadModule();
    encodedSizes["image/webp"] = 6 * MEGABYTE;
    encodedSizes["image/jpeg"] = 2 * MEGABYTE;

    const prepared = await prepareImage(sourceFile());

    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toMatch(/\.jpg$/);
  });

  it("usa JPEG directamente si el navegador no sabe escribir WebP", async () => {
    canWriteWebp = false;
    const { prepareImage } = await loadModule();

    const prepared = await prepareImage(sourceFile());

    expect(prepared.type).toBe("image/jpeg");
  });

  it("explica qué hacer cuando ni en JPEG entra en el límite", async () => {
    const { prepareImage } = await loadModule();
    encodedSizes["image/webp"] = 9 * MEGABYTE;
    encodedSizes["image/jpeg"] = 7 * MEGABYTE;

    await expect(prepareImage(sourceFile())).rejects.toThrow(/calidad menor/);
  });

  it("respeta la orientación EXIF al leer la foto", async () => {
    const { prepareImage } = await loadModule();
    const file = sourceFile();

    await prepareImage(file);

    // Sin esto, una foto tomada en vertical se sube acostada: el navegador la
    // endereza al mostrarla, pero el canvas dibuja los píxeles crudos.
    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: "from-image" });
  });
});

describe("prepareImages", () => {
  it("descarta formatos que el backend no acepta antes de procesarlos", async () => {
    const { prepareImages } = await loadModule();
    globalThis.createImageBitmap = vi.fn();
    const heic = new File([new Uint8Array(10)], "IMG_0431.HEIC", { type: "image/heic" });

    await expect(prepareImages([heic])).rejects.toThrow(/JPG, PNG o WebP/);
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
  });

  it("procesa el lote completo con la misma calidad", async () => {
    const { prepareImages } = await loadModule();
    const files = [sourceFile(), sourceFile(), sourceFile()];

    const prepared = await prepareImages(files, "media");

    expect(prepared).toHaveLength(3);
    // Perfil "media": 1600 px de lado mayor sobre 4000x3000.
    expect(lastCanvas.width).toBe(1600);
  });
});
