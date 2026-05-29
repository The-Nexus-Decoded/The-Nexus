import React from 'react'

const screens = [
  {
    title: 'Discovery',
    description: 'Find your match with our personality-based algorithm',
    image: '02-home-picked.png',
  },
  {
    title: 'Compatibility',
    description: 'See why you match with detailed compatibility insights',
    image: '06-isaiah-why-you-match.png',
  },
  {
    title: 'Billing',
    description: 'Manage your subscription and payment settings',
    image: 'settings-screenshot-20260526.png',
  },
  {
    title: 'Entitlements',
    description: 'View your tier benefits, boosts, and premium features',
    image: 'entitlements-screen-ref-20260529.png',
  },
  {
    title: 'Rewards',
    description: 'Earn hearts and unlock premium features as you engage',
    image: 'settings-rewards-badge-expanded.png',
  },
  {
    title: 'Instant Messages',
    description: 'Skip the queue with priority messaging power',
    image: 'instant-msg.png',
  },
  {
    title: 'Profile Boosts',
    description: 'Get seen by more people with a quick boost',
    image: 'boost.png',
  },
  {
    title: 'Daily Hearts',
    description: 'Earn hearts just for logging in each day',
    image: 'daily-hearts.png',
  },
  {
    title: 'VIP Access',
    description: 'Unlock exclusive perks and priority visibility',
    image: 'vip-access.png',
  },
]

export default function AppScreenshots() {
  return (
    <section id="app" className="pt-16 pb-12 px-6 md:px-8 bg-anewluv-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-anewluv-strong mb-4">See It In Action</h2>
        <p className="text-xl text-anewluv-medium text-center mb-16 max-w-2xl mx-auto">
          Everything you need to find, connect, and build meaningful relationships.
        </p>
        {/* Row 1: 5 feature cards */}
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 mb-4">
          {screens.slice(0, 5).map((screen, i) => (
            <div key={i} className="bg-anewluv-surface rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition flex flex-col">
              <div className="phone-mockup" style={{maxWidth: '100%', padding: '8px', background: '#111', borderRadius: '28px', width: '100%', minHeight: '420px'}}>
                <img
                  src={`/images/${screen.image}`}
                  alt={screen.title}
                  className="rounded-2xl w-full h-full object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
              <div className="p-3 mt-auto">
                <h3 className="font-bold text-anewluv-strong text-sm">{screen.title}</h3>
                <p className="text-xs text-anewluv-medium mt-1">{screen.description}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Row 2: 4 rewards cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {screens.slice(5).map((screen, i) => (
            <div key={i + 5} className="bg-anewluv-surface rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition flex flex-col">
              <div className="phone-mockup" style={{maxWidth: '100%', padding: '8px', background: '#111', borderRadius: '28px', width: '100%', minHeight: '340px'}}>
                <img
                  src={`/images/${screen.image}`}
                  alt={screen.title}
                  className="rounded-2xl w-full h-full object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
              <div className="p-3 mt-auto">
                <h3 className="font-bold text-anewluv-strong text-sm">{screen.title}</h3>
                <p className="text-xs text-anewluv-medium mt-1">{screen.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}