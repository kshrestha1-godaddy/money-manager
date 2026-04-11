/**
 * Seeds dummy life events: PER_CATEGORY rows per Prisma LifeEventCategory (all enum values).
 *
 * Requires DATABASE_URL. Optional: SEED_USER_EMAIL (default: john.doe@example.com).
 * If that user is missing, uses the first user by id (with a warning).
 *
 * Run from repo root:
 *   npm run seed:life-events
 */

import { PrismaClient, LifeEventCategory } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_TAG = "seed-life-events";
const DEFAULT_USER_EMAIL = "john.doe@example.com";
/** Number of dummy events to create for each LifeEventCategory. */
const PER_CATEGORY = 5;

/** Every `LifeEventCategory` from the schema (kept explicit so seeds stay in sync). */
const LIFE_EVENT_CATEGORIES: LifeEventCategory[] = [
  LifeEventCategory.EDUCATION,
  LifeEventCategory.CAREER,
  LifeEventCategory.TRAVEL,
  LifeEventCategory.PERSONAL,
  LifeEventCategory.LEGAL,
  LifeEventCategory.DOCUMENTS,
  LifeEventCategory.COLLEGE,
  LifeEventCategory.UNIVERSITY,
  LifeEventCategory.SCHOOL,
  LifeEventCategory.MARRIAGE,
  LifeEventCategory.OTHER,
];

/** UTC noon, matching app date handling for calendar-style events. */
function utcNoon(year: number, monthIndex0: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex0, day, 12, 0, 0));
}

function eventDatesFor(
  categoryIndex: number,
  rowIndex: number
): { eventDate: Date; eventEndDate: Date | null } {
  const baseYear = 2008 + categoryIndex + rowIndex;
  const month = (categoryIndex * 2 + rowIndex * 3) % 12;
  const day = 1 + ((categoryIndex + rowIndex * 5) % 27);
  const eventDate = utcNoon(baseYear, month, day);
  const multiDay = rowIndex % 2 === 1;
  if (!multiDay) return { eventDate, eventEndDate: null };
  const end = new Date(eventDate);
  end.setUTCDate(end.getUTCDate() + 4);
  return { eventDate, eventEndDate: end };
}

const TITLE_HINTS: Partial<Record<LifeEventCategory, string[]>> = {
  EDUCATION: ["Course completed", "Workshop attended", "Certification", "Training week", "Seminar"],
  CAREER: ["Promotion", "New role", "Performance review", "Team change", "Bonus milestone"],
  TRAVEL: ["Trip abroad", "Road trip", "Conference travel", "Family vacation", "City break"],
  PERSONAL: ["Moved house", "Family gathering", "Health milestone", "Anniversary", "Birthday trip"],
  LEGAL: ["Contract signed", "Will updated", "Attorney meeting", "Filing deadline", "Permit approved"],
  DOCUMENTS: ["Passport renewed", "License updated", "Deed recorded", "ID replaced", "Tax papers"],
  COLLEGE: ["Semester start", "Finals week", "Graduation", "Internship", "Advisor meeting"],
  UNIVERSITY: ["Thesis defense", "Orientation", "Lab rotation", "Defense date", "Convocation"],
  SCHOOL: ["Report card", "Sports day", "Parent night", "Science fair", "Graduation"],
  MARRIAGE: ["Engagement", "Wedding", "Anniversary", "Honeymoon", "Renewal"],
  OTHER: ["Note to self", "Reminder", "Misc milestone", "Life update", "Journal entry"],
};

function titleFor(category: LifeEventCategory, rowIndex: number): string {
  const hints = TITLE_HINTS[category] ?? TITLE_HINTS.OTHER ?? [];
  const hint = hints[rowIndex % hints.length] ?? "Milestone";
  return `[Seed] ${hint} (${category})`;
}

function descriptionFor(category: LifeEventCategory, row: number): string {
  return `Dummy life event #${row + 1} in category ${category}. Seeded for development and filters.`;
}

async function seedLifeEvents() {
  const email = process.env.SEED_USER_EMAIL?.trim() || DEFAULT_USER_EMAIL;

  let user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.findFirst({ orderBy: { id: "asc" } });
    if (user) {
      console.warn(
        `SEED_USER_EMAIL "${email}" not found; using first user (id ${user.id}).`,
      );
    }
  }

  if (!user) {
    console.error(
      "No users in the database. Create a user or run the main prisma seed first.",
    );
    process.exitCode = 1;
    return;
  }

  const categories = LIFE_EVENT_CATEGORIES;

  const removed = await prisma.lifeEvent.deleteMany({
    where: {
      userId: user.id,
      tags: { has: SEED_TAG },
    },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} previous seed life events.`);
  }

  let created = 0;
  for (let ci = 0; ci < categories.length; ci++) {
    const category = categories[ci];
    if (!category) continue;
    for (let i = 0; i < PER_CATEGORY; i++) {
      const { eventDate, eventEndDate } = eventDatesFor(ci, i);
      const externalLink =
        i === 0 ? "https://example.com/life-event-placeholder" : null;

      await prisma.lifeEvent.create({
        data: {
          userId: user.id,
          category,
          title: titleFor(category, i),
          description: descriptionFor(category, i),
          location:
            i % 3 === 0 ? `Sample City ${ci + 1}` : null,
          eventDate,
          eventEndDate,
          tags: [SEED_TAG, "seed", category.toLowerCase()],
          externalLink,
        },
      });
      created++;
    }
  }

  const who = user.email ?? user.number;
  console.log(
    `Created ${created} life events for ${who} (${categories.length} categories × ${PER_CATEGORY}).`,
  );
}

async function main() {
  try {
    await seedLifeEvents();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
