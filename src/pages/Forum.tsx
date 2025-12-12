import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Newspaper, HelpCircle, ArrowUp, Send, Paperclip, Download, Trash2, MessageSquare } from "lucide-react";

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
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
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
      return <MessageSquare className="w-4 h-4" />;
  }
};

// Floating shapes component for memesense style background
const FloatingShapes = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Circles */}
      <div className="absolute top-20 right-1/4 w-6 h-6 border border-muted-foreground/20 rounded-full animate-pulse" />
      <div className="absolute top-40 right-20 w-8 h-8 border border-accent/30 rounded-full" />
      <div className="absolute top-60 left-20 w-4 h-4 border border-muted-foreground/20 rounded-full" />
      <div className="absolute bottom-40 right-1/3 w-5 h-5 border border-muted-foreground/15 rounded-full" />
      <div className="absolute bottom-60 left-1/4 w-7 h-7 border border-accent/20 rounded-full" />
      
      {/* Triangles (using borders) */}
      <div className="absolute top-32 left-40 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-muted-foreground/15" />
      <div className="absolute top-80 right-40 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-accent/20" />
      <div className="absolute bottom-32 left-32 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-muted-foreground/10" />
      
      {/* X marks */}
      <div className="absolute top-48 left-16 text-destructive/30 text-lg font-bold">×</div>
      <div className="absolute bottom-48 right-24 text-destructive/25 text-xl font-bold">×</div>
      <div className="absolute top-1/2 right-16 text-destructive/20 text-lg font-bold">×</div>
      
      {/* Lines/dashes */}
      <div className="absolute top-24 left-1/3 w-6 h-0.5 bg-muted-foreground/15 rotate-45" />
      <div className="absolute bottom-24 right-1/4 w-8 h-0.5 bg-muted-foreground/15 -rotate-12" />
      <div className="absolute top-2/3 left-12 w-5 h-0.5 bg-muted-foreground/10 rotate-12" />
      
      {/* Play triangles */}
      <div className="absolute top-1/3 right-12 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-muted-foreground/20" />
      <div className="absolute bottom-1/3 left-1/3 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-accent/15" />
    </div>
  );
};

const Forum = () => {
  const { user, loading, isAdmin, isElder } = useAuth();
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    if (isRestrictedSection && !isAdmin && !isElder) {
      toast({
        title: "Access Denied",
        description: "Only admins and elders can post in this section",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;
    
    // Upload file if selected
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user!.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-files')
        .upload(filePath, selectedFile);
      
      if (uploadError) {
        toast({
          title: "Error",
          description: "Failed to upload file",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('post-files')
        .getPublicUrl(filePath);
      
      fileUrl = urlData.publicUrl;
      fileName = selectedFile.name;
      fileSize = selectedFile.size;
    }
    
    const { error } = await supabase
      .from('posts')
      .insert({
        section_id: selectedSection.id,
        author_id: user!.id,
        title: newPostTitle,
        content: newPostContent,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
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
      setSelectedFile(null);
      setShowNewPost(false);
      loadPosts(selectedSection.id);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      closePost();
      if (selectedSection) {
        loadPosts(selectedSection.id);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 20MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      <div className="min-h-screen flex flex-col bg-background relative">
        <FloatingShapes />
        <Header onLogoClick={closePost} />
        
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl relative z-10">
          {/* Original Post */}
          <div className="bg-card border border-border mb-6">
            <div className="flex">
              {/* Left side - User info */}
              <div className="w-32 md:w-48 flex-shrink-0 bg-secondary/50 p-4 flex flex-col items-center justify-start border-r border-border">
                <div className="w-16 h-16 md:w-24 md:h-24 overflow-hidden border-2 border-border mb-3">
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
                    viewingPost.authorRole === 'admin' ? 'text-destructive' : 
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
                <div className="mb-3 border-b border-border pb-3 flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{viewingPost.title}</h1>
                    <p className="text-xs text-muted-foreground">
                      Posted {new Date(viewingPost.created_at).toLocaleString()}
                    </p>
                  </div>
                  {(isAdmin || isElder) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePost(viewingPost.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-foreground whitespace-pre-wrap mb-4">{viewingPost.content}</p>
                
                {/* File attachment */}
                {viewingPost.file_url && viewingPost.file_name && (
                  <a 
                    href={viewingPost.file_url} 
                    download={viewingPost.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border hover:bg-secondary/80 transition-colors w-fit"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">{viewingPost.file_name}</span>
                    {viewingPost.file_size && (
                      <span className="text-xs text-muted-foreground">({formatFileSize(viewingPost.file_size)})</span>
                    )}
                  </a>
                )}
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
                  <div key={reply.id} className="bg-card border border-border">
                    <div className="flex">
                      {/* Left side - User info */}
                      <div className="w-24 md:w-36 flex-shrink-0 bg-secondary/50 p-3 flex flex-col items-center justify-start border-r border-border">
                        <div className="w-10 h-10 md:w-14 md:h-14 overflow-hidden border border-border mb-2">
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
                            reply.authorRole === 'admin' ? 'text-destructive' : 
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
          <form onSubmit={handleSubmitReply} className="bg-card border border-border p-4">
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
    <div className="min-h-screen flex flex-col bg-background relative">
      <FloatingShapes />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <div className="flex gap-6">
          {/* Memesense-style Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-card border border-border">
              {/* All threads button */}
              <button
                onClick={() => setSelectedSection(null)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-border ${
                  !selectedSection
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">All threads</span>
              </button>
              
              {/* Category sections */}
              {Object.entries(SECTION_CATEGORIES).map(([category, slugs]) => {
                const categorySections = sections.filter(s => slugs.includes(s.slug));
                if (categorySections.length === 0) return null;
                
                return (
                  <div key={category}>
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-xs text-muted-foreground">
                        {category}
                      </p>
                    </div>
                    {categorySections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => {
                          setSelectedSection(section);
                          setShowNewPost(false);
                        }}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-border last:border-b-0 ${
                          selectedSection?.id === section.id
                            ? 'bg-secondary text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        }`}
                      >
                        {getSectionIcon(section.slug)}
                        <span className="text-sm">{section.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Posts Area */}
          <div className="flex-1 min-w-0">
            {selectedSection ? (
              <div className="bg-card border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedSection.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedSection.description}</p>
                  </div>
                  
                  {(selectedSection.slug === 'questions' || isAdmin || (isElder && selectedSection.slug === 'announcements')) && (
                    <Button 
                      onClick={() => setShowNewPost(!showNewPost)}
                      variant={showNewPost ? "outline" : "default"}
                    >
                      {showNewPost ? 'Cancel' : 'New Post'}
                    </Button>
                  )}
                </div>

                {showNewPost && (
                  <form onSubmit={handleCreatePost} className="space-y-4 mb-6 p-4 bg-secondary border border-border">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        placeholder="Enter post title"
                        className="bg-background"
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
                        className="bg-background"
                      />
                    </div>
                    
                    {/* File attachment */}
                    <div className="space-y-2">
                      <Label>Attach File (optional)</Label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="w-4 h-4 mr-2" />
                          {selectedFile ? 'Change File' : 'Attach File'}
                        </Button>
                        {selectedFile && (
                          <span className="text-sm text-muted-foreground">
                            {selectedFile.name} ({formatFileSize(selectedFile.size)})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Post'}
                    </Button>
                  </form>
                )}

                <div className="space-y-1">
                  {posts.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center">No posts yet</p>
                  ) : (
                    posts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => openPost(post)}
                        className="w-full text-left px-4 py-3 bg-secondary border border-border hover:bg-secondary/70 transition-colors flex items-center gap-4"
                      >
                        <span className="text-xs text-muted-foreground flex-shrink-0 w-24">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-foreground hover:underline truncate flex-1">{post.title}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          by {post.profiles.username}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border p-6">
                <h2 className="text-xl font-bold text-foreground mb-2">Welcome to the Forum</h2>
                <p className="text-muted-foreground">Select a section from the sidebar to view posts</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Forum;
