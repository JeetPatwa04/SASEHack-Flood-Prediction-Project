import NavBar from "@/components/NavBar";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-navy">
      <NavBar />
      <div
        className="absolute inset-0 -z-10 opacity-70"
        style={{ backgroundImage: "url(/images/bubbles.png)", backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="flex min-h-[calc(100vh-92px)] items-center justify-center px-6">
        <div className="animate-fade-up rounded-blob bg-white px-14 py-16 text-center shadow-xl">
          <h1 className="font-potta text-6xl text-navy md:text-8xl">FLOOD WATCH!</h1>
          <div className="mt-6 flex items-center justify-center gap-2 font-mono-flood text-sm text-navy/70" />
        </div>
      </div>
    </div>
  );
}