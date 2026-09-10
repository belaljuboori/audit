import { Hero } from "@/components/marketing/hero";
import { CategoryGrid } from "@/components/marketing/category-grid";
import { FeaturedCourses } from "@/components/marketing/featured-courses";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { CtaSection } from "@/components/marketing/cta-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryGrid />
      <FeaturedCourses />
      <HowItWorks />
      <CtaSection />
    </>
  );
}
