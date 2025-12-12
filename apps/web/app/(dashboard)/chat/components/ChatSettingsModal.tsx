"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@repo/ui/button';

export interface ChatSettings {
  model: string;
  temperature: number;
  max_output_tokens: number;
  top_p: number;
  stream: boolean;
  parallel_tool_calls: boolean;
  store: boolean;
  reasoning: boolean;
  truncation: 'auto' | 'disabled';
  top_logprobs: number;
  safety_identifier?: string;
  service_tier: 'auto' | 'default' | 'flex' | 'priority';
}

export const defaultSettings: ChatSettings = {
  model: 'gpt-4o-mini',
  temperature: 1,
  max_output_tokens: 4096,
  top_p: 1,
  stream: true,
  parallel_tool_calls: true,
  store: false,
  reasoning: false,
  truncation: 'auto',
  top_logprobs: 0,
  service_tier: 'auto',
};

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
}

export function ChatSettingsModal({ isOpen, onClose, settings, onSettingsChange }: ChatSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<ChatSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
  };

  const updateSetting = <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">OpenAI API Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <select
              value={localSettings.model}
              onChange={(e) => updateSetting('model', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {localSettings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={localSettings.temperature}
                onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Focused (0)</span>
                <span>Balanced (1)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            {/* Top P */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Top P: {localSettings.top_p}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={localSettings.top_p}
                onChange={(e) => updateSetting('top_p', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Conservative (0)</span>
                <span>Diverse (1)</span>
              </div>
            </div>

            {/* Max Output Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Output Tokens</label>
              <input
                type="number"
                min="1"
                max="16384"
                value={localSettings.max_output_tokens}
                onChange={(e) => updateSetting('max_output_tokens', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Top Logprobs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Top Logprobs</label>
              <input
                type="number"
                min="0"
                max="20"
                value={localSettings.top_logprobs}
                onChange={(e) => updateSetting('top_logprobs', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Service Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Tier</label>
            <select
              value={localSettings.service_tier}
              onChange={(e) => updateSetting('service_tier', e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="default">Default</option>
              <option value="flex">Flex</option>
              <option value="priority">Priority</option>
            </select>
          </div>

          {/* Truncation Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Truncation Strategy</label>
            <select
              value={localSettings.truncation}
              onChange={(e) => updateSetting('truncation', e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Safety Identifier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Safety Identifier (Optional)</label>
            <input
              type="text"
              value={localSettings.safety_identifier || ''}
              onChange={(e) => updateSetting('safety_identifier', e.target.value || undefined)}
              placeholder="Enter safety identifier..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Boolean Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">Stream Response</span>
                <p className="text-sm text-gray-500">Stream tokens as they're generated</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.stream}
                  onChange={(e) => updateSetting('stream', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">Parallel Tool Calls</span>
                <p className="text-sm text-gray-500">Allow parallel function calls</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.parallel_tool_calls}
                  onChange={(e) => updateSetting('parallel_tool_calls', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">Store Response</span>
                <p className="text-sm text-gray-500">Store for later retrieval</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.store}
                  onChange={(e) => updateSetting('store', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">Reasoning</span>
                <p className="text-sm text-gray-500">Enable reasoning models</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.reasoning}
                  onChange={(e) => updateSetting('reasoning', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <Button
            onClick={handleReset}
            className="bg-gray-500 hover:bg-gray-600 text-white"
          >
            Reset to Defaults
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
