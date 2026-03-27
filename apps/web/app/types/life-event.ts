import type { LifeEventCategory } from "@prisma/client";

export interface LifeEventItem {
  id: number;
  eventDate: Date;
  /** When set, event is an inclusive UTC date range from `eventDate` through `eventEndDate`. */
  eventEndDate: Date | null;
  title: string;
  description: string | null;
  location: string | null;
  category: LifeEventCategory;
  tags: string[];
  externalLink: string | null;
  createdAt: Date;
  updatedAt: Date;
}
