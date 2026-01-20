'use client';

import { BarChart3, Zap, Target, GitBranch } from 'lucide-react';

export function WelcomeStep() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Welcome to Product OS</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          AI-powered feature prioritization that helps you make data-driven product decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <div className="p-4 border rounded-lg space-y-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold">Sync from Linear</h3>
          <p className="text-sm text-muted-foreground">
            Import your feature requests and issues directly from Linear.
          </p>
        </div>

        <div className="p-4 border rounded-lg space-y-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-semibold">AI-Powered Scoring</h3>
          <p className="text-sm text-muted-foreground">
            Use GPT-4 and Claude to automatically evaluate feature importance.
          </p>
        </div>

        <div className="p-4 border rounded-lg space-y-2">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="font-semibold">Multiple Frameworks</h3>
          <p className="text-sm text-muted-foreground">
            Choose from RICE, ICE, MoSCoW, or custom weighted scoring.
          </p>
        </div>

        <div className="p-4 border rounded-lg space-y-2">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="font-semibold">Push Priorities</h3>
          <p className="text-sm text-muted-foreground">
            Sync calculated priorities back to Linear automatically.
          </p>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground pt-4">
        This wizard will help you configure everything in just a few steps.
      </div>
    </div>
  );
}

export default WelcomeStep;
