import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import ShareBar from '../components/ShareBar';

function getEmbedUrl(url) {
  if (!url) return '';
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

// One consistent metadata format for every card: Location · Category · Year.
// Missing pieces are simply omitted; separators only appear between items.
function ProjectMeta({ project }) {
  const parts = [];
  if (project.location) {
    parts.push(
      <span key="location" className="text-muted-foreground">
        {project.location}
      </span>
    );
  }
  if (project.category) {
    parts.push(
      <span key="category" className="text-accent capitalize">
        {project.category.replace(/_/g, ' ')}
      </span>
    );
  }
  if (project.year) {
    parts.push(
      <span key="year" className="text-muted-foreground">
        {project.year}
      </span>
    );
  }
  if (parts.length === 0) return null;
  return (
    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1 font-sans text-xs">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="text-muted-foreground/40" aria-hidden="true">
              ·
            </span>
          )}
          {part}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['portfolio-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('portfolio_projects')
        .select('*')
        .or('status.eq.published,status.is.null')
        .order('order', { ascending: true });
      return data || [];
    },
  });

  // Build filter tabs from actual project data so custom categories always appear
  const categories = [
    { value: 'all', label: 'All' },
    ...Array.from(new Set(projects.map(p => p.category).filter(Boolean)))
      .map(value => ({ value, label: value.replace(/_/g, ' ') })),
  ];
  // Hide the filter bar when it would be decorative (fewer than 2 real categories)
  const showFilters = categories.length > 2;

  const filtered = activeCategory === 'all'
    ? projects
    : projects.filter((p) => p.category === activeCategory);

  // Escape closes the dialog; body scroll is locked while it is open.
  useEffect(() => {
    if (!selectedProject) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedProject(null);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProject]);

  return (
    <div className="pt-28 pb-24 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1]">
            Selected Works
          </h1>
          <p className="font-serif text-lg text-muted-foreground mt-4 max-w-lg">
            A curated selection of cinematic work—from remote documentaries to intimate narratives captured through the lens.
          </p>
        </motion.div>

        {showFilters && (
          <div className="flex items-center gap-6 mb-16 overflow-x-auto filmstrip-scroll -mx-6 px-6 md:mx-0 md:px-0">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`font-sans text-xs tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-300 pb-1 border-b ${
                  activeCategory === cat.value
                    ? 'text-foreground border-foreground'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse aspect-[21/9] bg-muted rounded" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="font-serif text-muted-foreground text-center py-24">
            No projects in this category yet.
          </p>
        ) : (
          <div className="space-y-12">
            <AnimatePresence mode="wait">
              {filtered.map((project, i) => (
                <motion.button
                  key={project.id}
                  type="button"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="group block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-4 rounded"
                  onClick={() => setSelectedProject(project)}
                  aria-haspopup="dialog"
                  aria-label={`Open ${project.title}`}
                >
                  <div className="aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] overflow-hidden relative">
                    <img
                      src={project.thumbnail}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 group-focus-visible:bg-black/20 transition-colors duration-500 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full border border-white/0 group-hover:border-white/60 group-focus-visible:border-white/60 flex items-center justify-center transition-all duration-500 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 scale-75 group-hover:scale-100 group-focus-visible:scale-100">
                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-white/80 ml-1" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <h3 className="font-sans text-lg font-light tracking-wide">{project.title}</h3>
                    <ProjectMeta project={project} />
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-6"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={selectedProject.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video bg-black rounded overflow-hidden mb-6">
                {selectedProject.video_url ? (
                  <iframe
                    src={getEmbedUrl(selectedProject.video_url)}
                    title={selectedProject.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <img src={selectedProject.thumbnail} alt={selectedProject.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="text-white">
                <h2 className="font-sans text-2xl font-light">{selectedProject.title}</h2>
                {selectedProject.description && (
                  <div className="font-serif text-white/60 mt-3 max-w-xl ql-content" dangerouslySetInnerHTML={{ __html: selectedProject.description }} />
                )}
                <div className="flex items-center gap-4 mt-4">
                  {selectedProject.client && (
                    <span className="font-sans text-xs text-white/40">Client: {selectedProject.client}</span>
                  )}
                  {selectedProject.location && (
                    <span className="font-sans text-xs text-white/40">{selectedProject.location}</span>
                  )}
                  {selectedProject.year && (
                    <span className="font-sans text-xs text-white/40">{selectedProject.year}</span>
                  )}
                </div>
                <div className="[&_.border-border]:border-white/20 [&_.text-muted-foreground]:text-white/40 [&_a]:text-white/40 [&_button]:text-white/40 [&_p]:text-white/40">
                  <ShareBar title={selectedProject.title} image={selectedProject.thumbnail} />
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-3 right-3 md:top-6 md:right-6 font-sans text-xs text-white/50 tracking-[0.2em] uppercase hover:text-white transition-colors bg-black/40 px-3 py-2 rounded"
              >
                Close ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
