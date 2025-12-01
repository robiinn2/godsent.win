import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  responses: Array<{
    id: string;
    message: string;
    created_at: string;
    responder_id: string;
  }>;
}

const Support = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        ticket_responses (*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTickets(data as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !subject || !message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        message,
      });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit ticket",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Support ticket submitted successfully",
      });
      setSubject("");
      setMessage("");
      setShowNewTicket(false);
      loadTickets();

      // Create notification for admins
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'support',
          title: 'New Support Ticket',
          message: `New ticket: ${subject}`,
        });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Support</h1>

        <InfoCard title="Contact Support">
          <Button 
            onClick={() => setShowNewTicket(!showNewTicket)}
            className="mb-4"
          >
            {showNewTicket ? 'Cancel' : 'New Ticket'}
          </Button>

          {showNewTicket && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-card border border-border rounded">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide details about your issue"
                  rows={5}
                  className="bg-secondary"
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </form>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Your Tickets</h3>
            {tickets.length === 0 ? (
              <p className="text-muted-foreground">No tickets yet</p>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 bg-card border border-border rounded">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-foreground">{ticket.subject}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      ticket.status === 'open' ? 'bg-yellow-500/20 text-yellow-500' :
                      ticket.status === 'responded' ? 'bg-green-500/20 text-green-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-foreground mb-2">{ticket.message}</p>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(ticket.created_at).toLocaleString()}
                  </p>
                  
                  {ticket.responses && ticket.responses.length > 0 && (
                    <div className="mt-4 pl-4 border-l-2 border-primary">
                      <p className="text-sm font-semibold text-foreground mb-2">Admin Response:</p>
                      {ticket.responses.map((response) => (
                        <div key={response.id} className="mb-2">
                          <p className="text-foreground">{response.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(response.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </InfoCard>
      </main>
      
      <Footer />
    </div>
  );
};

export default Support;
