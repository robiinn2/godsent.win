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
import { Newspaper, HelpCircle, ArrowUp, Send } from "lucide-react";

interface ForumSection {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  section_id: string;
  profiles: {
    username: string;
    pfp_url: string | null;
    created_at: string;
  };
  authorRole?: string;
  authorSequentialId?: number;
}

interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    pfp_url: string | null;
    created_at: string;
  };
  authorRole?: string;
  authorSequentialId?: number;
}

const SECTION_CATEGORIES = {
  'Information': ['announcements', 'questions'],
  'Software': ['updates'],
};

const getSectionIcon = (slug: string) => {
  switch (slug) {
    case 'announcements':
      return <Newspaper className="w-4 h-4" />;
    case 'questions':
      return <HelpCircle className="w-4 h-4" />;
    case 'updates':
      return <ArrowUp className="w-4 h-4" />;
    default:
      return null;
  }
};

const Forum = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<ForumSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<ForumSection | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; created_at: string }>>([]);
  
  // Full screen post view
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadSections();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSection) {
      loadPosts(selectedSection.id);
      
      const channel = supabase
        .channel('posts-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
            filter: `section_id=eq.${selectedSection.id}`
          },
          () => {
            loadPosts(selectedSection.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedSection]);

  // Subscribe to replies when viewing a post
  useEffect(() => {
    if (viewingPost) {
      loadReplies(viewingPost.id);
      
      const channel = supabase
        .channel('replies-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'post_replies',
            filter: `post_id=eq.${viewingPost.id}`
          },
          () => {
            loadReplies(viewingPost.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [viewingPost]);

  const loadSections = async () => {
    const { data, error } = await supabase
      .from('forum_sections')
      .select('*')
      .order('name');

    if (!error && data) {
      setSections(data);
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, created_at')
      .order('created_at', { ascending: true });

    if (profiles) {
      setAllProfiles(profiles);
    }
  };

  const getSequentialId = (authorId: string) => {
    const index = allProfiles.findIndex(p => p.id === authorId);
    return index + 1;
  };

  const loadPosts = async (sectionId: string) => {
    let profiles = allProfiles;
    if (profiles.length === 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      
      if (profileData) {
        profiles = profileData;
        setAllProfiles(profileData);
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const authorIds = [...new Set(data.map((p: any) => p.author_id))];
      
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, username, pfp_url, created_at')
        .in('id', authorIds);
      
      const profileMap = new Map(authorProfiles?.map(p => [p.id, p]) || []);
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', authorIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const getSeqId = (authorId: string) => {
        const index = profiles.findIndex(p => p.id === authorId);
        return index + 1;
      };

      const postsWithRoles = data.map((post: any) => {
        const profile = profileMap.get(post.author_id);
        return {
          ...post,
          profiles: profile ? {
            username: profile.username,
            pfp_url: profile.pfp_url,
            created_at: profile.created_at,
          } : { username: 'Unknown', pfp_url: null, created_at: new Date().toISOString() },
          authorRole: roleMap.get(post.author_id) || 'user',
          authorSequentialId: getSeqId(post.author_id),
        };
      });

      setPosts(postsWithRoles);
    } else if (!error) {
      setPosts([]);
    }
  };

  const loadReplies = async (postId: string) => {
    let profiles = allProfiles;
    if (profiles.length === 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      
      if (profileData) {
        profiles = profileData;
        setAllProfiles(profileData);
      }
    }

    const { data, error } = await supabase
      .from('post_replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const authorIds = [...new Set(data.map((r: any) => r.author_id))];
      
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, username, pfp_url, created_at')
        .in('id', authorIds);
      
      const profileMap = new Map(authorProfiles?.map(p => [p.id, p]) || []);
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', authorIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const getSeqId = (authorId: string) => {
        const index = profiles.findIndex(p => p.id === authorId);
        return index + 1;
      };

      const repliesWithProfiles = data.map((reply: any) => {
        const profile = profileMap.get(reply.author_id);
        return {
          ...reply,
          profiles: profile ? {
            username: profile.username,
            pfp_url: profile.pfp_url,
            created_at: profile.created_at,
          } : { username: 'Unknown', pfp_url: null, created_at: new Date().toISOString() },
          authorRole: roleMap.get(reply.author_id) || 'user',
          authorSequentialId: getSeqId(reply.author_id),
        };
      });

      setReplies(repliesWithProfiles);
    } else if (!error) {
      setReplies([]);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSection || !newPostTitle || !newPostContent) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const isRestrictedSection = selectedSection.slug === 'announcements' || selectedSection.slug === 'updates';
    if (isRestrictedSection && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admins can post in this section",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('posts')
      .insert({
        section_id: selectedSection.id,
        author_id: user!.id,
        title: newPostTitle,
        content: newPostContent,
      });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Post created successfully",
      });
      setNewPostTitle("");
      setNewPostContent("");
      setShowNewPost(false);
      loadPosts(selectedSection.id);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!viewingPost || !newReply.trim()) {
      return;
    }

    setSubmittingReply(true);
    const { error } = await supabase
      .from('post_replies')
      .insert({
        post_id: viewingPost.id,
        author_id: user!.id,
        content: newReply.trim(),
      });

    setSubmittingReply(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } else {
      setNewReply("");
    }
  };

  const openPost = (post: Post) => {
    setViewingPost(post);
    setReplies([]);
  };

  const closePost = () => {
    setViewingPost(null);
    setReplies([]);
    setNewReply("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Full screen post view
  if (viewingPost) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onLogoClick={closePost} />
        
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          {/* Original Post */}
          <div className="bg-card border border-border rounded mb-6">
            <div className="flex">
              {/* Left side - User info */}
              <div className="w-32 md:w-48 flex-shrink-0 bg-secondary/50 p-4 flex flex-col items-center justify-start border-r border-border">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-border mb-3">
                  <img 
                    src={viewingPost.profiles.pfp_url || '/default-pfp.png'} 
                    alt={viewingPost.profiles.username} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center space-y-1 w-full">
                  <p className="font-bold text-foreground text-sm truncate">{viewingPost.profiles.username}</p>
                  <p className="text-xs text-muted-foreground">ID: #{viewingPost.authorSequentialId || getSequentialId(viewingPost.author_id)}</p>
                  <p className={`text-xs font-semibold capitalize ${
                    viewingPost.authorRole === 'admin' ? 'text-red-500' : 
                    viewingPost.authorRole === 'elder' ? 'text-purple-500' : 
                    'text-muted-foreground'
                  }`}>{viewingPost.authorRole || 'user'}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(viewingPost.profiles.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* Right side - Post content */}
              <div className="flex-1 p-4 flex flex-col">
                <div className="mb-3 border-b border-border pb-3">
                  <h1 className="text-xl font-bold text-foreground">{viewingPost.title}</h1>
                  <p className="text-xs text-muted-foreground">
                    Posted {new Date(viewingPost.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="text-foreground whitespace-pre-wrap">{viewingPost.content}</p>
              </div>
            </div>
          </div>

          {/* Replies Section */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Replies ({replies.length})</h2>
            
            {replies.length === 0 ? (
              <p className="text-muted-foreground text-sm">No replies yet</p>
            ) : (
              <div className="space-y-4">
                {replies.map((reply) => (
                  <div key={reply.id} className="bg-card border border-border rounded">
                    <div className="flex">
                      {/* Left side - User info */}
                      <div className="w-24 md:w-36 flex-shrink-0 bg-secondary/50 p-3 flex flex-col items-center justify-start border-r border-border">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden border border-border mb-2">
                          <img 
                            src={reply.profiles.pfp_url || '/default-pfp.png'} 
                            alt={reply.profiles.username} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-center space-y-0.5 w-full">
                          <p className="font-bold text-foreground text-xs truncate">{reply.profiles.username}</p>
                          <p className="text-[10px] text-muted-foreground">#{reply.authorSequentialId}</p>
                          <p className={`text-[10px] font-semibold capitalize ${
                            reply.authorRole === 'admin' ? 'text-red-500' : 
                            reply.authorRole === 'elder' ? 'text-purple-500' : 
                            'text-muted-foreground'
                          }`}>{reply.authorRole || 'user'}</p>
                        </div>
                      </div>
                      
                      {/* Right side - Reply content */}
                      <div className="flex-1 p-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          {new Date(reply.created_at).toLocaleString()}
                        </p>
                        <p className="text-foreground text-sm whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reply Input */}
          <form onSubmit={handleSubmitReply} className="bg-card border border-border rounded p-4">
            <div className="flex gap-3">
              <Textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                className="bg-secondary flex-1"
              />
              <Button type="submit" disabled={submittingReply || !newReply.trim()} className="self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sections Sidebar */}
          <div className="md:col-span-1">
            <InfoCard title="Forum Sections">
              <div className="space-y-4">
                {Object.entries(SECTION_CATEGORIES).map(([category, slugs]) => {
                  const categorySections = sections.filter(s => slugs.includes(s.slug));
                  if (categorySections.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 px-2">
                        {category}
                      </p>
                      <div className="space-y-1">
                        {categorySections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => {
                              setSelectedSection(section);
                              setShowNewPost(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2 ${
                              selectedSection?.id === section.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {getSectionIcon(section.slug)}
                            <span>{section.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </InfoCard>
          </div>

          {/* Posts Area */}
          <div className="md:col-span-3">
            {selectedSection ? (
              <>
                <InfoCard title={selectedSection.name}>
                  <p className="text-muted-foreground mb-4">{selectedSection.description}</p>
                  
                  {(selectedSection.slug === 'resell' || selectedSection.slug === 'questions' || isAdmin) && (
                    <Button 
                      onClick={() => setShowNewPost(!showNewPost)}
                      className="mb-4"
                    >
                      {showNewPost ? 'Cancel' : 'New Post'}
                    </Button>
                  )}

                  {showNewPost && (
                    <form onSubmit={handleCreatePost} className="space-y-4 mb-6 p-4 bg-card border border-border rounded">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={newPostTitle}
                          onChange={(e) => setNewPostTitle(e.target.value)}
                          placeholder="Enter post title"
                          className="bg-secondary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          value={newPostContent}
                          onChange={(e) => setNewPostContent(e.target.value)}
                          placeholder="Enter post content"
                          rows={5}
                          className="bg-secondary"
                        />
                      </div>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Post'}
                      </Button>
                    </form>
                  )}

                  <div className="space-y-1">
                    {posts.length === 0 ? (
                      <p className="text-muted-foreground">No posts yet</p>
                    ) : (
                      posts.map((post) => (
                        <button
                          key={post.id}
                          onClick={() => openPost(post)}
                          className="w-full text-left px-3 py-2 bg-card border border-border rounded hover:bg-secondary/50 transition-colors flex items-center gap-3"
                        >
                          <span className="text-foreground hover:underline truncate flex-1">{post.title}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            by {post.profiles.username}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </InfoCard>
              </>
            ) : (
              <InfoCard title="Welcome to the Forum">
                <p className="text-foreground">Select a section from the sidebar to view posts</p>
              </InfoCard>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Forum;