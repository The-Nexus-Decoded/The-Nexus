import React from 'react'

const plans = [
  {
    name: 'Basic',
    price: 'Free',
    period: '',
    features: [
      'Create your profile',
      'Take the personality quiz',
      'Basic discovery features',
      'Earn in-app hearts',
      'Personality test data visible to Premium members',
    ],
    popular: false,
    cta: 'Get Started',
  },
  {
    name: 'Plus',
    color: '#3b82f6',
    colorClass: 'blue',
    price: '$4.99',
    period: '/week',
    features: [
      'Everything in Basic',
      'Personality blending in matching',
      'Personality-first sort option',
      'View others\' personality summary',
      'Priority support',
    ],
    popular: false,
    cta: 'Start Plus',
  },
  {
    name: 'Premium',
    color: '#eab308',
    colorClass: 'gold',
    price: '$14.99',
    period: '/month',
    features: [
      'Everything in Plus',
      'See who likes you',
      'Unlimited likes',
      'Personality type search filter',
      'Advanced compatibility insights',
    ],
    popular: true,
    cta: 'Go Premium',
  },
  {
    name: 'VIP',
    color: '#5a45ff',
    colorClass: 'purple',
    price: '$29.99',
    period: '/month',
    features: [
      'Everything in Premium',
      'Exclusive VIP profile badge',
      'Priority profile visibility',
      'Early access to new features',
      'VIP support SLA',
    ],
    popular: false,
    cta: 'Go VIP',
  },
]

// 4 new comparison cards to fill the space
const comparisonCards = [
  {
    icon: '💰',
    title: 'Best Value Dating App',
    subtitle: 'Why pay more for less?',
    body: 'Anewluv Plus starts at just $4.99/week. Compare that to Match at $9.99/mo, Bumble at $14.99/mo, and Tinder Gold at $39.99/mo — we give you more features at a fraction of the cost.',
    highlight: '$4.99/wk vs $39.99/mo',
  },
  {
    icon: '📊',
    title: 'Pricing vs. The Competition',
    subtitle: 'We undercut them all',
    body: 'Tinder Platinum: $49.99/mo | Bumble Premium: ~$24.99/mo | Match: $14.99/mo. Anewluv Premium at $14.99/mo gives you everything the big players offer — plus personality-first matching they can\'t match.',
    highlight: 'Up to 70% less',
  },
  {
    icon: '🏆',
    title: 'Rich Profile & Rewards',
    subtitle: 'Get rewarded for being active',
    body: 'Sign in daily, complete your profile, add photos, and send messages — earn points you can redeem for Boosts, Instant Messages, VIP access, and other perks. The more you engage, the more you get.',
    highlight: 'Earn while you date',
  },
  {
    icon: '⭐',
    title: 'Instant Perks & VIP Access',
    subtitle: 'Unlock real rewards fast',
    body: 'Points stack up quickly. Redeem for profile Boosts to get seen by more people, send Instant Messages that skip the queue, unlock VIP features, and access exclusive perks — all without a full subscription.',
    highlight: 'Points unlock perks',
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-8 bg-gradient-to-b from-anewluv-surface to-anewluv-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-anewluv-strong mb-4">Choose Your Plan</h2>
        <p className="text-xl text-anewluv-medium text-center mb-16 max-w-2xl mx-auto">
          All plans include the personality quiz. Upgrade for deeper matching.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${
                plan.popular
                  ? 'bg-gradient-to-b from-amber-400 to-yellow-500 text-white border-2 border-yellow-400 shadow-2xl scale-105'
                  : plan.colorClass === 'blue'
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white border-2 border-blue-400 shadow-lg'
                  : plan.colorClass === 'purple'
                  ? 'bg-gradient-to-b from-anewluv-primary to-violet-700 text-white border-2 border-anewluv-primary shadow-lg'
                  : 'bg-anewluv-surface border-2 border-anewluv-divider hover:border-anewluv-primary'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-amber-500 text-xs font-bold px-4 py-1 rounded-full shadow">
                  MOST POPULAR
                </div>
              )}
              {plan.colorClass === 'blue' && !plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                  PLUS
                </div>
              )}
              {plan.colorClass === 'purple' && !plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                  VIP
                </div>
              )}

              <h3 className={`text-xl font-bold mb-1 ${plan.popular || plan.colorClass ? 'text-white' : 'text-anewluv-strong'}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-4 ${plan.popular || plan.colorClass ? 'text-white/80' : 'text-anewluv-medium'}`}>
                {plan.name === 'Basic' ? 'Core features' : `Billed ${plan.period.replace('/', ' ').trim()}`}
              </p>

              <div className="mb-6">
                <span className={`text-3xl font-bold ${plan.popular || plan.colorClass ? 'text-white' : 'text-anewluv-strong'}`}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className={`text-sm ${plan.popular || plan.colorClass ? 'text-white/80' : 'text-anewluv-medium'}`}>
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className={`space-y-3 mb-8 text-sm ${plan.popular || plan.colorClass ? 'text-white/90' : 'text-anewluv-medium'}`}>
                {plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-start gap-2">
                    <span className={plan.popular ? 'text-yellow-200' : plan.colorClass === 'blue' ? 'text-blue-200' : plan.colorClass === 'purple' ? 'text-violet-200' : 'text-anewluv-secondary'}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-full font-semibold transition ${
                  plan.popular
                    ? 'bg-white text-amber-500 hover:bg-yellow-50'
                    : plan.colorClass === 'blue'
                    ? 'bg-white text-blue-500 hover:bg-blue-50'
                    : plan.colorClass === 'purple'
                    ? 'bg-white text-violet-600 hover:bg-violet-50'
                    : 'bg-anewluv-primary text-white hover:bg-violet-700'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* 4 new comparison/rewards cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {comparisonCards.map((card, i) => (
            <div key={i} className="bg-anewluv-surface border-2 border-anewluv-divider rounded-2xl p-6 hover:border-anewluv-primary hover:shadow-lg transition-all">
              <div className="text-3xl mb-3">{card.icon}</div>
              <div className="bg-anewluv-primary/10 text-anewluv-primary text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                {card.highlight}
              </div>
              <h3 className="text-lg font-bold text-anewluv-strong mb-1">{card.title}</h3>
              <p className="text-xs font-semibold text-anewluv-primary mb-3">{card.subtitle}</p>
              <p className="text-sm text-anewluv-medium leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>

        {/* CTA buttons below the cards */}
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <a href="http://app.anewluv.com" className="bg-anewluv-primary text-white px-8 py-3 rounded-full font-semibold hover:bg-violet-700 transition">
            Start Free Today
          </a>
          <a href="#features" className="border-2 border-anewluv-primary text-anewluv-primary px-8 py-3 rounded-full font-semibold hover:bg-anewluv-primary hover:text-white transition">
            See How It Works
          </a>
        </div>

        <p className="text-sm text-anewluv-light text-center mt-10 max-w-3xl mx-auto">
          All purchases are for in-app software access and premium features. Anewluv is a dating and social networking app. Stripe is used for digital app features and subscriptions only. No token sales, crypto transactions, or financial services.
        </p>
      </div>
    </section>
  )
}