import RegisterForm from "../components/RegisterForm";
import darkLogo from "../../../assets/Images/eniu-DarkBannerNoBack.svg"

export default function RegisterPage() {
  return (
    <main className="flex h-screen bg-[#FFFDF5]">
      <section className="hidden w-1/2 bg-[#111111] text-[#FFFDF5] lg:flex lg:flex-col lg:justify-between lg:w-full">
        <div>
          <img src={darkLogo} className="h-40" />
        </div>

        <div className="flex-col hidden lg:flex">
          <h2 className="max-w-lg text-4xl font-bold leading-tight pl-5">
            Tu menú digital, siempre actualizado.
          </h2>

          <p className="mt-4 max-w-md text-[#D9D9D9] pl-5">
            Crea productos, organiza categorías y comparte tu
            menú mediante una URL o código QR.
          </p>
        </div>

        <p className="text-sm text-[#D9D9D9]">
          ENIU
        </p>
      </section>

      <section className="flex w-full items-center justify-center px-6 lg:w-1/2 lg:fixed lg:right-0 h-full bg-amber-50 rounded-bl-3xl rounded-tl-3xl ">
        <RegisterForm />
      </section>
    </main>
  );
}