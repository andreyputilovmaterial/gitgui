import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';

import View from './index.js';

describe('page_revision_detail', () => {
  it('reloads history when the hash changes', async () => {
    const updateHistory = vi.fn(async () => {});
    const repoActions = { updateHistory, logError: vi.fn() };
    const repoStatus = { historyData: { history: [], head: null } };

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    });

    const wrapper = mount(View, {
      props: { hash: 'aaa', repoStatus, repoActions },
      global: {
        plugins: [router],
        stubs: {
          'component-format-hash': true,
          'component-format-datetime': true,
        },
      },
    });
    await flushPromises();

    expect(updateHistory).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ hash: 'bbb' });
    await flushPromises();

    expect(updateHistory).toHaveBeenCalledTimes(2);
  });
});
