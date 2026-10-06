import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Tabs, type TabItem } from '../../design-system';

const roomTabs: TabItem[] = [
  { id: 'layout', label: 'Layout', content: <p>Layout and circulation</p> },
  { id: 'materials', label: 'Materials', content: <p>Floor and wall finishes</p> },
  { id: 'lighting', label: 'Lighting', content: <p>Lighting layers</p>, disabled: true },
  { id: 'services', label: 'Services', content: <p>Plumbing and electrical points</p> },
];

const tab = (name: string) => page.getByRole('tab', { name });
const panel = (name: string) => page.getByRole('tabpanel', { name });
const hiddenPanel = (name: string) => page.getByRole('tabpanel', { name, includeHidden: true });

async function expectSelected(name: string) {
  await expect.element(tab(name)).toHaveAttribute('aria-selected', 'true');
  await expect.element(panel(name)).toBeVisible();
}

describe('Tabs in a browser', () => {
  it('exposes a labelled tab list with the first enabled tab selected', async () => {
    await render(<Tabs items={roomTabs} label="Room details" />);

    await expect.element(page.getByRole('tablist', { name: 'Room details' })).toBeVisible();
    expect(page.getByRole('tab').elements()).toHaveLength(4);
    await expectSelected('Layout');
    for (const name of ['Materials', 'Lighting', 'Services']) {
      await expect.element(tab(name)).toHaveAttribute('aria-selected', 'false');
      await expect.element(hiddenPanel(name)).not.toBeVisible();
    }
    await expect.element(tab('Lighting')).toBeDisabled();

    // The tab controls its panel, and the panel is named by its tab.
    expect(page.getByRole('tabpanel').elements()).toHaveLength(1);
    await expect.element(panel('Layout')).toHaveTextContent('Layout and circulation');
    await expect.element(tab('Layout')).toHaveAttribute('aria-controls', panel('Layout').element().id);
  });

  it('keeps only the selected tab in the tab order, with a visible focus ring', async () => {
    await render(
      <>
        <button type="button">Before</button>
        <Tabs items={roomTabs} label="Room details" />
      </>,
    );
    page.getByRole('button', { name: 'Before' }).element().focus();

    await userEvent.tab();
    await expect.element(tab('Layout')).toHaveFocus();
    expect(getComputedStyle(tab('Layout').element()).outlineStyle).toBe('solid');

    // Tab leaves the tab list for the panel instead of visiting every tab.
    await userEvent.tab();
    await expect.element(panel('Layout')).toHaveFocus();

    await userEvent.tab({ shift: true });
    await expect.element(tab('Layout')).toHaveFocus();
  });

  it('selects a tab on click and moves the tab stop with it', async () => {
    const onChange = vi.fn();
    await render(<Tabs items={roomTabs} label="Room details" onChange={onChange} />);

    await tab('Materials').click();

    await expectSelected('Materials');
    await expect.element(tab('Layout')).toHaveAttribute('aria-selected', 'false');
    await expect.element(hiddenPanel('Layout')).not.toBeVisible();
    expect(onChange).toHaveBeenCalledExactlyOnceWith('materials');
    expect(tab('Materials').element().tabIndex).toBe(0);
    expect(tab('Layout').element().tabIndex).toBe(-1);
  });

  it('moves with the arrow keys, wrapping at the ends and skipping disabled tabs', async () => {
    await render(<Tabs items={roomTabs} label="Room details" />);
    await tab('Layout').click();

    const steps: [key: string, expected: string][] = [
      ['{ArrowRight}', 'Materials'],
      ['{ArrowRight}', 'Services'], // Lighting is disabled
      ['{ArrowRight}', 'Layout'], // wraps to the start
      ['{ArrowLeft}', 'Services'], // wraps to the end
      ['{ArrowLeft}', 'Materials'],
    ];
    for (const [key, expected] of steps) {
      await userEvent.keyboard(key);
      await expect.element(tab(expected)).toHaveFocus();
      await expectSelected(expected);
    }
  });

  it('jumps to the first and last enabled tabs with Home and End', async () => {
    const stages: TabItem[] = [
      { id: 'survey', label: 'Survey', content: <p>Site survey</p>, disabled: true },
      { id: 'concept', label: 'Concept', content: <p>Concept options</p> },
      { id: 'materials', label: 'Materials', content: <p>Material schedule</p> },
      { id: 'documentation', label: 'Documentation', content: <p>Drawings and schedules</p>, disabled: true },
    ];
    await render(<Tabs items={stages} label="Project stages" />);
    await expectSelected('Concept');
    await tab('Concept').click();

    await userEvent.keyboard('{End}');
    await expect.element(tab('Materials')).toHaveFocus();
    await expectSelected('Materials');

    await userEvent.keyboard('{Home}');
    await expect.element(tab('Concept')).toHaveFocus();
    await expectSelected('Concept');
  });

  it('follows the value from a controlling parent', async () => {
    const onChange = vi.fn();
    const { rerender } = await render(<Tabs items={roomTabs} label="Room details" value="materials" onChange={onChange} />);
    await expectSelected('Materials');

    await tab('Services').click();
    expect(onChange).toHaveBeenCalledExactlyOnceWith('services');
    // Nothing moves until the parent passes the new value.
    await expectSelected('Materials');

    await rerender(<Tabs items={roomTabs} label="Room details" value="services" onChange={onChange} />);
    await expectSelected('Services');
    await expect.element(hiddenPanel('Materials')).not.toBeVisible();
  });
});
