import type { LifeEventCategory } from "@prisma/client";

export interface LifeEventItem {
  id: number;
  eventDate: Date;
  title: string;
  description: string | null;
  location: string | null;
  category: LifeEventCategory;
  tags: string[];
  externalLink: string | null;
  createdAt: Date;
  updatedAt: Date;
}
