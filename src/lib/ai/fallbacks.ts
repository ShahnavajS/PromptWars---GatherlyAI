import { StructuredPlanOutput, NormalizedPlanSuggestion } from './schemas';
import { normalizePlanProposal } from './gemini';

/**
 * Returns an honest, deterministic starter plan template when Gemini is unconfigured.
 * Clearly identified as an application starter template, never disguised as AI output.
 */
export function getStarterPlanTemplate(
  eventType: string,
  eventTitle: string,
  venueCity: string,
  targetGuestCount: number,
  totalBudgetRupees: number,
  startDate: string,
  culturalPreset?: string
): { plan: NormalizedPlanSuggestion; modelUsed: string } {
  const normType = eventType.toUpperCase();
  const rawPlan: StructuredPlanOutput =
    normType === 'WEDDING'
      ? {
          concept: {
            planTitle: `${eventTitle} — Traditional Multi-Ceremony Blueprint`,
            overview: `A structured planning template for ${targetGuestCount} guests in ${venueCity}, coordinating ceremonies, traditional vegetarian dining, and family hospitality.`,
            theme: 'Festive Marigold & Royal Festive Accents',
            atmosphere: 'Warm, hospitable, celebratory, with dedicated elderly comfort',
            keyAssumptions: [
              `Target guest headcount of ${targetGuestCount} attendees`,
              `Total planned spending ceiling of ₹${totalBudgetRupees.toLocaleString('en-IN')}`,
              'Multi-day venue booking required for pre-wedding rituals',
            ],
            missingInformation: [
              'Confirmation of auspicious mahurat timings',
              'Specific dietary mix (percentage pure vegetarian vs Jain food requirements)',
              'Sound permit and music curfew guidelines for chosen venue',
            ],
          },
          personalization: {
            culturalTraditions: [
              'Ganesh Sthapana & Mandap Muhurat',
              'Mehendi & Garba Sangeet Evening',
              'Haldi / Pithi Morning Ceremony',
              'Varmala, Kanya Daan & Saat Phere',
            ],
            dietaryPlans: [
              'Authentic regional welcome refreshments',
              'Traditional vegetarian wedding feast with live counters',
              'Dedicated Jain preparation food section',
            ],
            accessibilityNotes: [
              'Priority ground-floor seating near the mandap for grandparents and elderly relatives',
              'Wheelchair-accessible dining pathways and non-slip stage ramps',
            ],
            decorAndColors: [
              'Fresh marigold yellow, royal teal, and auspicious vermilion red',
              'Brass traditional urli and diya light fixtures',
            ],
            entertainmentIdeas: [
              'Traditional folk musicians and dholak players for Garba',
              'Live acoustic shehnai for morning ceremony entrance',
            ],
          },
          budgetPlan: {
            contingencyPercentage: 10,
            categoryProposals: [
              { name: 'Catering & Dining', percentage: 33, rationale: 'Multi-meal catering and live dessert counters' },
              { name: 'Venue & Staging', percentage: 28, rationale: 'Ceremony hall, mandap stage setup, and banquet seating' },
              { name: 'Decor & Floral Styling', percentage: 17, rationale: 'Traditional flowers, entrance arches, and lighting' },
              { name: 'Photography & Videography', percentage: 13, rationale: 'Candid photography and multi-day ceremony documentation' },
              { name: 'Entertainment & Music', percentage: 9, rationale: 'Folk musicians, sound system, and ceremony audio' },
            ],
          },
          tasks: [
            {
              title: 'Finalize ceremony dates and family invitations',
              description: 'Confirm mahurat schedule with priest and distribute digital save-the-dates.',
              category: 'GENERAL',
              priority: 'CRITICAL',
              relativeDeadlineDays: 45,
              rationale: 'Critical first step to anchor vendor dates.',
            },
            {
              title: 'Book wedding venue and banquet hall',
              description: 'Inspect air conditioning, parking capacity for 100+ vehicles, and sound restrictions.',
              category: 'VENUE',
              priority: 'HIGH',
              relativeDeadlineDays: 35,
              rationale: 'Prime event venues book months in advance.',
            },
            {
              title: 'Conduct catering tasting and finalize menu counters',
              description: 'Review Jain menu options, seasonal sweets, and welcome drink varieties.',
              category: 'CATERING',
              priority: 'HIGH',
              relativeDeadlineDays: 25,
              rationale: 'Guest hospitality is centered around memorable dining.',
            },
            {
              title: 'Commission decorator for mandap and entrance arches',
              description: 'Review theme sketches, fabric drapery, and floral stage backdrops.',
              category: 'DECOR',
              priority: 'MEDIUM',
              relativeDeadlineDays: 20,
              rationale: 'Allows custom fabric and structure sourcing.',
            },
            {
              title: 'Confirm photography team shot list',
              description: 'List must-have family portraits, candid rituals, and drone permissions.',
              category: 'LOGISTICS',
              priority: 'MEDIUM',
              relativeDeadlineDays: 15,
              rationale: 'Ensures key family moments are captured seamlessly.',
            },
          ],
          agendaBlocks: [
            {
              dayNumber: 1,
              title: 'Mehendi & Garba Sangeet Evening',
              timeWindow: '5:00 PM – 10:30 PM',
              description: 'Mehendi application followed by live Garba-Raas and traditional dinner.',
            },
            {
              dayNumber: 2,
              title: 'Vedic Wedding Ceremony & Reception',
              timeWindow: '10:00 AM – 3:30 PM',
              description: 'Baraat welcome, Saat Phere ritual, lunch feast, and afternoon blessing reception.',
            },
          ],
          vendorRequirements: [
            {
              category: 'Catering',
              title: 'Full-Service Vegetarian Caterer',
              specifications: `Catering service for ${targetGuestCount} guests including separate Jain preparation kitchen.`,
              comparisonCriteria: ['Tasting session quality', 'Staff-to-guest ratio minimum 1:15', 'Beverage counter inclusion'],
            },
            {
              category: 'Photography',
              title: 'Traditional & Candid Photo Team',
              specifications: 'Two candid photographers, two traditional videographers, and teaser reel deliverable.',
              comparisonCriteria: ['Portfolio authenticity', 'Deliverable timeline (under 4 weeks)', 'Drone permit compliance'],
            },
          ],
        }
      : {
          concept: {
            planTitle: `${eventTitle} — Event Planning Blueprint`,
            overview: `A complete starter blueprint for ${targetGuestCount} attendees in ${venueCity}.`,
            theme: 'Contemporary Festive Celebration',
            atmosphere: 'Vibrant, engaging, and memorable',
            keyAssumptions: [
              `Guest headcount of ${targetGuestCount}`,
              `Spending ceiling of ₹${totalBudgetRupees.toLocaleString('en-IN')}`,
            ],
            missingInformation: ['Specific dietary mix', 'Audio/visual requirements'],
          },
          personalization: {
            culturalTraditions: ['Opening welcome address', 'Celebration cake or toast'],
            dietaryPlans: ['Selection of appetizers and hot buffet dinner', 'Vegetarian options'],
            accessibilityNotes: ['Step-free access to main event room'],
            decorAndColors: ['Festive party accents and balloon/floral styling'],
            entertainmentIdeas: ['Curated music playlist and party host'],
          },
          budgetPlan: {
            contingencyPercentage: 10,
            categoryProposals: [
              { name: 'Food, Beverages & Dining', percentage: 38, rationale: 'Appetizers, main meal, and celebration cake' },
              { name: 'Venue Rental & Seating', percentage: 30, rationale: 'Party space rental, tables, and ambient lighting' },
              { name: 'Decor & Styling', percentage: 17, rationale: 'Welcome backdrop, table styling, and balloons' },
              { name: 'Entertainment & Audio', percentage: 15, rationale: 'Host, sound system, and party music' },
            ],
          },
          tasks: [
            {
              title: 'Reserve party venue space',
              description: 'Confirm deposit and guest capacity.',
              category: 'VENUE',
              priority: 'HIGH',
              relativeDeadlineDays: 20,
              rationale: 'Secures event date.',
            },
            {
              title: 'Finalize celebration menu and dessert',
              description: 'Order cake and dietary choices.',
              category: 'CATERING',
              priority: 'HIGH',
              relativeDeadlineDays: 14,
              rationale: 'Guarantees food freshness and timing.',
            },
            {
              title: 'Send digital invitations and track RSVPs',
              description: 'Collect headcounts for catering.',
              category: 'GENERAL',
              priority: 'MEDIUM',
              relativeDeadlineDays: 10,
              rationale: 'Informs exact food quantities.',
            },
          ],
          agendaBlocks: [
            {
              dayNumber: 1,
              title: 'Party Celebration',
              timeWindow: '6:00 PM – 10:00 PM',
              description: 'Guest arrival, activities, cake cutting, and dinner.',
            },
          ],
          vendorRequirements: [
            {
              category: 'Venue & Food',
              title: 'Party Hall & Catering Package',
              specifications: `Space and dining for ${targetGuestCount} guests.`,
              comparisonCriteria: ['Outside cake permission', 'AV equipment inclusion'],
            },
          ],
        };

  if (normType === 'WEDDING' && culturalPreset !== 'GUJARATI') {
    rawPlan.concept.planTitle = `${eventTitle} — Wedding Planning Blueprint`;
    rawPlan.concept.overview = `A flexible wedding plan for ${targetGuestCount} guests in ${venueCity}, with budget, vendors, accessibility, and a ceremony timeline to confirm.`;
    rawPlan.concept.theme = 'Personalized to the couple';
    rawPlan.concept.atmosphere = 'Welcoming and celebratory';
    rawPlan.concept.keyAssumptions = [`Target guest count: ${targetGuestCount}`, 'Ceremony format is pending confirmation'];
    rawPlan.concept.missingInformation = ['Ceremony traditions and schedule', 'Dietary requirements', 'Venue accessibility and transport needs'];
    rawPlan.personalization.culturalTraditions = ['Confirm meaningful traditions with the couple and families'];
    rawPlan.personalization.dietaryPlans = ['Collect dietary requirements before finalizing catering'];
    rawPlan.personalization.accessibilityNotes = ['Check step-free access, seating, and accessible restrooms'];
    rawPlan.personalization.decorAndColors = ['Choose colors and decor with the couple'];
    rawPlan.personalization.entertainmentIdeas = ['Match music to the ceremony and guest preferences'];
    rawPlan.tasks[0].title = 'Confirm ceremony format, dates, and guest list';
    rawPlan.tasks[0].description = 'Agree on ceremony sequence and invitations with the couple and families.';
    rawPlan.tasks[1].description = 'Check venue capacity, accessibility, parking, and service rules.';
    rawPlan.tasks[2].description = 'Gather dietary preferences, compare menus, and arrange tasting.';
    rawPlan.tasks[3].description = 'Review decor concepts and venue setup requirements.';
    rawPlan.tasks[4].description = 'Agree on the photography brief and permissions.';
    rawPlan.agendaBlocks = [{ dayNumber: 1, title: 'Ceremony and Guest Reception', timeWindow: 'Timing to confirm', description: 'Confirm ceremony, hospitality, and reception sequence with the couple.' }];
    rawPlan.vendorRequirements[0] = { category: 'Catering', title: 'Wedding Catering', specifications: `Menu and service for ${targetGuestCount} guests, with confirmed dietary accommodations.`, comparisonCriteria: ['Menu quality', 'Accessibility of service', 'Total price and inclusions'] };
    rawPlan.vendorRequirements[1] = { category: 'Photography', title: 'Wedding Photography', specifications: 'Coverage for confirmed ceremony and reception schedule.', comparisonCriteria: ['Portfolio', 'Delivery schedule', 'Usage rights'] };
  }

  if (normType === 'COMMUNITY') {
    rawPlan.concept.planTitle = `${eventTitle} — Community Event Blueprint`;
    rawPlan.concept.overview = `An inclusive community gathering plan for ${targetGuestCount} attendees in ${venueCity}, covering permits, volunteers, access, and safety.`;
    rawPlan.concept.theme = 'Community participation';
    rawPlan.concept.atmosphere = 'Inclusive and welcoming';
    rawPlan.concept.missingInformation = ['Local venue and sound permissions', 'Volunteer headcount', 'Safety and accessibility needs'];
    rawPlan.personalization.culturalTraditions = ['Invite local groups to shape the program'];
    rawPlan.personalization.dietaryPlans = ['Offer water and clearly labeled dietary options'];
    rawPlan.personalization.accessibilityNotes = ['Check step-free paths, accessible toilets, and quiet space'];
    rawPlan.personalization.entertainmentIdeas = ['Community performances and participatory activities'];
    rawPlan.budgetPlan.categoryProposals = [
      { name: 'Venue & Permits', percentage: 30, rationale: 'Space, permissions, and site preparation' },
      { name: 'Food & Water', percentage: 25, rationale: 'Refreshments and hydration for attendees' },
      { name: 'Safety & Accessibility', percentage: 20, rationale: 'First aid, access, and crowd care' },
      { name: 'Sound & Program', percentage: 15, rationale: 'Stage, audio, and activities' },
      { name: 'Signage & Volunteers', percentage: 10, rationale: 'Wayfinding and volunteer materials' },
    ];
    rawPlan.tasks = [
      { title: 'Confirm venue permissions and local rules', description: 'Check permits, sound limits, and site conditions.', category: 'VENUE', priority: 'CRITICAL', relativeDeadlineDays: 30, rationale: 'Approval may take time.' },
      { title: 'Recruit volunteers and assign safety roles', description: 'Name leads for access, first aid, crowd care, and hospitality.', category: 'GENERAL', priority: 'HIGH', relativeDeadlineDays: 21, rationale: 'Clear roles support safe delivery.' },
      { title: 'Plan accessible routes and facilities', description: 'Walk the site and verify step-free paths, toilets, and signage.', category: 'LOGISTICS', priority: 'HIGH', relativeDeadlineDays: 14, rationale: 'Access must work for all guests.' },
      { title: 'Confirm food stalls and water provision', description: 'Check hygiene, water, and allergy labeling.', category: 'CATERING', priority: 'HIGH', relativeDeadlineDays: 10, rationale: 'Food and water are core attendee needs.' },
    ];
    rawPlan.agendaBlocks = [{ dayNumber: 1, title: 'Welcome, Program, and Community Activities', timeWindow: 'Schedule to confirm', description: 'Include welcome, activities, breaks, and closing announcements.' }];
    rawPlan.vendorRequirements = [
      { category: 'VENUE', title: 'Accessible Community Venue', specifications: `Space for ${targetGuestCount} attendees with step-free access and safe exits.`, comparisonCriteria: ['Capacity', 'Access', 'Permits'] },
      { category: 'SOUND', title: 'Public Address and Backup Power', specifications: 'Clear announcements across the venue with suitable power backup.', comparisonCriteria: ['Coverage', 'Backup', 'Sound limits'] },
    ];
  }

  if (normType === 'CELEBRATION') {
    rawPlan.concept.planTitle = `${eventTitle} — Celebration Blueprint`;
    rawPlan.concept.overview = `A flexible plan for ${targetGuestCount} guests in ${venueCity}, with space for the occasion's own traditions and activities.`;
    rawPlan.personalization.culturalTraditions = ['Confirm the occasion and meaningful traditions with hosts'];
    rawPlan.personalization.dietaryPlans = ['Collect dietary preferences and plan a suitable menu'];
    rawPlan.budgetPlan.categoryProposals[0] = { name: 'Food & Hospitality', percentage: 38, rationale: 'Meals, refreshments, and guest care' };
    rawPlan.tasks[1].title = 'Finalize menu and refreshments';
    rawPlan.tasks[1].description = 'Confirm dietary choices and serving times.';
    rawPlan.agendaBlocks[0] = { dayNumber: 1, title: 'Celebration Gathering', timeWindow: 'Timing to confirm', description: 'Guest welcome, occasion activities, meal, and close.' };
    rawPlan.vendorRequirements[0] = { category: 'Venue & Food', title: 'Venue and Hospitality Package', specifications: `Space and dining for ${targetGuestCount} guests.`, comparisonCriteria: ['Capacity', 'Dietary options', 'Inclusions'] };
  }

  const totalBudgetPaise = totalBudgetRupees * 100;
  const normalized = normalizePlanProposal(rawPlan, totalBudgetPaise, new Date(startDate));

  return {
    plan: normalized,
    modelUsed: 'deterministic-starter-template',
  };
}

