
import { ref, watch, computed } from 'vue';

import logErr from '../_log_error_proxy';

import './styles.css';

const Component = {

  inheritAttrs: false,

  props: {
    // Same basic API as a native text input, extended with a regex toggle.
    value: {
      type: [String, Number, Object],
      default: ''
    },

    // Vue 3 v-model API.
    modelValue: {
      type: [String, Number, Object],
      default: undefined
    },

    // When the current value doesn't carry an explicit `regex` flag yet (it is
    // empty or still a plain string), this decides whether regex mode starts on.
    regexDefault: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'input',
    'change',
    'update:modelValue',
    'focus',
    'blur',
  ],

  template: `
    <span class="mdmreport-control mdm-ui-regex-input" :class="attrs.class">
      <input
        v-bind="inputAttrs"

        type="text"
        :value="inputText"

        @input="onInput"
        @change="onChange"
        @focus="onFocus"
        @blur="onBlur"

        ref="inputEl"
      />
      <span
        class="mdm-ui-regex-input-toggle"
        :class="{ 'mdm-ui-regex-input-toggle-active': regexMode }"
        role="button"
        tabindex="0"
        title="Toggle regex mode"
        aria-label="Toggle regex mode"
        :aria-pressed="regexMode ? 'true' : 'false'"

        @click.stop="toggleRegex"
        @keydown.enter.prevent.stop="toggleRegex"
        @keydown.space.prevent.stop="toggleRegex"
      >.*</span>
    </span>
  `,

  setup(props, { emit, attrs }) {

    // The `.mdmreport-control` class must land on the wrapper (so it draws the
    // shared control border/padding), while native attributes like `placeholder`
    // belong on the inner input.
    const inputAttrs = computed(() => {
      const { class: _class, ...rest } = attrs;
      return rest;
    });

    const inputEl = ref(null);
    const inputText = ref('');
    const regexMode = ref(false);

    function parseExternalValue(value) {
      if (value != null && typeof value === 'object') {
        return {
          text: value.text == null ? '' : `${value.text}`,
          regex: value.regex != null ? !!value.regex : props.regexDefault,
        };
      }
      return {
        text: value == null ? '' : `${value}`,
        regex: props.regexDefault,
      };
    }

    function getExternalValue() {
      if (props.modelValue !== undefined) {
        return props.modelValue;
      }
      return props.value;
    }

    function syncFromExternal() {
      const parsed = parseExternalValue(getExternalValue());
      inputText.value = parsed.text;
      regexMode.value = parsed.regex;
    }

    syncFromExternal();

    watch(
      () => props.modelValue,
      (value) => {
        if (value !== undefined) {
          const parsed = parseExternalValue(value);
          inputText.value = parsed.text;
          regexMode.value = parsed.regex;
        }
      }
    );

    watch(
      () => props.value,
      (value) => {
        if (props.modelValue === undefined) {
          const parsed = parseExternalValue(value);
          inputText.value = parsed.text;
          regexMode.value = parsed.regex;
        }
      }
    );

    /*
     * Emit the same shape through both APIs (`@input` and `v-model`), so the
     * records-filter form can store `{ text, regex }` as the column value —
     * mirroring how the numeric/datetime inputs emit `{ from, to }`.
     */
    function makeEvent(payload) {
      return {
        target: {
          value: payload,
        },
      };
    }

    function emitValue() {
      const payload = {
        text: inputText.value,
        regex: regexMode.value,
      };
      emit('input', makeEvent(payload));
      emit('update:modelValue', payload);
    }

    function onInput(event) {
      try {
        inputText.value = event.target.value;
        emitValue();
      } catch (e) {
        logErr(e);
        logErr('input_regex_text component: failed when handling input');
        throw e;
      }
    }

    function onChange(event) {
      try {
        inputText.value = event.target.value;
        emit('change', makeEvent({ text: inputText.value, regex: regexMode.value }));
      } catch (e) {
        logErr(e);
        logErr('input_regex_text component: failed when handling change');
        throw e;
      }
    }

    function toggleRegex() {
      try {
        regexMode.value = !regexMode.value;
        emitValue();
      } catch (e) {
        logErr(e);
        logErr('input_regex_text component: failed when toggling regex mode');
        throw e;
      }
    }

    function onFocus(event) {
      emit('focus', event);
    }

    function onBlur(event) {
      emit('blur', event);
    }

    return {
      attrs,
      inputAttrs,
      inputEl,
      inputText,
      regexMode,
      onInput,
      onChange,
      onFocus,
      onBlur,
      toggleRegex,
    };
  },

};

export default Component;
