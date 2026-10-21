import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Manifesto from "@/components/Manifesto";
import PirateCode from "@/components/PirateCode";
import Timeline from "@/components/Timeline";
import Process from "@/components/Process";
import ApplyForm from "@/components/ApplyForm";
import Footer from "@/components/Footer";
import SeaDivider from "@/components/SeaDivider";

export default function Home() {
  return (
    <div className="bg-ink min-h-screen">
      <Nav />
      <main id="main-content">
        <Hero />
        <Marquee />
        <Manifesto />
        <SeaDivider glyph="skull" testid="divider-code" />
        <PirateCode />
        <SeaDivider glyph="wheel" testid="divider-recit" />
        <Timeline />
        <SeaDivider glyph="anchor" testid="divider-process" />
        <Process />
        <SeaDivider glyph="skull" testid="divider-apply" />
        <ApplyForm />
      </main>
      <Footer />
    </div>
  );
}
