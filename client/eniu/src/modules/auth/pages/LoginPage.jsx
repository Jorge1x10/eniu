import LoginForm from "../components/LoginForm";
import darkLogo from "../../../assets/Images/eniu-DarkBannerNoBack.svg"


export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-[#FFFDF5]">
      <section className="hidden w-1/2 bg-[#111111] text-[#FFFDF5] lg:flex lg:flex-col lg:justify-between lg:w-full">
        <div>
          <img src={darkLogo} className="h-40" />
        </div>
        <div className="px-5">
          <h2 className="max-w-lg text-4xl font-bold leading-tight">
            Administra tu menú desde un solo lugar.
          </h2>

          <p className="mt-4 max-w-md text-[#D9D9D9]">
            Actualiza tus productos, organiza categorías
            y comparte tu menú mediante una URL o código QR.
          </p>
        </div>

        <p className="text-sm text-[#D9D9D9]">
          ENIU
        </p>
      </section>

      <section className="flex py-12 lg:w-1/2flex w-full items-center justify-center px-6 lg:w-1/2 lg:fixed lg:right-0 h-full bg-amber-50 rounded-bl-3xl rounded-tl-3xl ">
        <LoginForm />
      </section>
    </main>
  );
}