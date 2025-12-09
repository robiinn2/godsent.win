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
import { Newspaper, HelpCircle, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";

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
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; created_at: string }>>([]);

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
      
      // Subscribe to real-time updates
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

  const loadSections = async () => {
    const { data, error } = await supabase
      .from('forum_sections')
      .select('*')
      .order('name');

    if (!error && data) {
      setSections(data);
    }

    // Load all profiles for sequential IDs
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
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (username, pfp_url, created_at)
      `)
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Get roles for all authors
      const authorIds = [...new Set(data.map((p: any) => p.author_id))];
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', authorIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const postsWithRoles = data.map((post: any) => ({
        ...post,
        authorRole: roleMap.get(post.author_id) || 'user',
        authorSequentialId: getSequentialId(post.author_id),
      }));

      setPosts(postsWithRoles);
    }
  };

  const togglePostExpand = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
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

    // Check if user can post in this section
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

                  <div className="space-y-4">
                    {posts.length === 0 ? (
                      <p className="text-muted-foreground">No posts yet</p>
                    ) : (
                      posts.map((post) => {
                        const isQuestionsSection = selectedSection?.slug === 'questions';
                        const isExpanded = expandedPosts.has(post.id);
                        
                        return (
                          <div key={post.id} className="bg-card border border-border rounded overflow-hidden">
                            <div className="flex">
                              {/* Left side - User info (50% height concept via min-height) */}
                              <div className="w-32 md:w-40 flex-shrink-0 bg-secondary/50 p-4 flex flex-col items-center justify-start border-r border-border">
                                {/* Profile Picture */}
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-border mb-3">
                                  <img 
                                    src={post.profiles.pfp_url || '/default-pfp.png'} 
                                    alt={post.profiles.username} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                
                                {/* User Info */}
                                <div className="text-center space-y-1 w-full">
                                  <p className="font-bold text-foreground text-sm truncate">{post.profiles.username}</p>
                                  <p className="text-xs text-muted-foreground">ID: #{post.authorSequentialId || getSequentialId(post.author_id)}</p>
                                  <p className={`text-xs font-semibold capitalize ${
                                    post.authorRole === 'admin' ? 'text-red-500' : 
                                    post.authorRole === 'elder' ? 'text-purple-500' : 
                                    'text-muted-foreground'
                                  }`}>{post.authorRole || 'user'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(post.profiles.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Right side - Post content */}
                              <div className="flex-1 p-4 flex flex-col">
                                {/* Header */}
                                <div className="mb-3">
                                  <h3 className="text-lg font-bold text-foreground">{post.title}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    Posted {new Date(post.created_at).toLocaleString()}
                                  </p>
                                </div>
                                
                                {/* Content */}
                                {isQuestionsSection ? (
                                  <div>
                                    {isExpanded ? (
                                      <>
                                        <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                                        <button 
                                          onClick={() => togglePostExpand(post.id)}
                                          className="flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                                        >
                                          <ChevronUp className="w-4 h-4" />
                                          Hide content
                                        </button>
                                      </>
                                    ) : (
                                      <button 
                                        onClick={() => togglePostExpand(post.id)}
                                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                                      >
                                        <ChevronDown className="w-4 h-4" />
                                        Click to view content
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
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
