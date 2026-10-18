import { skip } from "../ui.js";
import Nav from "../components/Nav.jsx";
import Hero from "../components/Hero.jsx";
import HowItWorks from "../components/HowItWorks.jsx";
import Preview from "../components/Preview.jsx";
import Story from "../components/Story.jsx";
import Footer from "../components/Footer.jsx";

export default function Landing() {
  return (
    <>
      <a className={skip} href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <HowItWorks />
        <Preview />
        <Story />
      </main>
      <Footer />
    </>
  );
}
