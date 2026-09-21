import NavBar from "@/components/NavBar";
import FloatingBubbles from "@/components/FloatingBubbles";

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-navy">
      <NavBar />
      <FloatingBubbles count={30} />
      <div className="flex min-h-[calc(100vh-92px)] items-center justify-center px-6">
        <div className="animate-pop-in rounded-blob bg-white px-14 py-16 text-center shadow-xl">
          <h1 className="font-potta text-6xl text-navy md:text-8xl">FLOOD WATCH!</h1>
        </div>
      </div>
    </div>
  );
}