import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NavLink } from "@/components/NavLink";

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-md">
        <InfoCard title="Login">
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Username or Email</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="Enter username or email"
                className="bg-secondary border-border text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Enter password"
                className="bg-secondary border-border text-foreground"
              />
            </div>
            
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Login
            </Button>
            
            <p className="text-center text-muted-foreground text-sm">
              Don't have an account?{" "}
              <NavLink to="/register" className="text-link hover:text-link-hover transition-colors">
                Register
              </NavLink>
            </p>
          </form>
        </InfoCard>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;
