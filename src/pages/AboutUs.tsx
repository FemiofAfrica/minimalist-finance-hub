import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Users, Target, Heart, Globe, Shield, Zap } from 'lucide-react';
import NavBar from "@/components/ui/NavBar";

const AboutUs: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#e8f1df]">
      {/* Navigation Bar */}
      <NavBar
        isAuthenticated={false}
        showFeatures={false}
      />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-8 text-center relative bg-[#e8f1df]">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold max-w-4xl mx-auto mb-6 leading-tight">
            About <span className="text-green-700">Kpege</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed">
            We're on a mission to make financial management simple, accessible, and stress-free for everyone.
            Kpege is a product of Ingenious Resources International Limited, dedicated to democratizing
            personal finance management.
          </p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">Our Story</h2>
              <div className="w-16 h-1 bg-green-700 mx-auto mb-6"></div>
            </div>

            <div className="prose prose-lg max-w-none text-center">
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                Kpege was born from a simple observation: managing personal finances shouldn't require a
                degree in accounting or hours of manual data entry. Too many people struggle with basic
                financial tracking, not because they lack the desire to be financially responsible, but
                because the tools available are either too complex or too rigid.
              </p>

              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                Our founders experienced this frustration firsthand. After trying countless budgeting apps,
                spreadsheets, and financial tools, they realized there was a fundamental gap in the market:
                a tool that could understand and adapt to how people naturally think and talk about money.
              </p>

              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
                That's why we built Kpege - to bridge the gap between complex financial software and
                simple, everyday money management. We believe that everyone deserves to feel confident
                and in control of their finances, without needing to become a financial expert.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission & Values Section */}
      <section className="py-16 md:py-20 bg-[#e8f1df]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">Our Mission & Values</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Everything we do is guided by our core mission and the values that drive us forward.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Card className="p-6 md:p-8 text-center transition-all hover:translate-y-[-2px] hover:shadow-lg">
              <div className="rounded-full bg-green-100 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                <Target className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Our Mission</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                To democratize financial management by making it as simple as having a conversation about money.
              </p>
            </Card>

            <Card className="p-6 md:p-8 text-center transition-all hover:translate-y-[-2px] hover:shadow-lg">
              <div className="rounded-full bg-green-100 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                <Heart className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Simplicity First</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                We believe that the best financial tools are the ones you actually want to use every day.
              </p>
            </Card>

            <Card className="p-6 md:p-8 text-center transition-all hover:translate-y-[-2px] hover:shadow-lg">
              <div className="rounded-full bg-green-100 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                <Globe className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Global Accessibility</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Financial management should work for everyone, regardless of location, currency, or background.
              </p>
            </Card>

            <Card className="p-6 md:p-8 text-center transition-all hover:translate-y-[-2px] hover:shadow-lg">
              <div className="rounded-full bg-green-100 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                <Shield className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Privacy & Security</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Your financial data is yours. We protect it with bank-level security and transparent practices.
              </p>
            </Card>

            <Card className="p-6 md:p-8 text-center transition-all hover:translate-y-[-2px] hover:shadow-lg">
              <div className="rounded-full bg-green-100 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                <Zap className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Innovation</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                We leverage cutting-edge AI and technology to make financial insights more accessible than ever.
              </p>
            </Card>

            <Card className="p-6 md:p-8 text-center transition-all hover:translate-y-[-2px] hover:shadow-lg">
              <div className="rounded-full bg-green-100 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                <Users className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Community-Driven</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Our users' feedback and needs drive every feature we build and every decision we make.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Kpege Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 md:mb-8">Why Kpege?</h2>
            <div className="w-16 h-1 bg-green-700 mx-auto mb-8"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-left">
              <div>
                <h3 className="text-xl md:text-2xl font-bold mb-4 text-green-700">The Problem</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Traditional financial apps are complex and intimidating
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Manual data entry is time-consuming and error-prone
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Most tools don't support global currencies effectively
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    People give up on budgeting because it's too much work
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-bold mb-4 text-green-700">Our Solution</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Natural language processing for effortless expense tracking
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    AI-powered receipt scanning and categorization
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Support for 40+ global currencies with live conversion
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Insights that help you understand and improve your habits
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-20 bg-[#e8f1df]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">Our Team</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We're a diverse team of technologists, designers, and financial wellness advocates
              united by a shared passion for making money management accessible to everyone.
            </p>
          </div>

          <div className="max-w-4xl mx-auto text-center">
            <Card className="p-8 md:p-12">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-green-200 mb-6 flex items-center justify-center">
                  <Users className="h-10 w-10 md:h-12 md:w-12 text-green-700" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-4">Building Something Special</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Our team combines expertise in artificial intelligence, user experience design,
                  financial services, and global markets. We're distributed across multiple time zones
                  but united by our commitment to creating the most intuitive financial management
                  experience possible.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Every team member brings unique perspectives from their own financial journeys,
                  ensuring that Kpege works for people from all walks of life.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-green-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 leading-tight">
            Ready to Join Our Mission?
          </h2>
          <p className="text-base sm:text-lg md:text-xl max-w-3xl mx-auto mb-6 md:mb-8 leading-relaxed">
            Help us make financial management simple and accessible for everyone.
            Start your journey with Kpege today.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-white text-green-700 hover:bg-gray-100 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium">
                Get Started Now
              </Button>
            </Link>
            <Link to="/" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white text-black hover:bg-text-green hover:text-green-700 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-10 bg-slate-900 text-slate-300">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <img src="/kpege-logo-light.svg" alt="Kpege" className="h-6 md:h-8 mb-2 md:mb-3" />
              <p className="max-w-xs text-xs md:text-sm text-slate-400 leading-relaxed">
                Making financial management simple and effortless.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              <div>
                <h4 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Product</h4>
                <ul className="space-y-1 md:space-y-1.5">
                  <li><Link to="/" className="text-xs hover:text-white transition-colors">Features</Link></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Security</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Company</h4>
                <ul className="space-y-1 md:space-y-1.5">
                  <li><Link to="/about" className="text-xs hover:text-white transition-colors">About</Link></li>
                  <li><Link to="/blog" className="text-xs hover:text-white transition-colors">Blog</Link></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Careers</a></li>
                </ul>
              </div>

              <div className="col-span-2 md:col-span-1">
                <h4 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Resources</h4>
                <ul className="space-y-1 md:space-y-1.5">
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Contact</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Privacy</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-8 pt-4 md:pt-6 flex flex-col md:flex-row justify-between items-center border-t border-slate-800">
            <p className="text-xs">© 2026 Ingenious Resources International Limited. All rights reserved.</p>
            <div className="flex space-x-4 mt-3 md:mt-0">
              <a href="https://x.com/usekpege" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                </svg>
              </a>
              <a href="https://www.instagram.com/usekpege" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs; 