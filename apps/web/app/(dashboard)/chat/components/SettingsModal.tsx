"use client";

import { ChatSettings } from "../types/chat";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatSettings: ChatSettings;
  setChatSettings: React.Dispatch<React.SetStateAction<ChatSettings>>;
}

export function SettingsModal({ isOpen, onClose, chatSettings, setChatSettings }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Chat Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <select
                value={chatSettings.model}
                onChange={(e) => setChatSettings(prev => ({ ...prev, model: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {chatSettings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={chatSettings.temperature}
                onChange={(e) => setChatSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Focused (0)</span>
                <span>Balanced (1)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            {/* Max Output Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Output Tokens</label>
              <input
                type="number"
                min="1"
                max="8192"
                value={chatSettings.max_output_tokens}
                onChange={(e) => setChatSettings(prev => ({ ...prev, max_output_tokens: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Top P */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Top P: {chatSettings.top_p}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={chatSettings.top_p}
                onChange={(e) => setChatSettings(prev => ({ ...prev, top_p: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Top Logprobs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Top Logprobs</label>
              <input
                type="number"
                min="0"
                max="20"
                value={chatSettings.top_logprobs}
                onChange={(e) => setChatSettings(prev => ({ ...prev, top_logprobs: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Service Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Tier</label>
              <select
                value={chatSettings.service_tier}
                onChange={(e) => setChatSettings(prev => ({ ...prev, service_tier: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Auto</option>
                <option value="default">Default</option>
                <option value="flex">Flex</option>
                <option value="priority">Priority</option>
              </select>
            </div>

            {/* Truncation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Truncation</label>
              <select
                value={chatSettings.truncation}
                onChange={(e) => setChatSettings(prev => ({ ...prev, truncation: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Auto</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Safety Identifier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Safety Identifier</label>
              <input
                type="text"
                value={chatSettings.safety_identifier}
                onChange={(e) => setChatSettings(prev => ({ ...prev, safety_identifier: e.target.value }))}
                placeholder="Optional safety identifier"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Boolean Options */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chatSettings.stream}
                  onChange={(e) => setChatSettings(prev => ({ ...prev, stream: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Stream Response</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chatSettings.parallel_tool_calls}
                  onChange={(e) => setChatSettings(prev => ({ ...prev, parallel_tool_calls: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Parallel Tool Calls</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chatSettings.store}
                  onChange={(e) => setChatSettings(prev => ({ ...prev, store: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Store Response</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chatSettings.reasoning}
                  onChange={(e) => setChatSettings(prev => ({ ...prev, reasoning: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Enable Reasoning</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
