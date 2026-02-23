import Link from "next/link";
import { BookOpen, Users, CheckCircle2 } from "lucide-react";

export default function MarketingLanding() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Navbar */}
      <nav className="navbar bg-[#fafafa]/95 backdrop-blur-sm border-b border-[#e5e7eb] sticky top-0 z-30 px-4 sm:px-6">
        <div className="container mx-auto px-0 flex w-full items-center justify-between">
          <div>
            <Link href="/" className="btn btn-ghost text-xl font-heading font-bold gap-2">
              <span className="text-primary">Kyston</span>
              <span className="text-secondary font-bold"> LMS</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pricing" className="btn btn-ghost rounded-xl font-body">Pricing</Link>
            <Link href="/login" className="btn btn-ghost rounded-xl font-body">Log in</Link>
            <Link href="/register" className="btn btn-primary rounded-xl font-body">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-[90vh] bg-gradient-to-br from-neutral via-primary/90 to-secondary/60 flex items-center relative overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center relative z-10">
          <div>
            <span className="badge badge-secondary badge-outline mb-6 font-body text-sm px-4 py-3 rounded-xl">
              Built for Churches
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6">
              The LMS your<br />
              <span className="text-secondary">congregation</span><br />
              deserves.
            </h1>
            <p className="font-body text-white/80 text-base sm:text-lg mb-8 sm:mb-10 max-w-md">
              Kyston LMS makes it simple for any church to create courses, manage students, and host live classes — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href="/register" className="btn btn-secondary btn-lg rounded-2xl font-body font-semibold px-8 w-full sm:w-auto min-h-[48px] justify-center">
                Get Started Free
              </Link>
              <Link href="/pricing" className="btn btn-outline border-white/30 text-white hover:bg-white/10 btn-lg rounded-2xl font-body w-full sm:w-auto min-h-[48px] justify-center">
                See pricing →
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="card bg-white/10 backdrop-blur border border-white/20 rounded-2xl shadow-lg p-6 transition-shadow duration-200">
              <div className="rounded-xl bg-base-100/20 h-64 flex items-center justify-center font-body text-white/60">
                Dashboard preview
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 md:py-20 bg-[#f8f9fa]">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-center text-base-content mb-2">Everything you need</h2>
          <p className="font-body text-base-content/70 text-center max-w-xl mx-auto mb-8 sm:mb-12 text-sm sm:text-base">
            From small groups to church-wide programs, Kyston keeps learning organized and accessible.
          </p>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="card-body">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold">Programs & courses</h3>
                <p className="font-body text-sm text-base-content/70">Organize content into programs and courses. Set prerequisites and publish when ready.</p>
              </div>
            </div>
            <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="card-body">
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="font-heading text-lg font-semibold">Roles & permissions</h3>
                <p className="font-body text-sm text-base-content/70">Admins, facilitators, and students. Invite by email and manage access in one place.</p>
              </div>
            </div>
            <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="card-body">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-heading text-lg font-semibold">Activities & progress</h3>
                <p className="font-body text-sm text-base-content/70">Videos, quizzes, uploads, and more. Track completion and grades per class.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-16 bg-[#f1f3f5] border-y border-[#e5e7eb]">
        <div className="container mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl font-bold text-base-content mb-4">Simple, transparent pricing</h2>
          <p className="font-body text-base-content/70 max-w-lg mx-auto mb-8">
            Start free. Upgrade when your church grows. No hidden fees.
          </p>
          <Link href="/pricing" className="btn btn-primary btn-lg rounded-2xl font-body">
            View plans
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary to-secondary py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="font-body text-white/90 max-w-lg mx-auto mb-8">
            Join churches using Kyston to deliver learning that fits their community.
          </p>
          <Link href="/register" className="btn btn-secondary btn-lg rounded-2xl font-body font-semibold px-8 text-secondary-content">
            Register your church — free to start
          </Link>
        </div>
      </section>

      {/* Footer - dark */}
      <footer className="bg-[#1a1a2e] text-[#e2e8f0] py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-center">
            <Link href="/" className="font-heading text-2xl font-bold">
              <span className="text-white">Kyston</span>
              <span className="text-secondary"> LMS</span>
            </Link>
            <div className="flex gap-6 font-body text-sm">
              <Link href="/" className="link link-hover text-neutral-content/80">Home</Link>
              <Link href="/pricing" className="link link-hover text-neutral-content/80">Pricing</Link>
              <Link href="/register" className="link link-hover text-neutral-content/80">Get started</Link>
            </div>
            <p className="font-body text-sm text-neutral-content/50">Kyston LMS — Learning management for churches</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
