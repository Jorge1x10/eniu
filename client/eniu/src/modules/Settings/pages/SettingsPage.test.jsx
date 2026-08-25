import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "./SettingsPage";

const mocks = vi.hoisted(() => ({
  auth: {}, business: {}, handlers: {}, navigate: vi.fn(),
}));

vi.mock("../../auth/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("../../Business/services/useBusiness", () => ({ useBusiness: () => mocks.business }));
vi.mock("../../auth/services/useApi", () => ({
  useApi: (route) => ({
    loading: false,
    patch: (data) => mocks.handlers[route]?.(data),
    post: (data) => mocks.handlers[route]?.(data),
  }),
}));
vi.mock("react-router", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => mocks.navigate }));

const userData = { id: "user-1", name: "Jorge", username: "jorge", phone_number: "3312345678", email: "jorge@example.com", profile_picture: null, auth_methods: { password: true, google: false } };
const businessData = { id: "business-1", name: "Café ENIU", description: "Café local", phone: "", whatsapp: "", address: "Centro", currency: "MXN", timezone: "America/Mexico_City" };

function renderPage() { return render(<MemoryRouter><SettingsPage /></MemoryRouter>); }

describe("SettingsPage", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.auth = { user: userData, setUser: vi.fn(), logout: vi.fn() };
    mocks.business = { selectedBusiness: businessData, updateBusiness: vi.fn(), isLoadingBusinesses: false };
    mocks.handlers = {};
    localStorage.clear();
    document.documentElement.dataset.theme = "light";
  });

  it("activa y conserva el modo oscuro desde el slider", async () => {
    const interaction = userEvent.setup();
    renderPage();
    const themeSwitch = screen.getByRole("switch", { name: "Modo oscuro" });
    expect(themeSwitch).toHaveAttribute("aria-checked", "false");

    await interaction.click(themeSwitch);

    expect(themeSwitch).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("eniu_theme")).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("renderiza Perfil, Negocio y Seguridad con los datos iniciales", async () => {
    const interaction = userEvent.setup(); renderPage();
    expect(screen.getByRole("tab", { name: "Perfil" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("jorge@example.com");
    await interaction.click(screen.getByRole("tab", { name: "Negocio" }));
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue("Café ENIU");
    await interaction.click(screen.getByRole("tab", { name: "Seguridad" }));
    expect(screen.getByText(/Métodos activos: contraseña/)).toBeInTheDocument();
  });

  it("guarda el perfil y muestra conflicto de nombre de usuario", async () => {
    const interaction = userEvent.setup();
    mocks.handlers["users/me"] = vi.fn().mockResolvedValueOnce({ ok: false, status: 409, data: {} }).mockResolvedValueOnce({ ok: true, data: { user: { ...userData, username: "nuevo.usuario" } } });
    renderPage();
    await interaction.clear(screen.getByLabelText("Nombre de usuario")); await interaction.type(screen.getByLabelText("Nombre de usuario"), "nuevo.usuario");
    await interaction.click(screen.getByRole("button", { name: "Guardar perfil" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ya está en uso");
    await interaction.click(screen.getByRole("button", { name: "Guardar perfil" }));
    expect(await screen.findByRole("status")).toHaveTextContent("actualizó correctamente");
    expect(mocks.auth.setUser).toHaveBeenCalled();
  });

  it("actualiza solo el negocio seleccionado", async () => {
    const interaction = userEvent.setup();
    mocks.handlers["businesses/business-1"] = vi.fn().mockResolvedValue({ ok: true, data: { business: { ...businessData, phone: "3399999999" } } });
    renderPage(); await interaction.click(screen.getByRole("tab", { name: "Negocio" }));
    await interaction.type(screen.getByLabelText("Teléfono"), "3399999999");
    await interaction.click(screen.getByRole("button", { name: "Guardar negocio" }));
    expect(mocks.handlers["businesses/business-1"]).toHaveBeenCalledWith(expect.objectContaining({ name: "Café ENIU", phone: "3399999999" }));
    expect(mocks.business.updateBusiness).toHaveBeenCalled();
  });

  it("valida, cambia la contraseña y reemplaza la sesión", async () => {
    const interaction = userEvent.setup();
    mocks.handlers["auth/password"] = vi.fn().mockResolvedValue({ ok: true, data: { access_token: "new-access", refresh_token: "new-refresh" } });
    renderPage(); await interaction.click(screen.getByRole("tab", { name: "Seguridad" }));
    await interaction.type(screen.getByLabelText("Contraseña actual"), "CurrentPass1");
    await interaction.type(screen.getByLabelText("Nueva contraseña"), "short");
    await interaction.type(screen.getByLabelText("Confirmar contraseña"), "short");
    await interaction.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(screen.getByRole("alert")).toHaveTextContent("8 y 128");
    await interaction.clear(screen.getByLabelText("Nueva contraseña")); await interaction.type(screen.getByLabelText("Nueva contraseña"), "NewPassword1");
    await interaction.clear(screen.getByLabelText("Confirmar contraseña")); await interaction.type(screen.getByLabelText("Confirmar contraseña"), "NewPassword1");
    await interaction.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(await screen.findByRole("status")).toHaveTextContent("sesiones anteriores");
    expect(localStorage.getItem("access_token")).toBe("new-access");
  });

  it("muestra un estado claro cuando no hay negocio", async () => {
    mocks.business = { selectedBusiness: null, updateBusiness: vi.fn(), isLoadingBusinesses: false };
    const interaction = userEvent.setup(); renderPage(); await interaction.click(screen.getByRole("tab", { name: "Negocio" }));
    expect(screen.getByText(/Selecciona o crea un negocio/)).toBeInTheDocument();
  });
});
