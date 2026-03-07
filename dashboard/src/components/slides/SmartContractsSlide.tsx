'use client'

import SlideLayout from './SlideLayout'

export default function SmartContractsSlide() {
  return (
    <SlideLayout>
      <h2 className="text-5xl font-bold text-white mb-3">Smart Contracts</h2>
      <p className="text-2xl text-green-400 mb-10">
        90 Tests, 5 Suites, All Passing
      </p>

      <div className="grid grid-cols-3 gap-8 mb-8">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8">
          <h3 className="font-mono text-white font-semibold text-lg mb-2">
            SentinelGuardian.sol
          </h3>
          <p className="text-sm text-green-400 mb-4">47 tests</p>
          <ul className="text-lg text-gray-400 space-y-2">
            <li>AccessControl + Pausable</li>
            <li>Policy enforcement engine</li>
            <li>Circuit breaker</li>
            <li>Rate limiting + daily volume</li>
            <li>Incident log (bounded)</li>
            <li>Freeze / Unfreeze / Revoke</li>
          </ul>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8">
          <h3 className="font-mono text-white font-semibold text-lg mb-2">
            PolicyLib.sol
          </h3>
          <p className="text-sm text-gray-400 mb-4">Pure validation library</p>
          <ul className="text-lg text-gray-400 space-y-2">
            <li>checkValue()</li>
            <li>checkTarget()</li>
            <li>checkFunction()</li>
            <li>checkRateLimit()</li>
            <li>checkDailyVolume()</li>
            <li>checkMintAmount()</li>
            <li>checkReserves() — PoR</li>
          </ul>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8">
          <h3 className="font-mono text-white font-semibold text-lg mb-2">
            AgentRegistry.sol
          </h3>
          <p className="text-sm text-green-400 mb-4">10 tests</p>
          <ul className="text-lg text-gray-400 space-y-2">
            <li>Agent registration</li>
            <li>Metadata storage</li>
            <li>Enumeration support</li>
            <li>Ownable access control</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8">
          <h3 className="font-mono text-white font-semibold text-lg mb-2">
            Challenge.t.sol
          </h3>
          <p className="text-sm text-green-400 mb-4">15 tests</p>
          <ul className="text-lg text-gray-400 space-y-2">
            <li>Severity classification</li>
            <li>Appeal flow &amp; resolution</li>
            <li>Challenge window expiry</li>
          </ul>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8">
          <h3 className="font-mono text-white font-semibold text-lg mb-2">
            ProofOfReserves.t.sol
          </h3>
          <p className="text-sm text-green-400 mb-4">10 tests</p>
          <ul className="text-lg text-gray-400 space-y-2">
            <li>Reserve verification</li>
            <li>Cumulative drain prevention</li>
            <li>Collateral ratio checks</li>
          </ul>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8">
          <h3 className="font-mono text-white font-semibold text-lg mb-2">
            Integration.t.sol
          </h3>
          <p className="text-sm text-green-400 mb-4">8 tests</p>
          <ul className="text-lg text-gray-400 space-y-2">
            <li>Full lifecycle flows</li>
            <li>Register &rarr; deny &rarr; freeze</li>
            <li>Challenge &rarr; resolve</li>
          </ul>
        </div>
      </div>
    </SlideLayout>
  )
}
