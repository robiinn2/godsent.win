import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const UnbanAppeal = () => {
  const [searchParams] = useSearchParams();
  const prefillUsername = searchParams.get('username') || '';
  
  const [username, setUsername] = useState(prefillUsername);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !reason.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Get user ID from username
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle();

      if (!profile) {
        toast({
          title: "Error",
          description: "Username not found",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Check if user is actually banned
      const { data: banData } = await supabase
        .from('banned_users')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!banData) {
        toast({
          title: "Error",
          description: "This account is not banned",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Create support ticket for unban appeal
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: profile.id,
          subject: 'Unban Appeal',
          message: `Username: ${username}\n\nReason for unban:\n${reason}`,
          status: 'open',
        });

      if (ticketError) {
        throw ticketError;
      }

      // Mark appeal as submitted in banned_users
      await supabase
        .from('banned_users')
        .update({ appeal_submitted: true })
        .eq('user_id', profile.id);

      setSubmitted(true);
      toast({
        title: "Appeal Submitted",
        description: "Your unban appeal has been submitted. An admin will review it.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit appeal",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
          <InfoCard title="Appeal Submitted">
            <div className="text-center py-8">
              <p className="text-foreground mb-4">Your unban appeal has been submitted successfully.</p>
              <p className="text-muted-foreground mb-6">An administrator will review your appeal and respond soon.</p>
              <Button onClick={() => navigate('/login')}>Return to Login</Button>
            </div>
          </InfoCard>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Unban Appeal</h1>
        
        <InfoCard title="Submit Your Appeal">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-foreground">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="bg-secondary border-border text-foreground mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="reason" className="text-foreground">Why should you be unbanned?</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you believe your ban should be lifted..."
                className="bg-secondary border-border text-foreground mt-2 min-h-[150px]"
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Appeal"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/login')}>
                Cancel
              </Button>
            </div>
          </form>
        </InfoCard>
      </main>
      <Footer />
    </div>
  );
};

export default UnbanAppeal;