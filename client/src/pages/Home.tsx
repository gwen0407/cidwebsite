import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Mail,
  Calendar,
  ClipboardList,
  Database,
  BarChart2,
  Palette,
  Share2,
  CheckCircle2,
  ArrowRight,
  Star,
  Instagram,
  Facebook,
  Linkedin,
  Zap,
  Shield,
  Clock,
} from "lucide-react";

const services = [
  { icon: Mail, title: "Email & Calendar Management", desc: "Inbox zero, scheduling, and follow-ups handled with precision." },
  { icon: ClipboardList, title: "Task & Project Management", desc: "End-to-end project coordination so nothing slips through the cracks." },
  { icon: Database, title: "Data Entry & Research", desc: "Accurate data processing and deep-dive research on demand." },
  { icon: BarChart2, title: "Email Marketing", desc: "Campaigns crafted, sent, and optimised for maximum engagement." },
  { icon: Share2, title: "Social Media Marketing", desc: "Content calendars, posting schedules, and community management." },
  { icon: Palette, title: "Graphic Design", desc: "On-brand visuals for every platform, delivered fast." },
];

const testimonials = [
  { name: "Sarah Chen", role: "Founder, Bloom Studio", quote: "Consider It Done transformed how I run my business. I reclaimed 20 hours a week and finally have time to focus on growth.", rating: 5 },
  { name: "Marcus Williams", role: "CEO, NovaTech", quote: "The team is incredibly professional and proactive. They anticipate my needs before I even ask. Absolutely worth every cent.", rating: 5 },
  { name: "Priya Nair", role: "Marketing Director", quote: "From inbox management to campaign execution — they handle it all flawlessly. My stress levels have never been lower.", rating: 5 },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Auto-redirect authenticated users to their respective dashboards
  useEffect(() => {
    if (!loading && user) {
      setLocation(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, loading, setLocation]);

  const handleGetStarted = () => {
    window.location.href = "https://form.typeform.com/to/jbsO92e4";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ================================================================
          NAVIGATION
      ================================================================ */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md animate-in fade-in duration-500">
        <div className="container flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <CheckCircle2 className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base tracking-tight">Consider It Done</span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
              <a href="#services" className="hover:text-foreground transition-colors duration-300 hover:underline">Services</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors duration-300 hover:underline">Testimonials</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button size="sm" onClick={() => setLocation(user.role === "admin" ? "/admin" : "/dashboard")}>
                Go to Dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = getLoginUrl()} className="hover:bg-primary/10 transition-all duration-300">Sign In</Button>
                <Button size="sm" onClick={handleGetStarted} className="hover:shadow-lg transition-all duration-300">Get Started</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================
          HERO
      ================================================================ */}
      <section className="relative pt-32 pb-24 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-secondary/10 blur-3xl" />
        </div>

        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
              Virtual Assistant Services
            </Badge>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
              Your Virtual Assistant,{" "}
              <span className="relative">
                <span className="relative z-10" style={{
                  background: "linear-gradient(135deg, oklch(0.26 0.07 255) 0%, oklch(0.82 0.12 85) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>Always Ready</span>
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Delegate your most time-consuming tasks to a dedicated virtual assistant team. Reclaim your time, reduce stress, and focus on what truly matters.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" onClick={handleGetStarted}>
                Get Started Today <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base hover:bg-primary/5 transition-all duration-300" asChild>
                <a href="#services">Explore Services</a>
              </Button>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-secondary" /><span>Fast onboarding</span></div>
              <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-secondary" /><span>100% confidential</span></div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-secondary" /><span>Flexible hours</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SERVICES
      ================================================================ */}
      <section id="services" className="py-24 bg-muted/30 animate-in fade-in duration-700 delay-200">
        <div className="container">
          <div className="text-center mb-14 px-4 sm:px-0">
            <Badge variant="outline" className="mb-4 text-xs font-medium uppercase tracking-wide">What We Do</Badge>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">Everything You Need, Done Right</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">From inbox management to creative design, our virtual assistants handle it all with expertise and care.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, idx) => (
              <div key={s.title} className="group bg-card rounded-2xl p-7 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${100 + idx * 50}ms` }}>
                <div className="h-11 w-11 rounded-xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          TESTIMONIALS
      ================================================================ */}
      <section id="testimonials" className="py-24 animate-in fade-in duration-700 delay-300">
        <div className="container">
          <div className="text-center mb-14 px-4 sm:px-0">
            <Badge variant="outline" className="mb-4 text-xs font-medium uppercase tracking-wide">Testimonials</Badge>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">What Our Clients Say</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">Trusted by entrepreneurs and business leaders worldwide.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, idx) => (
              <div key={t.name} className="bg-card rounded-2xl p-7 border border-border hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${150 + idx * 100}ms` }}>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA BANNER
      ================================================================ */}
      <section className="py-20 animate-in fade-in duration-700 delay-300">
        <div className="container">
          <div className="relative rounded-3xl bg-primary px-8 py-16 text-center overflow-hidden">
            <div className="absolute inset-0 -z-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-secondary/20 blur-2xl" />
            </div>
            <div className="relative z-10">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">Ready to Reclaim Your Time?</h2>
              <p className="text-primary-foreground/75 mb-8 max-w-xl mx-auto">Join hundreds of leaders who have optimized their workflows with Consider It Done.</p>
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-10 h-12 text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" onClick={handleGetStarted}>
                Get Started Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER
      ================================================================ */}
      <footer className="border-t border-border py-12 animate-in fade-in duration-700 delay-300">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">Consider It Done</span>
            </div>

            <nav className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#services" className="hover:text-foreground transition-colors duration-300 hover:underline">Services</a>
              <a href="#testimonials" className="hover:text-foreground transition-colors duration-300 hover:underline">Testimonials</a>
            </nav>

            <div className="flex items-center gap-4">
              <a href="#" className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300 hover:scale-110 hover:bg-primary/5">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300 hover:scale-110 hover:bg-primary/5">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300 hover:scale-110 hover:bg-primary/5">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Consider It Done, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
