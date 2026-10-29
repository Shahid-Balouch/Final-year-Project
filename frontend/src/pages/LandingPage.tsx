import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Eye,
  Bell,
  Activity,
  Zap,
  Lock,
  ArrowRight,
} from 'lucide-react';

const DotGrid: React.FC = () => (
  <div
    className="fixed inset-0 z-0 pointer-events-none"
    style={{
      backgroundImage:
        'radial-gradient(circle, var(--color-outline) 1.5px, transparent 1.5px)',
      backgroundSize: '32px 32px',
      opacity: 0.5,
    }}
  />
);

const features = [
  {
    icon: Eye,
    title: 'Autonomous Detection',
    desc: 'Detects fights, weapons, and activities using YOLOv8 deep learning CV in real-time.',
    color: 'var(--color-primary)',
  },
  {
    icon: Activity,
    title: 'Person Re-ID',
    desc: 'Upload a reference image and the system scans all live feeds to lock on the target.',
    color: 'var(--color-accent)',
  },
  {
    icon: Bell,
    title: 'Instant Uplink',
    desc: 'Multi-channel alerts via Dashboard, WhatsApp, and Email with evidence snapshots.',
    color: 'var(--color-secondary)',
  },
];

const stats = [
  { value: '<100ms', label: 'Detection Latency' },
  { value: '99.4%', label: 'Face Match Accuracy' },
  { value: '24/7', label: 'Autonomous Watch' },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: 'easeOut' as const },
    },
  };

  return (
    <div className="min-h-screen overflow-x-hidden relative bg-[var(--color-background)] text-[var(--color-on-surface)] font-[var(--font-sans)]">
      <DotGrid />

      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, var(--color-primary-container) 0%, transparent 70%)',
        }}
      />

      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-30 flex justify-between items-center px-6 md:px-10 py-4 backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--color-outline-variant)',
          background: 'rgba(255, 255, 255, 0.75)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-[var(--color-outline-variant)]">
            <Shield className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <span className="text-sm md:text-base font-[var(--font-display)] font-extrabold tracking-[0.15em] uppercase">
            AI Surviallance
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="group px-5 md:px-6 py-2.5 font-semibold text-sm rounded-full text-white bg-[var(--color-primary)] hover:bg-[var(--color-on-primary-container)] transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              Enter Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 md:px-5 py-2.5 text-sm font-semibold rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container)] transition-all"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-5 md:px-6 py-2.5 font-semibold text-sm rounded-full text-white bg-[var(--color-primary)] hover:bg-[var(--color-on-primary-container)] transition-all shadow-md hover:shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]"
              >
                Get Access
              </button>
            </>
          )}
        </div>
      </motion.nav>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10"
      >
        <section className="relative isolate flex items-center justify-center overflow-hidden min-h-[86vh]">
          <motion.img
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtFYRZ_ZnKrM-54fANdixtux2VJwx6tSe0LSF0bevEOg&s=10"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover -z-10"
          />

          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--color-background)]/95 via-white/80 to-[var(--color-background)]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-[var(--color-primary)]/10 via-transparent to-[var(--color-secondary)]/10" />

          <div className="relative w-full max-w-5xl mx-auto px-6 md:px-8 py-24 md:py-8 text-center">
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-8 font-[var(--font-display)]"
            >
              Intelligent
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">
                Surveillance
              </span>
              <span className="block text-xl md:text-2xl lg:text-3xl font-medium tracking-wide text-[var(--color-on-surface-variant)] mt-4">
                Automated Reality.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="max-w-2xl mx-auto text-base md:text-lg mb-12 leading-relaxed text-[var(--color-on-surface-variant)]"
            >
              Transform traditional CCTV into proactive, intelligent security
              networks using YOLOv8, FaceNet, and real-time WebSocket streaming —
              with instant multi-channel alerts.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-4 justify-center mb-14"
            >
              <button
                onClick={() =>
                  navigate(isAuthenticated ? '/dashboard' : '/signup')
                }
                className="group px-8 py-4 font-semibold text-[15px] rounded-full text-white bg-[var(--color-primary)] hover:bg-[var(--color-on-primary-container)] transition-all shadow-[0_8px_20px_-4px_rgba(79,70,229,0.5)] hover:shadow-[0_12px_24px_-4px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Zap className="w-5 h-5 fill-current" />
                {isAuthenticated ? 'Open Dashboard' : 'Initialize Access'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 font-semibold text-[15px] rounded-full text-[var(--color-on-surface)] bg-white/90 backdrop-blur border border-[var(--color-outline)] hover:border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container)] hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-2"
              >
                <Lock className="w-5 h-5 text-[var(--color-on-surface-variant)]" />
                Operator Login
              </button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-10 md:gap-16 justify-center"
            >
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-extrabold text-[var(--color-primary)] font-[var(--font-display)]">
                    {s.value}
                  </div>
                  <div className="text-xs md:text-sm text-[var(--color-on-surface-variant)] tracking-wide uppercase mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 md:px-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: 'easeOut' }}
                  whileHover={{ y: -6 }}
                  className="group relative p-8 text-left bg-white rounded-2xl border border-[var(--color-outline-variant)] shadow-sm hover:shadow-xl hover:border-[var(--color-outline)] transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 mb-6 flex items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                    style={{
                      color: f.color,
                      backgroundColor: `color-mix(in srgb, ${f.color} 12%, transparent)`,
                    }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-3 tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
                    {f.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.main>

      <footer className="relative z-10 border-t border-[var(--color-outline-variant)] py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
        © {new Date().getFullYear()} AI Surviallance System · Final Year Project
      </footer>
    </div>
  );
};

export default LandingPage;FileSystemHandle