import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const password = 'A-long-test-password-2026!';
let accountNumber = 0;

async function register(page: Page) {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'New here? Create an account' }).click();
  await page.getByLabel('Your name').fill('Browser Tester');
  await page.getByLabel('Email address').fill(`browser-${Date.now()}-${accountNumber++}@example.test`);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Your events' })).toBeVisible();
}

async function createEvent(page: Page, type: 'Wedding' | 'Birthday' | 'Community', title: string) {
  await page.goto('/events/new');
  await page.getByRole('button', { name: new RegExp(`^${type}`) }).click();
  await page.getByLabel('Give it a name').fill(title);
  await page.getByLabel('Start date').fill('2027-06-15');
  await page.getByLabel('City or location').fill('Pune');
  await page.getByRole('button', { name: 'Create my planning space' }).click();
  await expect(page).toHaveURL(/\/events\/evt_/);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}

async function expectNoSeriousAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))
    .map((item) => ({ rule: item.id, elements: item.nodes.map((node) => node.target) }))).toEqual([]);
}

test('a private event stays hidden from guests and another account', async ({ browser, page }) => {
  expect((await page.request.get('/api/events')).status()).toBe(401);
  await page.goto('/events/evt_private');
  await expect(page).toHaveURL(/\/sign-in\?next=/);

  await register(page);
  const eventPath = await createEvent(page, 'Wedding', 'Private wedding');
  const initialHtml = await (await page.request.get(eventPath)).text();
  expect(initialHtml).toContain('Private wedding');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/sign-in');
  await page.goto(eventPath);
  await expect(page).toHaveURL(/\/sign-in\?next=/);

  const other = await browser.newContext();
  try {
    const otherPage = await other.newPage();
    await register(otherPage);
    await otherPage.goto(eventPath);
    await expect(otherPage.getByRole('heading', { name: 'Private wedding' })).toHaveCount(0);
    const response = await otherPage.evaluate(async (path) => fetch(`/api${path}`).then((result) => result.status), eventPath);
    expect(response).toBe(404);
  } finally {
    await other.close();
  }
});

for (const type of ['Wedding', 'Birthday', 'Community'] as const) {
  test(`${type.toLowerCase()} journey creates and reviews a starter plan`, async ({ page }) => {
    await register(page);
    const title = `${type} browser plan`;
    await createEvent(page, type, title);
    await page.getByRole('button', { name: 'Ideas & plan' }).click();
    await page.getByRole('button', { name: 'Create my ideas' }).click();
    await expect(page.getByText('Your ideas are ready to review')).toBeVisible();
    if (type === 'Birthday') {
      const tasks = page.getByRole('checkbox', { name: /^Adopt task:/ });
      const count = await tasks.count();
      await tasks.first().uncheck();
      const submitted = page.waitForRequest((request) => request.url().includes('/review') && request.method() === 'POST');
      await page.getByRole('button', { name: 'Add selected', exact: true }).click();
      expect(JSON.parse((await submitted).postData() || '{}').selectedTaskIds).toHaveLength(count - 1);
    } else {
      await page.getByRole('button', { name: 'Add all' }).click();
    }
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your budget' })).toBeVisible();
  });
}

test('vendor quotes are reviewed before a budget allocation changes', async ({ page }) => {
  await register(page);
  const eventPath = await createEvent(page, 'Community', 'Vendor quote journey');
  await page.getByRole('button', { name: 'Vendors', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vendor Hub' })).toBeVisible();
  await page.getByRole('button', { name: '+ Add Vendor' }).click();
  await page.getByLabel('Vendor name').fill('Pune Catering Co');
  await page.getByRole('button', { name: 'Add Vendor', exact: true }).click();
  await page.getByRole('button', { name: /Pune Catering Co/ }).click();

  for (const [title, amount] of [['Menu A', '1000'], ['Menu B', '1500']]) {
    await page.getByRole('button', { name: '+ Add Quote' }).click();
    if (title === 'Menu A') await expectNoSeriousAxeViolations(page);
    await page.getByLabel('Quote Title *').fill(title);
    await page.getByLabel('Amount (₹) *').fill(amount);
    await page.getByLabel('Date *').fill('2027-05-01');
    await page.getByRole('button', { name: 'Add Quote', exact: true }).click();
    await expect(page.getByText(title)).toBeVisible();
  }

  const compare = page.getByRole('button', { name: 'Compare Quotes' });
  await compare.click();
  const dialog = page.getByRole('dialog', { name: 'Quotation Comparison Matrix' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close quote comparison dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(compare).toBeFocused();
  await compare.click();
  await expectNoSeriousAxeViolations(page);
  await dialog.getByLabel('Link to Budget Category').selectOption({ index: 1 });
  const categoryId = await dialog.getByLabel('Link to Budget Category').inputValue();
  await dialog.getByRole('button', { name: 'Confirm This Quote' }).first().click();
  await expect(dialog.getByText('Budget Impact Preview')).toBeVisible();
  await dialog.getByRole('button', { name: 'Update Category Allocation' }).click();

  await expect.poll(async () => {
    const result = await page.evaluate(async (path) => fetch(`/api${path}`).then((response) => response.json()), eventPath);
    return result.data.categories.find((category: { id: string }) => category.id === categoryId)?.allocatedPaise;
  }).toBe(100_000);
});

test('sign in, event creation, and workspace have no serious axe violations', async ({ page }) => {
  await page.goto('/sign-in');
  await expectNoSeriousAxeViolations(page);
  await register(page);
  await page.goto('/events/new');
  await expectNoSeriousAxeViolations(page);
  await createEvent(page, 'Community', 'Accessible community event');
  await expectNoSeriousAxeViolations(page);
  for (const [section, heading] of [
    ['Ideas & plan', 'Imagine what it could be.'],
    ['Timeline', 'Multi-Day Timeline'],
    ['Vendors', 'Vendor Hub'],
    ['Adjust plan', 'Change the plan, see what follows.'],
    ['Preferences', 'Cultural Preferences'],
  ]) {
    await page.getByRole('button', { name: section, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    if (section === 'Ideas & plan') {
      await page.getByRole('button', { name: 'Create my ideas' }).click();
      await expect(page.getByText('Your ideas are ready to review')).toBeVisible();
      await expectNoSeriousAxeViolations(page);
    }
  }
});
