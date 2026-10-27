import React, { useEffect, useState } from 'react';
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
  Cpu,
  Radar,
  Wifi,
} from 'lucide-react';

/* ================================================================
   BACKGROUND: animated dot grid
   ================================================================ */
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

/* ================================================================
   HERO VISUAL: pulsing radar + rotating core + corner nodes
   ================================================================ */
const RadarVisual: React.FC = () => {
  const nodes = [
    { top: '8%', left: '8%', icon: Eye },
    { top: '8%', right: '8%', icon: Bell },
    { bottom: '8%', left: '8%', icon: Cpu },
    { bottom: '8%', right: '8%', icon: Wifi },
  ];

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: 'var(--color-primary)' }}
          initial={{ scale: 0.4, opacity: 0.8 }}
          animate={{ scale: 1.4, opacity: 0 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 1,
            ease: 'easeOut',
          }}
        />
      ))}

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl"
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <Radar className="w-12 h-12 text-white" />
        </motion.div>
      </div>

      {nodes.map((n, i) => {
        const style: React.CSSProperties = {
          top: n.top,
          left: n.left,
          right: n.right,
          bottom: n.bottom,
        };
        const Icon = n.icon;
        return (
          <motion.div
            key={i}
            className="absolute w-10 h-10 rounded-xl bg-white shadow-lg border border-[var(--color-outline-variant)] flex items-center justify-center"
            style={style}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 + i * 0.2, duration: 0.5 }}
          >
            <Icon className="w-5 h-5 text-[var(--color-primary)]" />
          </motion.div>
        );
      })}
    </div>
  );
};

/* ================================================================
   BOOT TERMINAL: animates lines one by one
   ================================================================ */
const termLines = [
  { text: '> Initializing neural networks...', result: '' },
  { text: '> Loading YOLOv8 detection engine...', result: '[OK]' },
  { text: '> Face recognition module...', result: '[READY]' },
  { text: '> WebSocket uplink established...', result: '[ONLINE]' },
];

const BootTerminal: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= termLines.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="w-full max-w-xl mx-auto mt-10 rounded-2xl overflow-hidden border border-[var(--color-outline-variant)] shadow-lg bg-[#0b0f19]">
      {/* title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b26] border-b border-[var(--color-outline-variant)]">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-3 text-xs text-gray-400 font-mono">
          ai-surveillance — boot.log
        </span>
      </div>

      {/* body */}
      <div className="p-5 font-mono text-[13px] leading-7 min-h-[180px]">
        {termLines.slice(0, step).map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-between"
          >
            <span className="text-gray-300">{l.text}</span>
            <span className="text-emerald-400 font-bold">{l.result}</span>
          </motion.div>
        ))}
        {step < termLines.length && (
          <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse" />
        )}
      </div>
    </div>
  );
};

/* ================================================================
   DATA: features + stats
   ================================================================ */
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

/* ================================================================
   MAIN PAGE
   ================================================================ */
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
      transition: { duration: 0.6, ease: 'easeOut' as const },
    },
  };

  return (
    <div className="min-h-screen overflow-x-hidden relative bg-[var(--color-background)] text-[var(--color-on-surface)] font-[var(--font-sans)]">
      <DotGrid />

      {/* top ambient tint */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, var(--color-primary-container) 0%, transparent 70%)',
        }}
      />

      {/* ================= NAV ================= */}
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

      {/* ================= HERO ================= */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 pt-20 pb-20"
      >
        {/* status badge */}
        <motion.div variants={itemVariants} className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--color-outline-variant)] bg-white/70 backdrop-blur text-xs font-semibold tracking-wide text-[var(--color-on-surface-variant)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online · YOLOv8 + FaceNet + CLIP
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* left: copy */}
          <div className="text-center lg:text-left">
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 font-[var(--font-display)]"
            >
              Intelligent
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">
                Surveillance
              </span>
              <span className="block text-2xl md:text-3xl font-medium tracking-wide text-[var(--color-on-surface-variant)] mt-3">
                Automated Reality.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="max-w-xl mx-auto lg:mx-0 text-base md:text-lg mb-10 leading-relaxed text-[var(--color-on-surface-variant)]"
            >
              Transform traditional CCTV into proactive, intelligent security
              networks using YOLOv8, FaceNet, and real-time WebSocket streaming —
              with instant multi-channel alerts.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-4 justify-center lg:justify-start mb-12"
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
                className="px-8 py-4 font-semibold text-[15px] rounded-full text-[var(--color-on-surface)] bg-white border border-[var(--color-outline)] hover:border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container)] hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-2"
              >
                <Lock className="w-5 h-5 text-[var(--color-on-surface-variant)]" />
                Operator Login
              </button>
            </motion.div>

            {/* stats */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-8 justify-center lg:justify-start"
            >
              {stats.map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <div className="text-2xl md:text-3xl font-extrabold text-[var(--color-primary)] font-[var(--font-display)]">
                    {s.value}
                  </div>
                  <div className="text-xs md:text-sm text-[var(--color-on-surface-variant)] tracking-wide uppercase">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* right: radar visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center"
          >
            <RadarVisual />
          </motion.div>
        </div>

        {/* boot terminal */}
        <motion.div variants={itemVariants}>
          <BootTerminal />
        </motion.div>

        {/* ================= FEATURE CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.12,
                  ease: 'easeOut',
                }}
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
      </motion.main>

      {/* ================= FOOTER ================= */}
      <footer className="relative z-10 border-t border-[var(--color-outline-variant)] py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
        © {new Date().getFullYear()} AI Surviallance System · Final Year Project
      </footer>
    </div>
  );
};

export default LandingPage;