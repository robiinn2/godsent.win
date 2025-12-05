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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Profile {
  id: string;
  username: string;
  email: string;
  name: string;
  created_at: string;
  pfp_url: string;
  invitation_key?: string;
  role?: 'user' | 'elder' | 'admin';
}

interface InvitationKey {
  key: string;
  created_by: string;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
  creator_username: string | null;
  creatorSequentialId?: number;
}

interface UserGrant {
  id: string;
  user_id: string;
  invites_remaining: number;
  granted_at: string;
  granted_by: string;
  username?: string;
  userSequentialId?: number;
}

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  profiles: {
    username: string;
  };
  ticket_responses: Array<{
    id: string;
    message: string;
    created_at: string;
  }>;
}

const AdminPanel = () => {
  const { user, loading, adminLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [keys, setKeys] = useState<InvitationKey[]>([]);
  const [userGrants, setUserGrants] = useState<UserGrant[]>([]);
  const [generating, setGenerating] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banType, setBanType] = useState<"temporary" | "permanent">("temporary");
  const [banReason, setBanReason] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && !adminLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, loading, adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadUsers();
      loadKeys();
      loadUserGrants();
      loadTickets();
    }
  }, [user, isAdmin]);

  const loadUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (profiles) {
      // Get invitation keys for each user
      const { data: codes } = await supabase
        .from('invitation_codes')
        .select('key, used_by');
      
      // Get roles for each user
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      const usersWithKeysAndRoles = profiles.map(profile => {
        const userRoles = roles?.filter(r => r.user_id === profile.id).map(r => r.role) || [];
        let highestRole: 'user' | 'elder' | 'admin' = 'user';
        if (userRoles.includes('admin')) highestRole = 'admin';
        else if (userRoles.includes('elder')) highestRole = 'elder';
        
        return {
          ...profile,
          invitation_key: codes?.find(c => c.used_by === profile.id)?.key || 'Unknown',
          role: highestRole
        };
      });
      
      setUsers(usersWithKeysAndRoles);
    }
  };

  const loadKeys = async () => {
    const { data } = await supabase
      .from('invitation_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      // Get all profiles sorted by join date for sequential IDs
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      
      const keysWithSequentialIds = data.map(k => {
        const creatorIndex = profiles?.findIndex(p => p.id === k.created_by) ?? -1;
        return {
          ...k,
          creatorSequentialId: creatorIndex >= 0 ? creatorIndex + 1 : 0
        };
      });
      
      setKeys(keysWithSequentialIds);
    }
  };

  const loadUserGrants = async () => {
    const { data: grants } = await supabase
      .from('user_invitations')
      .select('*')
      .order('granted_at', { ascending: false });
    
    if (grants) {
      // Get all profiles sorted by join date for sequential IDs
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .order('created_at', { ascending: true });
      
      const grantsWithUsernames = grants.map(g => {
        const userIndex = profiles?.findIndex(p => p.id === g.user_id) ?? -1;
        return {
          ...g,
          username: profiles?.find(p => p.id === g.user_id)?.username || 'Unknown',
          userSequentialId: userIndex >= 0 ? userIndex + 1 : 0
        };
      });
      
      setUserGrants(grantsWithUsernames);
    }
  };

  const loadTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select(`*, profiles (username), ticket_responses (*)`)
      .order('created_at', { ascending: false });
    if (data) setTickets(data as any);
  };

  const generateKey = async () => {
    setGenerating(true);
    
    // Get current user's username
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user!.id)
      .single();
    
    const randomChars = () => Array.from({ length: 4 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
    const newKey = `Godsent-${randomChars()}-${randomChars()}-${randomChars()}-${randomChars()}`;
    
    await supabase.from('invitation_codes').insert({ 
      key: newKey, 
      created_by: user!.id,
      creator_username: profile?.username || 'Admin'
    });
    toast({ title: "Success", description: `Key: ${newKey}` });
    loadKeys();
    setGenerating(false);
  };

  const terminateKey = async (key: string) => {
    if (!confirm(`Terminate key: ${key}?`)) return;
    await supabase.from('invitation_codes').delete().eq('key', key);
    toast({ title: "Success", description: "Key terminated" });
    loadKeys();
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason) return;
    const wipeDate = banType === 'permanent' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
    await supabase.from('banned_users').insert({
      user_id: selectedUser.id,
      banned_by: user!.id,
      banned_by_username: 'sandro',
      reason: banReason,
      ban_type: banType,
      wipe_date: wipeDate,
    });
    toast({ title: "Success", description: `${selectedUser.username} banned` });
    setBanDialogOpen(false);
    loadUsers();
  };

  const handleTerminateAccount = async (userId: string, username: string) => {
    if (!confirm(`PERMANENTLY DELETE ${username}?`)) return;
    await supabase.from('profiles').delete().eq('id', userId);
    toast({ title: "Success", description: `${username} terminated` });
    loadUsers();
  };

  const grantInvites = async (userId: string, username: string) => {
    await supabase.from('user_invitations').insert({
      user_id: userId,
      invites_remaining: 1,
      granted_by: user!.id,
    });
    
    // Send notification to the user
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'invite_granted',
      title: 'Invite Granted',
      message: 'You have been granted 1 invitation! Click to create your key.',
    });
    
    toast({ title: "Success", description: `Granted 1 invite to ${username}` });
    loadUserGrants();
  };

  const promoteUser = async (userId: string, username: string, currentRole: 'user' | 'elder' | 'admin') => {
    const nextRole = currentRole === 'user' ? 'elder' : currentRole === 'elder' ? 'admin' : null;
    if (!nextRole) {
      toast({ title: "Error", description: `${username} is already admin` });
      return;
    }
    if (!confirm(`Promote ${username} to ${nextRole}?`)) return;
    
    // Remove current role if not 'user' (user role is default)
    if (currentRole !== 'user') {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', currentRole);
    }
    
    await supabase.from('user_roles').insert({ user_id: userId, role: nextRole });
    toast({ title: "Success", description: `${username} promoted to ${nextRole}` });
    loadUsers();
  };

  const respondToTicket = async () => {
    if (!selectedTicket || !responseMessage) return;
    await supabase.from('ticket_responses').insert({
      ticket_id: selectedTicket.id,
      responder_id: user!.id,
      message: responseMessage,
    });
    await supabase.from('support_tickets').update({ status: 'responded' }).eq('id', selectedTicket.id);
    await supabase.from('notifications').insert({
      user_id: selectedTicket.user_id,
      type: 'ticket_response',
      title: 'Support Response',
      message: 'Admin responded to your ticket',
    });
    toast({ title: "Success", description: "Response sent" });
    setResponseMessage("");
    setSelectedTicket(null);
    loadTickets();
  };

  // Create a map of user IDs to sequential IDs based on join date
  const userSequentialIds = new Map<string, number>();
  [...users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((u, idx) => userSequentialIds.set(u.id, idx + 1));

  const filteredUsers = users
    .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => sortBy === "name" ? a.username.localeCompare(b.username) : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Admin Panel</h1>
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="keys">Keys</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <InfoCard title="Manage Users">
              <div className="flex gap-4 mb-4">
                <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-secondary max-w-md" />
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-40 bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date Created</SelectItem>
                    <SelectItem value="name">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {filteredUsers.map((profile, index) => (
                  <div key={profile.id} className="p-4 bg-card border border-border rounded flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded font-mono font-bold">ID: {userSequentialIds.get(profile.id)}</span>
                        <p className="font-bold text-foreground">{profile.username}</p>
                        <span className={`text-xs px-2 py-1 rounded capitalize ${
                          profile.role === 'admin' ? 'bg-red-500/20 text-red-500' : 
                          profile.role === 'elder' ? 'bg-blue-500/20 text-blue-500' : 
                          'bg-muted text-muted-foreground'
                        }`}>{profile.role || 'user'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Email: {profile.email}</p>
                      <p className="text-sm text-muted-foreground">Name: {profile.name}</p>
                      <p className="text-xs text-muted-foreground">Joined: {new Date(profile.created_at).toLocaleDateString()}</p>
                      <p className="text-xs font-mono text-primary">Key: {profile.invitation_key}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button size="sm" variant="outline" onClick={() => promoteUser(profile.id, profile.username, profile.role || 'user')} disabled={profile.id === user.id || profile.role === 'admin'}>
                        {profile.role === 'user' ? 'Promote to Elder' : profile.role === 'elder' ? 'Promote to Admin' : 'Max Rank'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => grantInvites(profile.id, profile.username)} disabled={profile.id === user.id}>Grant Invite</Button>
                      <Button size="sm" variant="destructive" onClick={() => { setSelectedUser(profile); setBanDialogOpen(true); }} disabled={profile.id === user.id}>Ban</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleTerminateAccount(profile.id, profile.username)} disabled={profile.id === user.id}>Terminate</Button>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          </TabsContent>
          <TabsContent value="keys">
            <InfoCard title="Invitation Keys">
              <div className="flex items-center gap-4 mb-4">
                <Button onClick={generateKey} disabled={generating}>{generating ? 'Generating...' : 'Generate Key'}</Button>
                <span className="text-sm text-muted-foreground">
                  Available: {keys.filter(k => !k.used_by).length} | Used: {keys.filter(k => k.used_by).length}
                </span>
              </div>
              
              {/* User Grants Section */}
              {userGrants.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">User Invite Grants</h3>
                  <div className="space-y-2">
                    {userGrants.map((grant) => (
                      <div key={grant.id} className="p-4 bg-card border border-border rounded">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-secondary px-2 py-1 rounded font-mono">#{grant.userSequentialId}</span>
                              <p className="font-bold text-foreground">{grant.username}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">Granted: {new Date(grant.granted_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded text-sm ${grant.invites_remaining > 0 ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                              Available: {grant.invites_remaining}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Keys Section */}
              <h3 className="text-lg font-semibold text-foreground mb-3">Generated Keys</h3>
              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.key} className="p-4 bg-card border border-border rounded flex justify-between items-center">
                    <div>
                      <p className="font-mono font-bold text-foreground">{k.key}</p>
                      <p className="text-sm text-muted-foreground">
                        Created by: {k.creator_username || 'Admin'} {k.creatorSequentialId ? `(#${k.creatorSequentialId})` : ''} • {new Date(k.created_at).toLocaleDateString()}
                      </p>
                      {k.used_by && <p className="text-sm text-muted-foreground">Used on {new Date(k.used_at!).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded text-sm ${k.used_by ? 'bg-muted text-muted-foreground' : 'bg-green-500/20 text-green-500'}`}>
                        {k.used_by ? 'Used' : 'Active'}
                      </span>
                      <Button size="sm" variant="destructive" onClick={() => terminateKey(k.key)}>Terminate</Button>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          </TabsContent>
          <TabsContent value="tickets">
            <InfoCard title="Support Tickets">
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 bg-card border border-border rounded">
                    <div className="flex justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-foreground">{ticket.subject}</h4>
                        <p className="text-sm text-muted-foreground">From: {ticket.profiles.username}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${ticket.status === 'open' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>{ticket.status}</span>
                    </div>
                    <p className="text-foreground mb-2">{ticket.message}</p>
                    {ticket.ticket_responses?.[0] && (
                      <div className="mt-2 p-2 bg-secondary rounded">
                        <p className="text-sm text-foreground">{ticket.ticket_responses[0].message}</p>
                      </div>
                    )}
                    {ticket.status !== 'responded' && <Button size="sm" className="mt-2" onClick={() => setSelectedTicket(ticket)}>Respond</Button>}
                  </div>
                ))}
                {selectedTicket && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-card p-6 rounded-lg max-w-md w-full border border-border">
                      <h3 className="font-bold text-foreground mb-4">Respond</h3>
                      <Textarea value={responseMessage} onChange={(e) => setResponseMessage(e.target.value)} placeholder="Response..." rows={5} className="bg-secondary mb-4" />
                      <div className="flex gap-2">
                        <Button onClick={respondToTicket}>Send</Button>
                        <Button variant="outline" onClick={() => setSelectedTicket(null)}>Cancel</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>
          </TabsContent>
        </Tabs>
        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Ban User: {selectedUser?.username}</DialogTitle>
              <DialogDescription>Choose type and reason</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={banType} onValueChange={(v: any) => setBanType(v)}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="permanent">Permanent (7 day appeal)</SelectItem>
                </SelectContent>
              </Select>
              <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason..." className="bg-secondary" />
              <div className="flex gap-2">
                <Button onClick={handleBanUser} variant="destructive">Ban</Button>
                <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;
