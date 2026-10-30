/**
 * Gatherly AI — Deterministic Initial Seeding
 *
 * Generates initial budget categories and starter preparation tasks based on event type.
 * All category allocations are calculated in integer paise and sum up deterministically.
 */

export interface InitialCategoryTemplate {
  name: string;
  percentage: number;
}

export interface InitialTaskTemplate {
  title: string;
  category: 'VENUE' | 'CATERING' | 'DECOR' | 'LOGISTICS' | 'GENERAL' | 'ENTERTAINMENT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  dueDayOffset: number; // Days relative to today (e.g. 7 = due in 1 week)
}

export interface SeedDataResult {
  categories: Array<{
    name: string;
    allocatedPaise: number;
    estimatedPaise: number;
  }>;
  contingencyPaise: number;
  tasks: Array<{
    title: string;
    category: string;
    priority: string;
    description: string;
    dueDateIso: string;
    deadlineProvenance: 'EVENT_RELATIVE' | 'FIXED_DATE' | 'USER_SET' | 'UNKNOWN';
  }>;
}

const TEMPLATES: Record<
  string,
  {
    categories: InitialCategoryTemplate[];
    contingencyPercent: number;
    tasks: InitialTaskTemplate[];
  }
> = {
  WEDDING: {
    contingencyPercent: 10,
    categories: [
      { name: 'Catering & Dining', percentage: 30 },
      { name: 'Venue & Staging', percentage: 25 },
      { name: 'Decor & Floral Styling', percentage: 15 },
      { name: 'Photography & Videography', percentage: 12 },
      { name: 'Entertainment & Music', percentage: 8 },
    ],
    tasks: [
      {
        title: 'Confirm ceremony dates and guest list count',
        category: 'GENERAL',
        priority: 'CRITICAL',
        description: 'Confirm the ceremony date and initial guest count with the couple and families.',
        dueDayOffset: 3,
      },
      {
        title: 'Shortlist and tour prospective wedding venues',
        category: 'VENUE',
        priority: 'HIGH',
        description: 'Verify capacity, accessibility, parking, and catering policy.',
        dueDayOffset: 7,
      },
      {
        title: 'Estimate catering plate count and dietary requirements',
        category: 'CATERING',
        priority: 'HIGH',
        description: 'Collect dietary needs, serving style, and estimated plate count.',
        dueDayOffset: 10,
      },
      {
        title: 'Brief decorator on theme and stage preferences',
        category: 'DECOR',
        priority: 'MEDIUM',
        description: 'Choose colors, ceremony setup, entrance design, and lighting.',
        dueDayOffset: 14,
      },
      {
        title: 'Interview photographers for multi-event coverage',
        category: 'LOGISTICS',
        priority: 'MEDIUM',
        description: 'Check portfolios and confirm coverage for the chosen ceremony format.',
        dueDayOffset: 20,
      },
    ],
  },
  BIRTHDAY: {
    contingencyPercent: 10,
    categories: [
      { name: 'Food, Beverages & Cake', percentage: 35 },
      { name: 'Venue Rental & Seating', percentage: 25 },
      { name: 'Decor, Balloons & Favors', percentage: 15 },
      { name: 'Entertainment & Games', percentage: 10 },
      { name: 'Photography & Keepsakes', percentage: 5 },
    ],
    tasks: [
      {
        title: 'Finalize party theme and guest invitations',
        category: 'GENERAL',
        priority: 'HIGH',
        description: 'Choose theme (colors/concept) and send digital save-the-dates.',
        dueDayOffset: 3,
      },
      {
        title: 'Book party hall or restaurant private space',
        category: 'VENUE',
        priority: 'HIGH',
        description: 'Confirm sound system, timing, and outside cake allowance.',
        dueDayOffset: 7,
      },
      {
        title: 'Order customized birthday cake and dessert bar',
        category: 'CATERING',
        priority: 'MEDIUM',
        description: 'Select flavor, design, size, and delivery timing.',
        dueDayOffset: 10,
      },
      {
        title: 'Arrange party games or host/magician',
        category: 'ENTERTAINMENT',
        priority: 'MEDIUM',
        description: 'Coordinate age-appropriate entertainment and music playlist.',
        dueDayOffset: 12,
      },
    ],
  },
  COMMUNITY: {
    contingencyPercent: 10,
    categories: [
      { name: 'Community Refreshments & Meals', percentage: 30 },
      { name: 'Ground / Hall Permits & Venue', percentage: 25 },
      { name: 'Sound, Lighting & Stage AV', percentage: 20 },
      { name: 'Signage, Badges & Printing', percentage: 15 },
    ],
    tasks: [
      {
        title: 'Submit municipal permissions and venue permit forms',
        category: 'VENUE',
        priority: 'CRITICAL',
        description: 'Apply for sound and community event gathering permits.',
        dueDayOffset: 4,
      },
      {
        title: 'Form volunteer coordination committees',
        category: 'GENERAL',
        priority: 'HIGH',
        description: 'Assign leaders for hospitality, stage management, and safety.',
        dueDayOffset: 7,
      },
      {
        title: 'Confirm public address system and generator backup',
        category: 'LOGISTICS',
        priority: 'HIGH',
        description: 'Ensure adequate mic setup, speakers, and power redundancy.',
        dueDayOffset: 10,
      },
      {
        title: 'Finalize community catering or food stalls',
        category: 'CATERING',
        priority: 'MEDIUM',
        description: 'Coordinate hygiene, water stations, and disposable cutlery.',
        dueDayOffset: 14,
      },
    ],
  },
  CELEBRATION: {
    contingencyPercent: 10,
    categories: [
      { name: 'Food & Hospitality', percentage: 35 },
      { name: 'Venue & Seating', percentage: 25 },
      { name: 'Decor & Activities', percentage: 20 },
      { name: 'Photography & Logistics', percentage: 10 },
    ],
    tasks: [
      { title: 'Confirm occasion and guest list', category: 'GENERAL', priority: 'HIGH', description: 'Agree on the gathering format, guest count, and invitations.', dueDayOffset: 21 },
      { title: 'Book an accessible venue', category: 'VENUE', priority: 'HIGH', description: 'Check capacity, transport access, and facilities.', dueDayOffset: 18 },
      { title: 'Plan food and dietary choices', category: 'CATERING', priority: 'MEDIUM', description: 'Confirm menu and dietary needs with attendees.', dueDayOffset: 12 },
    ],
  },
};

/**
 * Calculates seed budget categories and tasks deterministically from total budget paise.
 */
export function getInitialSeedData(
  eventType: string,
  totalBudgetPaise: number,
  baseDate: Date = new Date()
): SeedDataResult {
  const normalizedType = eventType.toUpperCase();
  const template = TEMPLATES[normalizedType] || TEMPLATES.CELEBRATION;

  // 1. Calculate contingency
  const contingencyPaise = Math.floor((totalBudgetPaise * template.contingencyPercent) / 100);

  // 2. Allocate categories
  let remainingForCategories = totalBudgetPaise - contingencyPaise;
  const categories: SeedDataResult['categories'] = [];

  for (let i = 0; i < template.categories.length; i++) {
    const cat = template.categories[i];
    const isLast = i === template.categories.length - 1;

    let allocatedPaise: number;
    if (isLast) {
      // Allocate exact remaining to prevent 1-paisa rounding drifts
      allocatedPaise = Math.max(0, remainingForCategories);
    } else {
      allocatedPaise = Math.floor((totalBudgetPaise * cat.percentage) / 100);
      remainingForCategories -= allocatedPaise;
    }

    categories.push({
      name: cat.name,
      allocatedPaise,
      estimatedPaise: allocatedPaise,
    });
  }

  // 3. Generate starter tasks with computed due dates
  const tasks = template.tasks.map((task) => {
    const dueDate = new Date(baseDate);
    dueDate.setUTCDate(dueDate.getUTCDate() - task.dueDayOffset);
    return {
      title: task.title,
      category: task.category,
      priority: task.priority,
      description: task.description,
      dueDateIso: dueDate.toISOString().split('T')[0],
      deadlineProvenance: 'EVENT_RELATIVE' as const,
    };
  });

  return {
    categories,
    contingencyPaise,
    tasks,
  };
}
