import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/forum");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

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
            to="/register" 
            className="text-link hover:text-link-hover transition-colors underline mr-4"
          >
            Register
          </NavLink>
          <NavLink 
            to="/login" 
            className="text-link hover:text-link-hover transition-colors underline"
          >
            Login
          </NavLink>
        </InfoCard>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
