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
]

export default function AppScreenshots() {
  return (
    <section id="app" className="pt-16 pb-12 px-6 md:px-8 bg-anewluv-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-anewluv-strong mb-4">See It In Action</h2>
        <p className="text-xl text-anewluv-medium text-center mb-16 max-w-2xl mx-auto">
          Everything you need to find, connect, and build meaningful relationships.
        </p>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
          {screens.map((screen, i) => (
            <div key={i} className="bg-anewluv-surface rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition flex flex-col">
              <div className="phone-mockup" style={{maxWidth: '100%', padding: '8px', background: '#111', borderRadius: '28px', width: '100%', minHeight: '480px'}}>
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