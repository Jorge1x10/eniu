import { beforeEach, describe, expect, it } from "vitest";

import { forgetCatalogue, getLastCatalogue, rememberCatalogue } from "./lastCatalogue";

describe("lastCatalogue", () => {
  beforeEach(() => localStorage.clear());

  it("recuerda únicamente el ID más reciente por negocio", () => {
    rememberCatalogue("business-1", "catalogue-1");
    rememberCatalogue("business-2", "catalogue-2");
    rememberCatalogue("business-1", "catalogue-3");
    expect(getLastCatalogue("business-1")).toBe("catalogue-3");
    expect(getLastCatalogue("business-2")).toBe("catalogue-2");
    expect(localStorage.getItem("eniu_last_catalogue_by_business")).not.toMatch(/name|description/);
  });

  it("solo olvida el catálogo que realmente estaba seleccionado", () => {
    rememberCatalogue("business-1", "catalogue-1");
    forgetCatalogue("business-1", "another-catalogue");
    expect(getLastCatalogue("business-1")).toBe("catalogue-1");
    forgetCatalogue("business-1", "catalogue-1");
    expect(getLastCatalogue("business-1")).toBeNull();
  });
});
