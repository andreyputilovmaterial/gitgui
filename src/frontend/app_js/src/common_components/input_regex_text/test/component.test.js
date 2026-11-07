
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Component from '../index.js';

describe('input_regex_text component', () => {
  it('renders a text input and the .* toggle', () => {
    const wrapper = mount(Component);
    expect(wrapper.find('input').exists()).toBe(true);
    expect(wrapper.find('.mdm-ui-regex-input-toggle').text()).toBe('.*');
  });

  it('emits { text, regex:false } on input', async () => {
    const wrapper = mount(Component);
    await wrapper.find('input').setValue('foo');
    const emitted = wrapper.emitted('input');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].target.value).toEqual({ text: 'foo', regex: false });
  });

  it('toggles regex mode, highlights the toggle, and emits the new value', async () => {
    const wrapper = mount(Component);
    const toggle = wrapper.find('.mdm-ui-regex-input-toggle');

    await toggle.trigger('click');
    expect(toggle.classes()).toContain('mdm-ui-regex-input-toggle-active');
    expect(wrapper.emitted('input')[0][0].target.value).toEqual({ text: '', regex: true });

    await toggle.trigger('click');
    expect(toggle.classes()).not.toContain('mdm-ui-regex-input-toggle-active');
    expect(wrapper.emitted('input')[1][0].target.value).toEqual({ text: '', regex: false });
  });

  it('starts with regex on when regexDefault is true', async () => {
    const wrapper = mount(Component, { props: { regexDefault: true } });
    const toggle = wrapper.find('.mdm-ui-regex-input-toggle');

    expect(toggle.classes()).toContain('mdm-ui-regex-input-toggle-active');

    await wrapper.find('input').setValue('file.*');
    expect(wrapper.emitted('input')[0][0].target.value).toEqual({ text: 'file.*', regex: true });
  });
});
