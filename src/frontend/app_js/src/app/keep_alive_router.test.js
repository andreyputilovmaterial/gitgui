import { describe, it, expect } from 'vitest';
import { ref, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';

// Regression test for the keep-alive + router-view pattern used by the tab
// layouts (layout_app_tabs.js and the per-tab apptab_* nested router-views).
// The naive `<keep-alive><router-view/></keep-alive>` form caches the RouterView
// itself, not the matched page, so page-local state is lost on navigation. The
// correct form is the `v-slot` + `<component :is="Component">` form below.
describe('keep-alive + router-view v-slot', () => {
  it('preserves page-local state across navigation', async () => {
    const PageA = {
      template:
        '<div><button id="inc" @click="inc">+</button><span id="n">{{ n }}</span></div>',
      setup() {
        const n = ref(0);
        return { n, inc: () => n.value++ };
      },
    };
    const PageB = { template: '<div id="b">B</div>' };

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/a', component: PageA },
        { path: '/b', component: PageB },
      ],
    });

    const Root = {
      template:
        '<router-view v-slot="{ Component }"><keep-alive><component :is="Component" /></keep-alive></router-view>',
    };

    const wrapper = mount(Root, { global: { plugins: [router] } });
    await router.push('/a');
    await router.isReady();
    await flushPromises();

    const inc = () => wrapper.find('#inc');
    await inc().trigger('click');
    await inc().trigger('click');
    await nextTick();
    expect(wrapper.find('#n').text()).toBe('2');

    await router.push('/b');
    await flushPromises();
    expect(wrapper.find('#b').text()).toBe('B');
    expect(wrapper.find('#n').exists()).toBe(false);

    await router.push('/a');
    await flushPromises();
    // The key assertion: PageA's local counter survived the round-trip.
    expect(wrapper.find('#n').text()).toBe('2');
  });
});
