'use client'

import SlideLayout from './SlideLayout'

export default function SmartContractsSlide() {
  return (
    <SlideLayout>
      <h2 className="text-4xl font-bold text-white mb-2">Smart Contracts</h2>
      <p className="text-xl text-green-400 mb-8">
        61 Tests, 3 Suites, All Passing
      </p>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
          <h3 className="font-mono text-white font-semibold mb-2">
            SentinelGuardian.sol
          </h3>
          <p className="text-xs text-green-400 mb-3">45 tests</p>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>AccessControl + Pausable</li>
            <li>Policy enforcement engine</li>
            <li>Circuit breaker</li>
            <li>Rate limiting</li>
            <li>Incident log (bounded)</li>
            <li>Freeze / Unfreeze / Revoke</li>
          </ul>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
          <h3 className="font-mono text-white font-semibold mb-2">
            PolicyLib.sol
          </h3>
          <p className="text-xs text-gray-400 mb-3">Pure validation library</p>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>checkValue()</li>
            <li>checkTarget()</li>
            <li>checkFunction()</li>
            <li>checkRateLimit()</li>
            <li>checkMintAmount()</li>
            <li>checkAll() composite</li>
          </ul>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
          <h3 className="font-mono text-white font-semibold mb-2">
            AgentRegistry.sol
          </h3>
          <p className="text-xs text-green-400 mb-3">8 tests</p>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>Agent registration</li>
            <li>Metadata storage</li>
            <li>Enumeration support</li>
            <li>Ownable access control</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="font-mono text-white font-semibold mb-2">
          Integration.t.sol
        </h3>
        <p className="text-xs text-green-400 mb-3">8 tests</p>
        <div className="grid grid-cols-4 gap-3 text-xs text-gray-400">
          <span>Full approval flow</span>
          <span>Full denial flow</span>
          <span className="text-red-400 font-semibold">Infinite mint blocked</span>
          <span>Freeze prevents verdicts</span>
          <span>Unfreeze re-enables</span>
          <span>Small mint allowed</span>
          <span>Multiple approved then denied</span>
          <span>Registry + Guardian wiring</span>
        </div>
      </div>
    </SlideLayout>
  )
}
