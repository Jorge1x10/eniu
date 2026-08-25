import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";

const mocks = vi.hoisted(() => ({ handler: vi.fn(), navigate: vi.fn(), logout: vi.fn(), loading: false }));
vi.mock("../../auth/services/useApi", () => ({ useApi: () => ({ post: mocks.handler, loading: mocks.loading }) }));
vi.mock("../../auth/hooks/useAuth", () => ({ useAuth: () => ({ logout: mocks.logout }) }));
vi.mock("react-router", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => mocks.navigate }));

describe("recuperación de contraseña", () => {
  beforeEach(() => { mocks.handler.mockReset(); mocks.navigate.mockReset(); mocks.logout.mockReset(); mocks.loading = false; localStorage.clear(); window.history.replaceState({}, "", "/"); });

  it("valida el correo y muestra la respuesta genérica", async () => {
    const interaction = userEvent.setup(); mocks.handler.mockResolvedValue({ ok: true, data: { message: "Si existe una cuenta asociada, recibirás instrucciones para restablecer tu contraseña." } });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    await interaction.click(screen.getByRole("button", { name: "Enviar instrucciones" })); expect(screen.getByRole("alert")).toHaveTextContent("correo electrónico válido");
    await interaction.type(screen.getByLabelText("Correo electrónico"), "USER@EXAMPLE.COM"); await interaction.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Si existe una cuenta asociada");
    expect(mocks.handler).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("muestra token ausente como inválido", () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
    expect(screen.getByText(/no es válido o ya no está disponible/)).toBeInTheDocument();
  });

  it("mantiene el token solo en memoria, limpia la URL y navega al login al guardar", async () => {
    window.history.replaceState({}, "", "/reset-password?token=secret-reset-token");
    mocks.handler.mockResolvedValue({ ok: true, data: { message: "ok" } });
    const interaction = userEvent.setup(); render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(localStorage.getItem("reset_token")).toBeNull(); expect(localStorage.getItem("access_token")).toBeNull();
    await interaction.type(screen.getByLabelText("Nueva contraseña"), "RecoveredPass1"); await interaction.type(screen.getByLabelText("Confirmar contraseña"), "RecoveredPass1");
    await interaction.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));
    expect(mocks.handler).toHaveBeenCalledWith({ token: "secret-reset-token", new_password: "RecoveredPass1" });
    expect(mocks.navigate).toHaveBeenCalledWith("/login", { replace: true, state: { passwordReset: true } });
  });

  it("conserva el formulario y muestra tokens vencidos o usados", async () => {
    window.history.replaceState({}, "", "/reset-password?token=expired-token");
    mocks.handler.mockResolvedValue({ ok: false, status: 400, data: { message: "El enlace de recuperación venció" } });
    const interaction = userEvent.setup(); render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
    await interaction.type(screen.getByLabelText("Nueva contraseña"), "RecoveredPass1"); await interaction.type(screen.getByLabelText("Confirmar contraseña"), "RecoveredPass1"); await interaction.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("venció");
    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
  });
});
