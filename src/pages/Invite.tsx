import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserInvitation {
  id: string;
  invites_remaining: number;
  granted_at: string;
}

interface CreatedKey {
  key: string;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
}

const Invite = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [invitation, setInvitation] = useState<UserInvitation | null>(null);
  const [createdKeys, setCreatedKeys] = useState<CreatedKey[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadInvitationData();
    }
  }, [user]);

  const loadInvitationData = async () => {
    setLoadingData(true);
    
    // Get user's invitation grants
    const { data: inviteData } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('user_id', user!.id)
      .gt('invites_remaining', 0)
      .maybeSingle();
    
    setInvitation(inviteData);
    
    // Get keys created by this user
    const { data: keysData } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('created_by', user!.id)
      .order('created_at', { ascending: false });
    
    setCreatedKeys(keysData || []);
    setLoadingData(false);
  };

  const generateKey = async () => {
    if (!invitation || invitation.invites_remaining <= 0) {
      toast({ title: "Error", description: "No invites remaining", variant: "destructive" });
      return;
    }

    setGenerating(true);
    
    // Get username
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user!.id)
      .single();
    
    const randomChars = () => Array.from({ length: 4 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
    const newKey = `Godsent-${randomChars()}-${randomChars()}-${randomChars()}-${randomChars()}`;
    
    // Create the key
    const { error: keyError } = await supabase
      .from('invitation_codes')
      .insert({ 
        key: newKey, 
        created_by: user!.id,
        creator_username: profile?.username || 'Unknown'
      });
    
    if (keyError) {
      toast({ title: "Error", description: "Failed to create key", variant: "destructive" });
      setGenerating(false);
      return;
    }
    
    // Decrement invites remaining
    await supabase
      .from('user_invitations')
      .update({ invites_remaining: invitation.invites_remaining - 1 })
      .eq('id', invitation.id);
    
    toast({ title: "Success", description: `Key created: ${newKey}` });
    loadInvitationData();
    setGenerating(false);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Invite Friends</h1>
        
        {invitation && invitation.invites_remaining > 0 ? (
          <InfoCard title="Create Invitation Key">
            <p className="text-muted-foreground mb-4">
              You have <span className="text-primary font-bold">{invitation.invites_remaining}</span> invite(s) remaining.
            </p>
            
            <Button onClick={generateKey} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Invitation Key'}
            </Button>
          </InfoCard>
        ) : (
          <InfoCard title="No Invites Available">
            <p className="text-muted-foreground">
              You don't have any invitation opportunities. An admin needs to grant you invite permissions.
            </p>
          </InfoCard>
        )}
        
        {createdKeys.length > 0 && (
          <div className="mt-6">
            <InfoCard title="Your Created Keys">
              <div className="space-y-2">
                {createdKeys.map((k) => (
                  <div key={k.key} className="p-4 bg-card border border-border rounded">
                    <p className="font-mono font-bold text-foreground">{k.key}</p>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(k.created_at).toLocaleDateString()}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                      k.used_by ? 'bg-muted text-muted-foreground' : 'bg-green-500/20 text-green-500'
                    }`}>
                      {k.used_by ? `Used on ${new Date(k.used_at!).toLocaleDateString()}` : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </InfoCard>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Invite;