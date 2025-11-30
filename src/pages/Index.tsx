import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { NavLink } from "@/components/NavLink";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <InfoCard title="">
          <p className="text-foreground mb-0">
            You are not logged in.
          </p>
        </InfoCard>

        <InfoCard title="Info">
          <p className="text-foreground mb-4">
            You do not have permission to view these forums.
          </p>
          <NavLink 
            to="/" 
            className="text-link hover:text-link-hover transition-colors underline"
          >
            Go back
          </NavLink>
        </InfoCard>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
