import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";

import api from "./api";

/**
 * Lo que fija esta prueba: con el access token vencido y el refresh vigente,
 * la comprobación de sesión al abrir el panel (`GET /auth/me`, por axios) se
 * renueva sola en vez de cerrar la sesión.
 */

let seenTokens;
let originalAdapter;

function respond(config, status, data) {
  const response = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) {
    throw new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, response);
  }
  return response;
}

/** Simula la API: sólo acepta el token "fresh". */
function fakeApi(config) {
  const token = config.headers.Authorization;
  seenTokens.push(token);
  if (config.url === "/auth/login") return respond(config, 401, { message: "Credenciales incorrectas" });
  if (token !== "Bearer fresh") return respond(config, 401, { message: "Token expirado" });
  return respond(config, 200, { user: { id: "u1" } });
}

function mockRefresh({ ok = true, token = "fresh" } = {}) {
  const fetchMock = vi.fn(async () => ({
    ok,
    json: async () => (ok ? { access_token: token } : { message: "no" }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  seenTokens = [];
  localStorage.clear();
  localStorage.setItem("access_token", "expired");
  localStorage.setItem("refresh_token", "refresh-ok");
  originalAdapter = api.defaults.adapter;
  api.defaults.adapter = async (config) => fakeApi(config);
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  vi.unstubAllGlobals();
});

describe("api (axios)", () => {
  it("renueva el access token vencido y repite la petición", async () => {
    const fetchMock = mockRefresh();

    const response = await api.get("/auth/me");

    expect(response.data.user.id).toBe("u1");
    expect(seenTokens).toEqual(["Bearer expired", "Bearer fresh"]);
    expect(localStorage.getItem("access_token")).toBe("fresh");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.eniu.test/api/auth/refresh",
      expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer refresh-ok" } })
    );
  });

  it("varias peticiones con 401 a la vez comparten una sola renovación", async () => {
    const fetchMock = mockRefresh();

    await Promise.all([api.get("/auth/me"), api.get("/auth/me"), api.get("/auth/me")]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("devuelve el 401 si el refresh también venció", async () => {
    mockRefresh({ ok: false });

    await expect(api.get("/auth/me")).rejects.toMatchObject({ response: { status: 401 } });
    expect(seenTokens).toEqual(["Bearer expired"]);
  });

  it("no intenta renovar cuando el 401 es de credenciales incorrectas", async () => {
    const fetchMock = mockRefresh();

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ response: { status: 401 } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no repite la petición más de una vez", async () => {
    // El refresh entrega un token que la API tampoco acepta.
    mockRefresh({ token: "still-bad" });

    await expect(api.get("/auth/me")).rejects.toMatchObject({ response: { status: 401 } });
    expect(seenTokens).toEqual(["Bearer expired", "Bearer still-bad"]);
  });
});
