import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicMenu } from "./publicMenuService";

describe("getPublicMenu", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("consulta exclusivamente el endpoint público sin JWT", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"menu":{}}'),
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await getPublicMenu("menú público");
    expect(response.ok).toBe(true);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/public\/menus\/men%C3%BA%20p%C3%BAblico$/);
    expect(options.headers).toEqual({ Accept: "application/json" });
    expect(JSON.stringify(options)).not.toMatch(/authorization|bearer|jwt/i);
  });
});
