'use client';

import { useState } from 'react';
import { CompetitorFeature, EnhancedAIPromptConfig } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { defaultEnhancedPromptConfig } from '@/lib/config/prompt-defaults';

interface CompetitorMatrixProps {
  competitorMatrix: CompetitorFeature[];
  onChange: (matrix: CompetitorFeature[]) => void;
  enhancedConfig?: EnhancedAIPromptConfig;
  readOnly?: boolean;
}

export function CompetitorMatrix({
  competitorMatrix,
  onChange,
  enhancedConfig,
  readOnly = false,
}: CompetitorMatrixProps) {
  const config = enhancedConfig || defaultEnhancedPromptConfig;
  const [newFeature, setNewFeature] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');
  const [isAddFeatureOpen, setIsAddFeatureOpen] = useState(false);
  const [isAddCompetitorOpen, setIsAddCompetitorOpen] = useState(false);
  const [newFeatureNotes, setNewFeatureNotes] = useState('');

  // Get all unique competitors from the matrix and products config
  const allCompetitors = Array.from(
    new Set([
      ...competitorMatrix.flatMap(f => Object.keys(f.competitors)),
      ...config.products.flatMap(p => p.competitors),
    ])
  ).slice(0, 6); // Limit to 6 competitors for display

  const handleToggleFeature = (featureIndex: number, competitor: string) => {
    if (readOnly) return;

    const updated = [...competitorMatrix];
    updated[featureIndex] = {
      ...updated[featureIndex],
      competitors: {
        ...updated[featureIndex].competitors,
        [competitor]: !updated[featureIndex].competitors[competitor],
      },
    };
    onChange(updated);
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;

    const newEntry: CompetitorFeature = {
      feature: newFeature.trim(),
      competitors: allCompetitors.reduce((acc, c) => ({ ...acc, [c]: false }), {}),
      notes: newFeatureNotes.trim() || undefined,
    };

    onChange([...competitorMatrix, newEntry]);
    setNewFeature('');
    setNewFeatureNotes('');
    setIsAddFeatureOpen(false);
  };

  const handleAddCompetitor = () => {
    if (!newCompetitor.trim()) return;

    const updated = competitorMatrix.map(entry => ({
      ...entry,
      competitors: {
        ...entry.competitors,
        [newCompetitor.trim()]: false,
      },
    }));

    onChange(updated);
    setNewCompetitor('');
    setIsAddCompetitorOpen(false);
  };

  const handleRemoveFeature = (index: number) => {
    if (readOnly) return;
    const updated = competitorMatrix.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateNotes = (index: number, notes: string) => {
    if (readOnly) return;
    const updated = [...competitorMatrix];
    updated[index] = { ...updated[index], notes: notes || undefined };
    onChange(updated);
  };

  // Calculate competitive parity stats
  const getCompetitorCount = (feature: CompetitorFeature): number => {
    return Object.values(feature.competitors).filter(Boolean).length;
  };

  const getParityIndicator = (count: number, total: number): string => {
    const ratio = count / total;
    if (ratio >= 0.8) return 'Table Stakes';
    if (ratio >= 0.5) return 'High Parity';
    if (ratio >= 0.25) return 'Moderate';
    return 'Differentiator';
  };

  const getParityColor = (count: number, total: number): string => {
    const ratio = count / total;
    if (ratio >= 0.8) return 'text-red-600';
    if (ratio >= 0.5) return 'text-orange-600';
    if (ratio >= 0.25) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            📊 Competitor Feature Matrix
          </span>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Dialog open={isAddFeatureOpen} onOpenChange={setIsAddFeatureOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    + Add Feature
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Feature to Matrix</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="feature-name">Feature Name</Label>
                      <Input
                        id="feature-name"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="e.g., Message Threading"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feature-notes">Notes (optional)</Label>
                      <Input
                        id="feature-notes"
                        value={newFeatureNotes}
                        onChange={(e) => setNewFeatureNotes(e.target.value)}
                        placeholder="e.g., Enterprise requirement"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddFeatureOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddFeature}>Add Feature</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddCompetitorOpen} onOpenChange={setIsAddCompetitorOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    + Add Competitor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Competitor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="competitor-name">Competitor Name</Label>
                      <Input
                        id="competitor-name"
                        value={newCompetitor}
                        onChange={(e) => setNewCompetitor(e.target.value)}
                        placeholder="e.g., Sendbird"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddCompetitorOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddCompetitor}>Add Competitor</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          Track which competitors have which features. AI uses this for Competitive Parity scoring.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {competitorMatrix.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No features in matrix yet. Add features to track competitor parity.
          </div>
        ) : (
          <>
            <div className="border rounded overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Feature</TableHead>
                    {allCompetitors.map((competitor) => (
                      <TableHead key={competitor} className="text-center min-w-[80px]">
                        {competitor}
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[100px]">Parity</TableHead>
                    <TableHead className="min-w-[150px]">Notes</TableHead>
                    {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitorMatrix.map((entry, index) => {
                    const count = getCompetitorCount(entry);
                    const total = allCompetitors.length;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{entry.feature}</TableCell>
                        {allCompetitors.map((competitor) => (
                          <TableCell key={competitor} className="text-center">
                            <button
                              onClick={() => handleToggleFeature(index, competitor)}
                              className={`text-lg ${readOnly ? 'cursor-default' : 'cursor-pointer hover:opacity-70'}`}
                              disabled={readOnly}
                            >
                              {entry.competitors[competitor] ? '✅' : '❌'}
                            </button>
                          </TableCell>
                        ))}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getParityColor(count, total)}
                          >
                            {getParityIndicator(count, total)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {readOnly ? (
                            <span className="text-sm text-muted-foreground">{entry.notes}</span>
                          ) : (
                            <Input
                              value={entry.notes || ''}
                              onChange={(e) => handleUpdateNotes(index, e.target.value)}
                              placeholder="Add notes..."
                              className="text-sm h-8"
                            />
                          )}
                        </TableCell>
                        {!readOnly && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFeature(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 p-3 bg-muted rounded text-sm">
              <p className="font-medium mb-2">💡 Scoring Guide:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <span className="text-red-600">All competitors have it (Table Stakes)</span> → High competitive parity score (7-10)
                </li>
                <li>
                  <span className="text-orange-600">Most competitors have it (High Parity)</span> → Medium score (5-6)
                </li>
                <li>
                  <span className="text-yellow-600">Some competitors have it (Moderate)</span> → Low-medium score (3-4)
                </li>
                <li>
                  <span className="text-green-600">No competitors have it (Differentiator)</span> → Low score (1-2) or differentiator opportunity
                </li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CompetitorMatrix;
