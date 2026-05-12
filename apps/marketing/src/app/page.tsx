import { AmbientBackground } from "@/components/AmbientBackground";
import { Contact } from "@/components/Contact";
import { CursorGlow } from "@/components/CursorGlow";
import { FAQ } from "@/components/FAQ";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Pricing } from "@/components/Pricing";
import { ScrollProgress } from "@/components/ScrollProgress";

export default function HomePage() {
  return (
    <>
      <ScrollProgress />
      <AmbientBackground />
      <CursorGlow />
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
