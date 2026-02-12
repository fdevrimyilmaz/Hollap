import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedCreators } from "@/components/home/FeaturedCreators";
import { PopularCourses } from "@/components/home/PopularCourses";
import { Categories } from "@/components/home/Categories";
import { CTASection } from "@/components/home/CTASection";

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <Header />
      <HeroSection />
      <FeaturedCreators />
      <PopularCourses />
      <Categories />
      <CTASection />
      <Footer />
    </main>
  );
}
