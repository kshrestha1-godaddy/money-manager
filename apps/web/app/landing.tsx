import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <div className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="text-center lg:text-left lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
                {/* Left side - Text content */}
                <div className="lg:col-span-4">
                  <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl lg:text-4xl xl:text-5xl">
                    <span className="block">The only app that</span>
                    <span className="block text-gray-800">gets your money</span>
                    <span className="block text-gray-800">into shape</span>
                  </h1>
                  <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                    Manage your money on the go. Track your income, expenses, and budgets with beautiful charts and simple tools. All your finances, in one place.
                  </p>
                  <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                    <div className="rounded-md shadow">
                      <Link
                        href="/signin"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 md:py-4 md:text-lg md:px-10 transition-all duration-200"
                      >
                        Get Started
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Right side - Extra large screenshots */}
                <div className="mt-12 relative lg:mt-0 lg:col-span-8">
                  <div className="relative mx-auto w-full">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -mt-32 -mr-32 w-96 h-96 bg-gradient-to-br from-green-100 to-green-200 rounded-full opacity-20 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-80 h-80 bg-gradient-to-tr from-gray-100 to-gray-200 rounded-full opacity-15 blur-3xl"></div>
                    
                    {/* Main dashboard screenshot - Extra large */}
                    <div className="relative z-20 mb-12">
                      <img
                        src="/monthlyTrend.jpg"
                        alt="MoneyManager Dashboard - Monthly Trends and Analytics"
                        className="w-full max-w-6xl mx-auto rounded-3xl shadow-2xl border border-gray-200 hover:shadow-3xl transition-shadow duration-300"
                      />
                      <div className="absolute -bottom-6 -right-6 bg-green-500 text-white px-6 py-3 rounded-full text-base font-semibold shadow-lg">
                        Dashboard
                      </div>
                    </div>

                    {/* Secondary screenshots in a larger grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                      {/* Income tracking - Much larger */}
                      <div className="relative group">
                        <img
                          src="/income.jpg"
                          alt="Income Tracking Interface"
                          className="w-full max-w-3xl mx-auto rounded-2xl shadow-xl border border-gray-200 group-hover:shadow-2xl transition-shadow duration-300 transform group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute -top-4 -left-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                          Income Tracking
                        </div>
                      </div>

                      {/* Category trends - Much larger */}
                      <div className="relative group">
                        <img
                          src="/categoryTrend.jpg"
                          alt="Category Trends and Spending Analysis"
                          className="w-full max-w-3xl mx-auto rounded-2xl shadow-xl border border-gray-200 group-hover:shadow-2xl transition-shadow duration-300 transform group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute -top-4 -right-4 bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                          Analytics & Trends
                        </div>
                      </div>
                    </div>

                    {/* Feature highlights overlay */}
                    <div className="absolute top-1/4 -left-12 bg-white rounded-xl shadow-lg p-6 border border-gray-200 hidden xl:block">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span className="text-base font-medium text-gray-700">Real-time tracking</span>
                      </div>
                    </div>

                    <div className="absolute bottom-1/3 -right-12 bg-white rounded-xl shadow-lg p-6 border border-gray-200 hidden xl:block">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        <span className="text-base font-medium text-gray-700">Beautiful charts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Get started with MoneyManager in just a few simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="relative">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
                  <span className="text-2xl font-bold text-green-600">1</span>
                </div>
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  Step 1
                </div>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Connect Your Accounts</h3>
              <p className="mt-4 text-gray-600">
                Securely link your bank accounts and credit cards to automatically track your transactions.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="relative">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-100 rounded-full">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  Step 2
                </div>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Understand Your Habits</h3>
              <p className="mt-4 text-gray-600">
                Analyze your spending patterns with beautiful charts and insights to understand where your money goes.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="relative">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-purple-100 rounded-full">
                  <span className="text-2xl font-bold text-purple-600">3</span>
                </div>
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                  Step 3
                </div>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Take Control</h3>
              <p className="mt-4 text-gray-600">
                Set budgets, track goals, and make informed decisions to achieve your financial objectives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Everything you need to manage your finances
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Powerful features designed to help you take control of your money
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 - Investment Portfolio */}
            <div className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Investment Portfolio</h3>
              <p className="text-gray-600">
                Track stocks, crypto, mutual funds, bonds, real estate, gold, and fixed deposits with gain/loss analysis.
              </p>
            </div>

            {/* Feature 2 - Advanced Analytics */}
            <div className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Advanced Analytics</h3>
              <p className="text-gray-600">
                Waterfall charts, monthly trends, category breakdowns, and pie charts for deep financial insights.
              </p>
            </div>

            {/* Feature 3 - Debt Tracking */}
            <div className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Debt Tracking</h3>
              <p className="text-gray-600">
                Track money you've lent to others with interest calculations, repayment schedules, and due dates.
              </p>
            </div>

            {/* Feature 4 - Historical Comparisons */}
            <div className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.061a1.125 1.125 0 0 1 0-1.954l7.108-4.061A1.125 1.125 0 0 1 21 8.689v8.122ZM11.25 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.061a1.125 1.125 0 0 1 0-1.954l7.108-4.061a1.125 1.125 0 0 1 1.683.977v8.122Z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Historical Comparisons</h3>
              <p className="text-gray-600">
                Compare spending patterns across different time periods to identify trends and changes in your habits.
              </p>
            </div>

            {/* Feature 5 - Net Worth Tracking */}
            <div className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Net Worth Tracking</h3>
              <p className="text-gray-600">
                Calculate your total net worth by combining bank accounts, investments, and money lent minus liabilities.
              </p>
            </div>

            {/* Feature 6 - Multiple Currencies & Reports */}
            <div className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Reports & Multi-Currency</h3>
              <p className="text-gray-600">
                Generate PDF reports and manage finances in multiple currencies for international users and travelers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Why people use MoneyManager
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-gray-600 mb-6">
                "The app works intuitively, it makes it super easy to control your money. It helps me to develop healthy spending habits."
              </p>
              <div className="font-semibold text-gray-900">Roy</div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-gray-600 mb-6">
                "I am using this app for more than two years and I could not be happier with the service I got."
              </p>
              <div className="font-semibold text-gray-900">Marek</div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-gray-600 mb-6">
                "I've tried other money tracking apps before MoneyManager, but I choose to stick to this because of its simplicity and intuitive design."
              </p>
              <div className="font-semibold text-gray-900">Harriet</div>
            </div>
          </div>
        </div>
      </section>

      {/* Press Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">They wrote about us</h2>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-2xl font-bold text-gray-400">THE VERGE</div>
              <div className="text-xl font-semibold text-gray-400">BUSINESS INSIDER</div>
              <div className="text-xl font-serif text-gray-400">THE WALL STREET JOURNAL</div>
              <div className="text-xl font-bold text-gray-400">lifehacker</div>
              <div className="text-xl font-bold text-gray-400">NBC NEWS</div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Get monthly money tips and
          </h2>
          <h3 className="text-3xl font-extrabold text-gray-700 mb-8">
            stay on top of your finance
          </h3>
          
          <div className="max-w-md mx-auto">
            <div className="flex gap-4">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button className="px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors">
                Subscribe
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              I have read and agree with the <a href="#" className="text-green-600 hover:underline">Terms & Conditions</a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-800">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to take control?</span>
            <span className="block">Start managing your money today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-gray-300">
            Join thousands of users who have already transformed their financial lives.
          </p>
          <Link
            href="/signin"
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-gray-800 bg-white hover:bg-gray-50 sm:w-auto transition-all duration-200"
          >
            Get Started for Free
          </Link>
        </div>
      </section>
    </main>
  );
} 