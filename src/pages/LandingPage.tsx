import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-neutral-900 dark:to-neutral-950">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-emerald-500"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">MoneyWise</span>
        </div>
        <div className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors">
            Features
          </a>
          <a href="#testimonials" className="text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors">
            Testimonials
          </a>
          <a href="#pricing" className="text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors">
            Pricing
          </a>
          <Button
            variant="outline"
            className="ml-4"
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
        </div>
        <Button
          className="md:hidden"
          variant="ghost"
          size="icon"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            Take Control of Your Finances with Effortless Expense Tracking
          </h1>
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-8">
            Track, manage, and save smarter with real-time insights—your journey to financial freedom starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-lg rounded-full shadow-lg hover:shadow-emerald-200 transition-all duration-300"
              onClick={() => navigate('/login')}
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-3 text-lg rounded-full border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 transition-all duration-300"
            >
              Learn More
            </Button>
          </div>
          <div className="mt-8 flex items-center">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-emerald-400 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-white font-bold">
                  {i}
                </div>
              ))}
            </div>
            <p className="ml-4 text-slate-700 dark:text-slate-300">10K+ satisfied users</p>
          </div>
        </div>
        <div className="md:w-1/2">
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-full h-full bg-emerald-200 dark:bg-emerald-800 rounded-lg transform rotate-3"></div>
            <div className="relative bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-xl">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Expense Chart</h3>
                <select className="text-sm border rounded p-1">
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div className="h-40 mb-4 flex items-end justify-between">
                {[40, 65, 30, 70, 50, 60, 35].map((height, i) => (
                  <div key={i} className="w-8 bg-emerald-500 rounded-t" style={{ height: `${height}%` }}></div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
              <div className="mt-6 p-4 bg-slate-50 dark:bg-neutral-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Your Balance</span>
                  <span className="text-emerald-500">+4%</span>
                </div>
                <div className="text-2xl font-bold mb-1">$16,648</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Receive $3,650.00 in this month</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-neutral-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Control your financial future easily</h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-2xl mx-auto">
              Create targeted savings goals with automated transfers, monitor progress, and receive personalized savings tips.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 px-4">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-emerald-100 dark:border-neutral-700">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Custom and design your card</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Create targeted savings goals, automated transfers, monitor progress, personalized savings tips.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-emerald-100 dark:border-neutral-700">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Full Analytics in Your App</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Create targeted savings goals with automated transfers, monitor progress, receive personalized insights.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-emerald-100 dark:border-neutral-700">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Transaction History</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Create targeted savings goals with automated transfers, monitor your spending habits and transactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-slate-50 dark:bg-neutral-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Loved by thousands of users</h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-2xl mx-auto">
              See what our users are saying about how MoneyWise has transformed their financial lives.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 px-4">
            {/* Testimonial 1 */}
            <div className="bg-white dark:bg-neutral-800 p-8 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center mr-4">
                  <span className="text-emerald-700 font-bold">JD</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">John Doe</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Small Business Owner</p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300">
                "MoneyWise has completely changed how I manage my business finances. The insights and tracking features are invaluable."
              </p>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-white dark:bg-neutral-800 p-8 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-700 font-bold">JS</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Jane Smith</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Freelancer</p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300">
                "The budgeting tools have helped me stay on top of my irregular income. It's been a game-changer for my freelance work."
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white dark:bg-neutral-800 p-8 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center mr-4">
                  <span className="text-purple-700 font-bold">AK</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Alex Kim</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Student</p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300">
                "Perfect for tracking my student expenses and loans. The interface is intuitive and the insights are really helpful."
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;