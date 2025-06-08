"use client";

import { InvestmentInterface } from "../types/investments";
import { InvestmentCard } from "../components/InvestmentCard";

interface InvestmentListProps {
    investments: InvestmentInterface[];
    onEdit: (investment: InvestmentInterface) => void;
    onDelete: (investment: InvestmentInterface) => void;
    onViewDetails: (investment: InvestmentInterface) => void;
}

export function InvestmentList({ investments, onEdit, onDelete, onViewDetails }: InvestmentListProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investments.map((investment) => (
                <InvestmentCard
                    key={investment.id}
                    investment={investment}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                />
            ))}
        </div>
    );
} 