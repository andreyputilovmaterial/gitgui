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
      updateHistory: vi.fn(async () => {}),
      logError: vi.fn(),
    };
    const repoStatus = {};

    const wrapper = mount(View, {
      props: { hash: 'aaa', repoStatus, repoActions },
      global: {
        stubs: {
          'component-format-hash': true,
          'component-format-datetime': true,
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

  it('shows author, date/time and commit message for the revision', async () => {
    const executeGitCommand = vi.fn(async () => ({
      exit_code: 0,
      stderr: '',
      stdout: 'docs/project-context.md\n',
    }));
    const updateHistory = vi.fn(async () => {});
    const repoActions = { executeGitCommand, updateHistory, logError: vi.fn() };
    const repoStatus = {
      historyData: {
        history: [
          {
            hash: 'aaa',
            author: 'Jane Doe',
            message: 'Add project context',
            timestamp: new Date('2026-11-10T09:24:52Z'),
          },
        ],
      },
    };

    const wrapper = mount(View, {
      props: { hash: 'aaa', repoStatus, repoActions },
      global: {
        stubs: {
          'component-format-hash': true,
          'component-format-datetime': true,
          'files-records': true,
        },
      },
    });
    await flushPromises();

    expect(updateHistory).toHaveBeenCalledTimes(1);

    const text = wrapper.text();
    expect(text).toContain('Date/time:');
    expect(text).toContain('Author:');
    expect(text).toContain('Commit message:');
    expect(text).toContain('Jane Doe');
    expect(text).toContain('Add project context');
  });
});
