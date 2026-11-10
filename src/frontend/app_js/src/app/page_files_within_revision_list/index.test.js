import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

import View from './index.js';

describe('page_files_within_revision_list', () => {
  it('refetches the file list when the hash changes', async () => {
    const executeGitCommand = vi.fn(async () => ({
      exit_code: 0,
      stderr: '',
      stdout: 'docs/project-context.md\nsrc/main.py\n',
    }));
    const repoActions = {
      executeGitCommand,
      logError: vi.fn(),
    };
    const repoStatus = {};

    const wrapper = mount(View, {
      props: { hash: 'aaa', repoStatus, repoActions },
      global: {
        stubs: {
          'component-format-hash': true,
          'files-records': true,
        },
      },
    });
    await flushPromises();

    expect(executeGitCommand).toHaveBeenCalledTimes(1);
    const firstArgs = executeGitCommand.mock.calls[0][0];
    expect(firstArgs[firstArgs.length - 1]).toBe('aaa');

    await wrapper.setProps({ hash: 'bbb' });
    await flushPromises();

    expect(executeGitCommand).toHaveBeenCalledTimes(2);
    const secondArgs = executeGitCommand.mock.calls[1][0];
    expect(secondArgs[secondArgs.length - 1]).toBe('bbb');
  });
});
